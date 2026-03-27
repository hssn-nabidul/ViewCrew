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
    console.log('[SyncEngine] Loading source:', source, value ? '(value provided)' : '(no value)');

    if (this.currentSource === source) {
      if (source === 'screen') {
        this.currentSourceValue = value;
        if (this.player && this.player.video) {
          const container = document.getElementById(this.containerId);
          if (container && !container.contains(this.player.video)) {
            container.innerHTML = '';
            container.appendChild(this.player.video);
            
            // FIX: Re-assign srcObject after re-attaching to DOM to force browser
            // to reconnect the video pipeline, avoiding potential black screen.
            const stream = this.player.video.srcObject;
            if (stream) {
              this.player.video.srcObject = null;
              this.player.video.srcObject = stream;
            }
            this.player.play();
          }
        }
        return;
      } else if (this.currentSourceValue === value) {
        if (this.player && this.player.video) {
          const container = document.getElementById(this.containerId);
          if (container && !container.contains(this.player.video)) {
            container.innerHTML = '';
            container.appendChild(this.player.video);
            
            const stream = this.player.video.srcObject;
            if (stream) {
              this.player.video.srcObject = null;
              this.player.video.srcObject = stream;
            }
            this.player.play();
          }
        } else if (source === 'youtube' && this.player) {
          const container = document.getElementById(this.containerId);
          if (container && !container.querySelector('iframe')) {
            this.player.destroy();
            const onEvent = (type, data) => this.onPlayerEvent(type, data);
            this.player = new YouTubePlayer(this.containerId, onEvent);
            this.player.load(value);
          }
        }
        return;
      }
    }

    if (this.player) {
      console.log('[SyncEngine] Destroying existing player');
      this.player.destroy();
    }
    this.currentSource = source;
    this.currentSourceValue = value;

    const onEvent = (type, data) => this.onPlayerEvent(type, data);

    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error('[SyncEngine] Container not found:', this.containerId);
      return;
    }

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
      this.player = new YouTubePlayer(this.containerId, onEvent);
      this.player.load(value);
    } else if (source === 'url' || source === 'local') {
      this.player = new HTMLVideoPlayer(this.containerId, onEvent);
      this.player.load(value);
    } else if (source === 'screen') {
      this.player = new ScreenPlayer(this.containerId, onEvent);
      if (this._pendingStream) {
        console.log('[SyncEngine] Applying buffered pending stream to new ScreenPlayer');
        this.player.load(this._pendingStream);
        this._pendingStream = null;
      }
    }

    if (this.onSourceLoaded) {
      console.log('[SyncEngine] Triggering onSourceLoaded');
      this.onSourceLoaded(source, value);
    }
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

    if (this.currentSource !== 'screen') {
      this._pendingStream = stream;
      this.loadSource('screen', null);
      return;
    }

    if (this.player && this.player.load) {
      this.player.load(stream);

      if (!this.isHost) {
        setTimeout(() => {
          if (this.player) this.player.play();
        }, 500);
      }
    } else {
      console.warn('[SyncEngine] ScreenPlayer not ready, buffering stream');
      this._pendingStream = stream;
    }
  }
}
