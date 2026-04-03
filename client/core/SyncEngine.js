import { YouTubePlayer } from '../players/YouTubePlayer';
import { HTMLVideoPlayer } from '../players/HTMLVideoPlayer';
import { ScreenPlayer } from '../players/ScreenPlayer';

export class SyncEngine {
  constructor(socket, containerId, isHost, roomId) {
    this.socket = socket;
    this.containerId = containerId;
    this.isHost = isHost;
    this.roomId = roomId;
    this.player = null;
    this.currentSource = null;
    this.currentSourceValue = null;
    this.onSourceLoaded = null;
    this.onSourceApplied = null;
    this.lastSource = null;
    this._pendingStream = null;
    this._pendingSource = null;
    this._isLoadingScreen = false;
    this._sourceLoadedTimeout = null;
    this._isLoadingSource = false;
    this._justAppliedPending = false;
    this._playerInitDone = false;
    this._pendingIsPlaying = false;
    this._driftInterval = null;
    this._lastHostTime = 0;
    this._lastHostSyncAt = 0;

    this.setupListeners();
  }

  setupListeners() {
    this.socket.on('sync-event', (data) => {
      if (this.isHost) return;
      this.handleSyncEvent(data);
    });
  }

  handleSyncEvent(data) {
    const { type, time, source, sourceValue } = data;
    console.log('[SyncEngine] Received sync event:', type, 'at', time);

    if (type === 'source-change') {
      console.log('[SyncEngine] Source change requested:', source, sourceValue);
      this.loadSource(source, sourceValue);
      return;
    }

    if (!this.player) {
      console.warn('[SyncEngine] Sync event received but no player active');
      return;
    }

    switch (type) {
      case 'play':
        this.player.play();
        if (time !== undefined) this.player.seek(time);
        break;
      case 'pause':
        this.player.pause();
        if (time !== undefined) this.player.seek(time);
        break;
      case 'seek':
        this.player.seek(time);
        break;
    }

    if (time !== undefined) {
      this._lastHostTime = time;
      this._lastHostSyncAt = Date.now();
    }
  }

  _startDriftCorrection() {
    this._stopDriftCorrection();
    this._driftInterval = setInterval(() => {
      if (this.isHost || !this.player || !this._lastHostSyncAt) return;

      const elapsed = (Date.now() - this._lastHostSyncAt) / 1000;
      const expectedTime = this._lastHostTime + elapsed;
      const actualTime = this.player.getCurrentTime();
      const drift = Math.abs(actualTime - expectedTime);

      if (drift > 3) {
        console.log(`[SyncEngine] Drift correction: ${drift.toFixed(1)}s, seeking to ${expectedTime.toFixed(1)}`);
        this.player.seek(expectedTime);
      }
    }, 5000);
  }

  _stopDriftCorrection() {
    if (this._driftInterval) {
      clearInterval(this._driftInterval);
      this._driftInterval = null;
    }
  }

  loadSource(source, value, currentTime = 0, isPlaying = false) {
    // Prevent re-entrant calls
    if (this._isLoadingSource) {
      console.log('[SyncEngine] Already loading source, skipping');
      return;
    }
    
    // Store the currentTime and playback state for later use when player is ready
    this._pendingCurrentTime = currentTime;
    this._pendingIsPlaying = isPlaying;
    
    console.log('[SyncEngine] loadSource called:', { source, value, currentTime, isPlaying, isHost: this.isHost });
    
    // Skip if we just applied pending source (player already created)
    if (this._justAppliedPending) {
      console.log('[SyncEngine] Skipping loadSource - pending source was just applied, waiting for player init');
      return;
    }
    
    // If same source and player already exists, skip (player is already created)
    if (this.currentSource === source && this.currentSourceValue === value && this.player) {
      console.log('[SyncEngine] Player already exists for this source, skipping');
      console.log('[SyncEngine]   currentSource:', this.currentSource, 'source:', source);
      console.log('[SyncEngine]   currentSourceValue:', this.currentSourceValue, 'value:', value);
      console.log('[SyncEngine]   player exists:', !!this.player);
      this._isLoadingSource = false;
      return;
    }
    
    console.log('[SyncEngine] loadSource check failed:', {
      sameSource: this.currentSource === source,
      playerExists: !!this.player,
      sameValue: this.currentSourceValue === value,
      currentSource: this.currentSource,
      source: source,
      currentValue: this.currentSourceValue,
      value: value
    });
    
    console.log('[SyncEngine] Loading source:', source, value ? '(value provided)' : '(no value)');
    this._isLoadingSource = true;

    const container = document.getElementById(this.containerId);

    // If same source and player exists, just re-attach if needed
    if (this.currentSource === source && this.player) {
      if (source === 'screen') {
        this.currentSourceValue = value;
        if (this.player.video && container && !container.contains(this.player.video)) {
          container.innerHTML = '';
          container.appendChild(this.player.video);
          this.player.play();
        }
        this._isLoadingSource = false;
        return;
      } else if (this.currentSourceValue === value) {
        if (this.player.video && container && !container.contains(this.player.video)) {
          container.innerHTML = '';
          container.appendChild(this.player.video);
          this.player.play();
        }
        this._isLoadingSource = false;
        return;
      }
    }

    // Destroy existing player
    if (this.player) {
      console.log('[SyncEngine] Destroying existing player');
      this.player.destroy();
      this.player = null;
    }
    
    // If container doesn't exist, buffer the source and reset loading flag
    if (!container) {
      console.warn('[SyncEngine] Container not found, buffering source:', source);
      this._pendingSource = { source, value };
      this._isLoadingSource = false;
      // Try to apply pending source immediately - container might exist now
      this.tryApplyPendingSource();
      return;
    }
    
    this.currentSource = source;
    this.currentSourceValue = value;

    const onEvent = (type, data) => this.onPlayerEvent(type, data);
    const onReady = () => {
      this._playerInitDone = true;
      
      // Seek to the current playback position for late joiners
      const pendingTime = this._pendingCurrentTime || 0;
      const shouldPlay = this._pendingIsPlaying;
      
      console.log('[SyncEngine] onReady - pendingTime:', pendingTime, 'shouldPlay:', shouldPlay);
      
      if (pendingTime > 0 && this.player) {
        console.log('[SyncEngine] Seeking to current playback position:', pendingTime);
        this.player.seek(pendingTime);
      }
      
      // Start playback if video was playing when late joiner joined
      if (shouldPlay && this.player) {
        console.log('[SyncEngine] Resuming playback for late joiner');
        setTimeout(() => {
          if (this.player) this.player.play();
        }, 200);
      }
      
      // Start drift correction for viewers
      if (!this.isHost) {
        this._startDriftCorrection();
      }
      
      this._pendingCurrentTime = 0;
      this._pendingIsPlaying = false;
      
      console.log('[SyncEngine] Player ready, triggering onSourceLoaded');
      // Debounce onSourceLoaded to prevent rapid re-renders
      if (this._sourceLoadedTimeout) {
        clearTimeout(this._sourceLoadedTimeout);
      }
      this._sourceLoadedTimeout = setTimeout(() => {
        this._sourceLoadedTimeout = null;
        if (this.onSourceLoaded) {
          this.onSourceLoaded(source, value);
        }
      }, 100);
    };

    const existingBadge = document.querySelector('#live-badge');
    if (source === 'screen') {
      if (!existingBadge) {
        const badge = document.createElement('div');
        badge.id = 'live-badge';
        badge.className = 'absolute top-4 left-4 px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded uppercase tracking-wider animate-pulse z-10';
        badge.textContent = 'LIVE';
        container.appendChild(badge);
      }
    } else if (existingBadge) {
      existingBadge.remove();
    }

    if (source === 'youtube') {
      this.player = new YouTubePlayer(this.containerId, onEvent, onReady);
      this.player.load(value);
    } else if (source === 'url' || source === 'local') {
      this.player = new HTMLVideoPlayer(this.containerId, (type, data) => {
        onEvent(type, data);
        if (type === 'ready') {
          onReady();
        }
      });
      this.player.load(value);
    } else if (source === 'screen') {
      this.player = new ScreenPlayer(this.containerId, onEvent);
      if (this._pendingStream) {
        console.log('[SyncEngine] Applying buffered pending stream to new ScreenPlayer');
        this.player.load(this._pendingStream);
        this._pendingStream = null;
        onReady();
      } else {
        console.log('[SyncEngine] ScreenPlayer created, waiting for stream...');
        this._screenPlayerReady = onReady;
      }
      this._isLoadingScreen = false;
    }
    
    // Reset loading flag after player creation
    this._isLoadingSource = false;
  }

  onPlayerEvent(type, data) {
    if (!this.isHost) return;
    console.log('[SyncEngine] Host player event:', type, data);

    this.socket.emit('sync-event', {
      roomId: this.roomId,
      type,
      time: data ? data.time : (this.player ? this.player.getCurrentTime() : 0),
      source: this.currentSource,
      sourceValue: this.currentSourceValue
    });
  }

  changeSource(source, value, roomId) {
    if (!this.isHost) return;
    if (roomId) this.roomId = roomId;

    this.loadSource(source, value);

    if (source !== 'local') {
      this.socket.emit('sync-event', {
        roomId: this.roomId,
        type: 'source-change',
        source,
        sourceValue: value,
        time: 0
      });
    }
  }

  attachScreenStream(stream) {
    console.log('[SyncEngine] Attaching screen stream, currentSource:', this.currentSource, 'player:', !!this.player);

    if (!stream) {
      console.error('[SyncEngine] attachScreenStream called with null stream');
      return;
    }

    const videoTracks = stream.getVideoTracks();
    const audioTracks = stream.getAudioTracks();
    console.log(`[SyncEngine] Stream has ${videoTracks.length} video tracks, ${audioTracks.length} audio tracks`);

    if (videoTracks.length === 0) {
      console.error('[SyncEngine] Cannot attach screen stream — no video tracks');
      return;
    }

    const liveTracks = videoTracks.filter(t => t.readyState === 'live');
    console.log(`[SyncEngine] ${liveTracks.length} video tracks are live`);

    const container = document.getElementById(this.containerId);
    console.log('[SyncEngine] Container exists:', !!container);
    
    // If source is not 'screen' yet, load the source first and buffer the stream
    if (this.currentSource !== 'screen') {
      console.log('[SyncEngine] Source is not screen yet, buffering stream and loading screen');
      this._pendingStream = stream;
      // Only call loadSource if we haven't already started loading
      if (!this._isLoadingScreen) {
        this._isLoadingScreen = true;
        this.loadSource('screen', null);
      }
      return;
    }

    // Source is already 'screen', just attach the stream to the player
    if (!container) {
      console.warn('[SyncEngine] Container not ready, buffering stream');
      this._pendingStream = stream;
      return;
    }

    if (this.player && this.player.load) {
      console.log('[SyncEngine] Calling player.load with stream');
      this.player.load(stream);

      // Don't call play() on mobile — ScreenPlayer handles it via loadeddata
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (!this.isHost && !isMobile) {
        setTimeout(() => {
          console.log('[SyncEngine] Calling player.play after stream attach');
          if (this.player) this.player.play();
        }, 300);
      }
      
      if (this._screenPlayerReady) {
        console.log('[SyncEngine] Calling _screenPlayerReady after stream attach');
        this._screenPlayerReady();
        this._screenPlayerReady = null;
      }
    } else {
      console.warn('[SyncEngine] ScreenPlayer not ready, buffering stream');
      this._pendingStream = stream;
    }
  }

  tryApplyPendingSource() {
    if (!this._pendingSource) return;
    
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.log('[SyncEngine] Container still not ready for pending source');
      return;
    }

    console.log('[SyncEngine] Applying pending source:', this._pendingSource);
    const { source, value } = this._pendingSource;
    this._pendingSource = null;
    
    // Set currentSource immediately so subsequent render won't call loadSource again
    // (loadSource will see same source/value and return early)
    this.currentSource = source;
    this.currentSourceValue = value;
    this.lastSource = source;
    
    // Notify listeners that source was applied
    if (this.onSourceApplied) {
      this.onSourceApplied(source, value);
    }
    
    // Reset loading flags - we'll create a new player
    this._isLoadingSource = false;
    this._isLoadingScreen = false;
    this._justAppliedPending = true;
    
    // Emit source-change event to viewers if we're the host
    if (this.isHost && source !== 'local') {
      console.log('[SyncEngine] Emitting source-change event to viewers');
      this.socket.emit('sync-event', {
        roomId: this.roomId,
        type: 'source-change',
        source,
        sourceValue: value,
        time: 0
      });
    }
    
    console.log('[SyncEngine] Container found, creating player for:', source);
    
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
    
    // Don't set currentSource here - let onSourceLoaded set it after player is ready
    // This prevents an extra render from destroying the iframe before YouTube initializes
    
    const onEvent = (type, data) => this.onPlayerEvent(type, data);
    const onReady = () => {
      this._playerInitDone = true;
      
      // Don't trigger onSourceLoaded when we just applied pending source
      // The DOM is already correctly set up and re-rendering would destroy the iframe
      if (this._justAppliedPending) {
        console.log('[SyncEngine] Player ready, skipping onSourceLoaded (pending source was applied)');
        
        // Reset the flag since player is now ready
        this._justAppliedPending = false;
        
        // But still handle pending time and playback state
        const pendingTime = this._pendingCurrentTime || 0;
        const shouldPlay = this._pendingIsPlaying;
        
        if (pendingTime > 0 && this.player) {
          console.log('[SyncEngine] Seeking to pending playback position:', pendingTime);
          this.player.seek(pendingTime);
        }
        
        if (shouldPlay && this.player) {
          console.log('[SyncEngine] Resuming playback for late joiner');
          setTimeout(() => {
            if (this.player) this.player.play();
          }, 200);
        }
        
        if (!this.isHost) {
          this._startDriftCorrection();
        }
        
        this._pendingCurrentTime = 0;
        this._pendingIsPlaying = false;
        return;
      }
      
      // Debounce onSourceLoaded to prevent rapid re-renders
      if (this._sourceLoadedTimeout) {
        clearTimeout(this._sourceLoadedTimeout);
      }
      this._sourceLoadedTimeout = setTimeout(() => {
        this._sourceLoadedTimeout = null;
        if (this.onSourceLoaded) {
          this.onSourceLoaded(source, value);
        }
      }, 100);
    };

    const existingBadge = document.querySelector('#live-badge');
    if (source === 'screen') {
      if (!existingBadge) {
        const badge = document.createElement('div');
        badge.id = 'live-badge';
        badge.className = 'absolute top-4 left-4 px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded uppercase tracking-wider animate-pulse z-10';
        badge.textContent = 'LIVE';
        container.appendChild(badge);
      }
    } else if (existingBadge) {
      existingBadge.remove();
    }

    if (source === 'youtube') {
      this.player = new YouTubePlayer(this.containerId, onEvent, onReady);
      this.player.load(value);
    } else if (source === 'url' || source === 'local') {
      this.player = new HTMLVideoPlayer(this.containerId, (type, data) => {
        onEvent(type, data);
        if (type === 'ready') {
          onReady();
        }
      });
      this.player.load(value);
    } else if (source === 'screen') {
      this.player = new ScreenPlayer(this.containerId, onEvent);
      if (this._pendingStream) {
        console.log('[SyncEngine] Applying buffered stream to new ScreenPlayer');
        this.player.load(this._pendingStream);
        this._pendingStream = null;
      }
      onReady();
    }
    
    // Reset loading flags after player creation
    this._isLoadingSource = false;
    this._isLoadingScreen = false;
  }

  cleanup() {
    console.log('[SyncEngine] Cleaning up resources...');
    
    this._stopDriftCorrection();
    
    // Clear pending timeouts
    if (this._sourceLoadedTimeout) {
      clearTimeout(this._sourceLoadedTimeout);
      this._sourceLoadedTimeout = null;
    }
    
    // Remove socket listener
    if (this.socket) {
      this.socket.off('sync-event');
    }
    
    // Remove live badge
    const badge = document.getElementById('live-badge');
    if (badge) badge.remove();
    
    // Destroy player if exists
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
    
    // Reset state
    this.currentSource = null;
    this.currentSourceValue = null;
    this._pendingSource = null;
    this._pendingStream = null;
    this._isLoadingSource = false;
    this._isLoadingScreen = false;
    this._justAppliedPending = false;
    this._playerInitDone = false;
    this._pendingIsPlaying = false;
    
    console.log('[SyncEngine] Cleanup complete');
  }
};
