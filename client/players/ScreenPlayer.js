import { PlayerInterface } from './PlayerInterface';

export class ScreenPlayer extends PlayerInterface {
  constructor(containerId, onEvent) {
    super(containerId, onEvent);
    this.video = null;
    this._currentStream = null;
  }

  load(stream) {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    if (!this.video) {
      this.video = document.createElement('video');

      // --- LAYOUT ---
      this.video.style.width = '100%';
      this.video.style.height = '100%';
      this.video.style.objectFit = 'contain';
      this.video.style.display = 'block';
      this.video.style.backgroundColor = '#000';

      // --- GPU RENDERING FIX ---
      // Force hardware acceleration and prevent frame discarding.
      this.video.style.transform = 'translateZ(0)';
      this.video.style.webkitTransform = 'translateZ(0)';
      this.video.style.willChange = 'transform';

      // --- PLAYBACK FLAGS ---
      this.video.autoplay = true;
      this.video.muted = true;
      this.video.controls = false;
      this.video.playsInline = true;
      this.video.setAttribute('playsinline', '');
      this.video.setAttribute('webkit-playsinline', '');

      container.innerHTML = '';
      container.appendChild(this.video);

      this.video.onplay = () => this.onEvent('play', { time: this.video.currentTime });
      this.video.onpause = () => this.onEvent('pause', { time: this.video.currentTime });
      this.video.onseeking = () => this.onEvent('seek', { time: this.video.currentTime });
    }

    if (stream && stream !== this._currentStream) {
      this._currentStream = stream;
      this._attachStreamListeners(stream);

      // FIX: Resetting srcObject can help browsers recover if the previous assignment
      // failed or got stuck in a black frame state.
      this.video.srcObject = null;
      this.video.srcObject = stream;

      const onMetadata = () => {
        this.video.removeEventListener('loadedmetadata', onMetadata);
        console.log('[ScreenPlayer] Metadata loaded, triggering play');
        this._tryPlay();
      };
      this.video.addEventListener('loadedmetadata', onMetadata);

      // Fallback for streams that are already "active" or have delayed tracks
      setTimeout(() => {
        this.video.removeEventListener('loadedmetadata', onMetadata);
        if (this.video && this.video.paused) {
          this._tryPlay();
        }
      }, 2000);
    } else if (stream && stream === this._currentStream) {
      if (this.video.paused) {
        this._tryPlay();
      }
    }

    this.onEvent('ready', null);
  }

  _tryPlay(retries = 3) {
    if (!this.video) return;

    // FIX: Ensure there's a video track before trying to play,
    // otherwise some browsers might fail the promise immediately.
    if (this.video.srcObject && this.video.srcObject.getVideoTracks().length === 0) {
      console.warn('[ScreenPlayer] No video tracks yet, waiting...');
      return;
    }

    this.video.play()
      .then(() => {
        this._showUnmuteButton();
      })
      .catch((err) => {
        console.warn(`[ScreenPlayer] Play attempt failed (${retries} retries left):`, err);
        if (retries > 0) {
          setTimeout(() => this._tryPlay(retries - 1), 500);
        } else {
          this.showPlayOverlay();
        }
      });
  }

  _showUnmuteButton() {
    if (!this.video || !this.video.muted) return;
    if (document.getElementById('unmute-btn')) return;

    const container = document.getElementById(this.containerId);
    if (!container) return;

    const btn = document.createElement('button');
    btn.id = 'unmute-btn';
    btn.style.cssText = [
      'position:absolute',
      'bottom:72px',
      'left:16px',
      'z-index:60',
      'display:flex',
      'align-items:center',
      'gap:6px',
      'background:rgba(0,0,0,0.75)',
      'color:#fff',
      'border:1px solid rgba(255,255,255,0.2)',
      'border-radius:999px',
      'padding:8px 14px',
      'font-size:13px',
      'font-weight:600',
      'cursor:pointer',
      'backdrop-filter:blur(8px)',
      '-webkit-backdrop-filter:blur(8px)',
    ].join(';');

    btn.innerHTML = `
      <span class="material-symbols-outlined" style="font-size:16px;line-height:1">volume_off</span>
      Tap to unmute
    `;

    btn.onclick = (e) => {
      e.stopPropagation();
      if (this.video) {
        this.video.muted = false;
        this.video.play().catch(() => {});
      }
      btn.remove();
    };

    container.appendChild(btn);
  }

  _attachStreamListeners(stream) {
    stream.onremovetrack = (event) => {
      console.log('[ScreenPlayer] Track removed:', event.track.kind);
    };

    stream.onaddtrack = (event) => {
      console.log('[ScreenPlayer] Track added:', event.track.kind);
      if (event.track.kind === 'video') {
        // If a video track arrived late, we must trigger play()
        setTimeout(() => this._tryPlay(), 200);
      }
    };
  }

  play() { if (this.video) this._tryPlay(); }
  pause() { if (this.video) this.video.pause(); }
  seek(time) { if (this.video) this.video.currentTime = time; }
  getCurrentTime() { return this.video ? this.video.currentTime : 0; }
  getDuration() { return this.video ? this.video.duration : 0; }
  isPaused() { return this.video ? this.video.paused : true; }
  setVolume(volume) { if (this.video) this.video.volume = volume; }
  
  destroy() {
    if (this.video) {
      this.video.pause();
      this.video.srcObject = null;
      this.video.remove();
      this.video = null;
    }
    this._currentStream = null;
    const btn = document.getElementById('unmute-btn');
    if (btn) btn.remove();
  }

  showPlayOverlay() {
    const container = document.getElementById(this.containerId);
    if (!container || document.getElementById('play-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'play-overlay';
    overlay.className = 'absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md cursor-pointer transition-opacity duration-300';
    overlay.innerHTML = `
      <div class="w-24 h-24 bg-primary rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(192,193,255,0.4)] hover:scale-110 active:scale-95 transition-all mb-6">
        <span class="material-symbols-outlined text-6xl text-on-primary">play_arrow</span>
      </div>
      <span class="text-white font-black tracking-[0.2em] uppercase text-xl drop-shadow-lg">Tap to Tune In</span>
      <span class="text-white/60 text-sm mt-2 font-medium">Browser requires interaction for audio</span>
    `;

    overlay.onclick = () => {
      if (this.video) {
        this.video.muted = false;
        this.video.play().catch(() => {});
      }
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 300);
    };

    container.appendChild(overlay);
  }
}
