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
    this.DRIFT_THRESHOLD = 3;
    this.SYNC_INTERVAL = 5000;
    this.onSourceLoaded = null;
    this._pendingStream = null;
    this._pendingSource = null;
    this._isLoadingScreen = false;
    this._sourceLoadedTimeout = null;
    this._isLoadingSource = false;

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
  }

  loadSource(source, value) {
    // Prevent re-entrant calls
    if (this._isLoadingSource) {
      console.log('[SyncEngine] Already loading source, skipping');
      return;
    }
    
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
      this.player = new HTMLVideoPlayer(this.containerId, onEvent);
      this.player.load(value);
      onReady();
    } else if (source === 'screen') {
      this.player = new ScreenPlayer(this.containerId, onEvent);
      if (this._pendingStream) {
        console.log('[SyncEngine] Applying buffered pending stream to new ScreenPlayer');
        this.player.load(this._pendingStream);
        this._pendingStream = null;
      }
      onReady();
      // Reset loading flag after stream is attached
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
    console.log('[SyncEngine] Attaching screen stream');

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
    
    // If source is not 'screen' yet, load the source first and buffer the stream
    if (this.currentSource !== 'screen') {
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
      this.player.load(stream);

      if (!this.isHost) {
        setTimeout(() => {
          if (this.player) this.player.play();
        }, 300);
      }
    } else {
      console.warn('[SyncEngine] ScreenPlayer not ready, buffering stream');
      this._pendingStream = stream;
    }
  }

  tryApplyPendingSource() {
    if (!this._pendingSource) return;
    
    // Reset loading flags - we'll create a new player
    this._isLoadingSource = false;
    this._isLoadingScreen = false;
    
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.log('[SyncEngine] Container still not ready for pending source');
      return;
    }

    console.log('[SyncEngine] Applying pending source:', this._pendingSource);
    const { source, value } = this._pendingSource;
    this._pendingSource = null;
    
    console.log('[SyncEngine] Container found, creating player for:', source);
    
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
    
    this.currentSource = source;
    this.currentSourceValue = value;
    
    const onEvent = (type, data) => this.onPlayerEvent(type, data);
    const onReady = () => {
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
      this.player = new HTMLVideoPlayer(this.containerId, onEvent);
      this.player.load(value);
      onReady();
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
    
    console.log('[SyncEngine] Cleanup complete');
  }
};
