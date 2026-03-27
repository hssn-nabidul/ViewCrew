import { PlayerInterface } from './PlayerInterface';

export class ScreenPlayer extends PlayerInterface {
  constructor(containerId, onEvent) {
    super(containerId, onEvent);
    this.video = null;
    this._currentStream = null; // Track current stream to detect replacements
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

      // --- ANDROID GPU RENDERING FIX ---
      // Android Chrome receives the WebRTC stream and plays it, but renders
      // pure black unless the element is promoted to its own GPU compositor layer.
      // translateZ(0) forces that promotion. Without this the video "plays" but
      // every frame is discarded before it reaches the screen.
      this.video.style.transform = 'translateZ(0)';
      this.video.style.webkitTransform = 'translateZ(0)';
      this.video.style.willChange = 'transform';

      // --- MOBILE PLAYBACK FLAGS ---
      this.video.autoplay = true;
      this.video.muted = true;       // Must be muted for Android autoplay policy
      this.video.controls = false;
      this.video.playsInline = true;
      this.video.setAttribute('playsinline', '');         // Belt
      this.video.setAttribute('webkit-playsinline', '');  // And suspenders

      container.innerHTML = '';
      container.appendChild(this.video);

      this.video.onplay = () => this.onEvent('play', { time: this.video.currentTime });
      this.video.onpause = () => this.onEvent('pause', { time: this.video.currentTime });
      this.video.onseeking = () => this.onEvent('seek', { time: this.video.currentTime });
    }

    if (stream && stream !== this._currentStream) {
      this._currentStream = stream;

      // FIX: Listen for stream tracks ending (host stopped sharing)
      this._attachStreamListeners(stream);

      // FIX: On Android Chrome, assigning srcObject alone doesn't trigger playback.
      // We must wait for the video element to actually receive media data before
      // calling play(). Using 'loadedmetadata' ensures at least one frame is
      // available, which is required by Android's autoplay policy.
      this.video.srcObject = stream;

      // Use a one-shot loadedmetadata listener that triggers play()
      const onMetadata = () => {
        this.video.removeEventListener('loadedmetadata', onMetadata);
        this._tryPlay();
      };
      this.video.addEventListener('loadedmetadata', onMetadata);

      // Fallback: if loadedmetadata doesn't fire within 2s (can happen if the
      // stream already has frames buffered), try play() anyway.
      setTimeout(() => {
        this.video.removeEventListener('loadedmetadata', onMetadata);
        if (this.video && this.video.paused) {
          this._tryPlay();
        }
      }, 2000);
    } else if (stream && stream === this._currentStream) {
      // Same stream re-attached — just ensure it's playing
      if (this.video.paused) {
        this._tryPlay();
      }
    }

    this.onEvent('ready', null);
  }

  _tryPlay(retries = 3) {
    if (!this.video) return;

    this.video.play()
      .then(() => {
        // FIX: Play succeeded, but the video is MUTED. We must give the user
        // a visible way to unmute it. The old code only showed the overlay when
        // play() FAILED. When muted autoplay SUCCEEDS, no overlay ever appeared,
        // so the viewer was permanently stuck with a silent video.
        // Show a non-blocking unmute button in the corner instead.
        this._showUnmuteButton();
      })
      .catch((err) => {
        console.warn(`[ScreenPlayer] Play attempt failed (${retries} retries left):`, err);
        if (retries > 0) {
          setTimeout(() => this._tryPlay(retries - 1), 500);
        } else {
          // All retries exhausted — show full blocking overlay
          this.showPlayOverlay();
        }
      });
  }

  _showUnmuteButton() {
    // Don't show if already unmuted or button already exists
    if (!this.video || !this.video.muted) return;
    if (document.getElementById('unmute-btn')) return;

    const container = document.getElementById(this.containerId);
    if (!container) return;

    const btn = document.createElement('button');
    btn.id = 'unmute-btn';
    // Inline styles so it works regardless of Tailwind purge
    btn.style.cssText = [
      'position:absolute',
      'bottom:72px',  // above controls bar
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

    btn.onclick = () => {
      if (this.video) {
        this.video.muted = false;
        // Call play() inside the user gesture so Android unlocks audio
        this.video.play().catch(e => console.warn('[ScreenPlayer] Unmute play failed:', e));
      }
      btn.remove();
    };

    container.appendChild(btn);
  }

  _attachStreamListeners(stream) {
    // Listen for all video tracks ending (host stopped sharing)
    const videoTracks = stream.getVideoTracks();
    videoTracks.forEach(track => {
      track.onended = () => {
        console.log('[ScreenPlayer] Remote video track ended');
        // Stream died — show black with a message or keep last frame
      };
    });

    // Listen for tracks being removed from the stream
    stream.onremovetrack = (event) => {
      console.log('[ScreenPlayer] Track removed from stream:', event.track.kind);
      if (stream.getVideoTracks().length === 0) {
        console.log('[ScreenPlayer] All video tracks removed from stream');
      }
    };

    // Listen for new tracks being added (reconnection scenario)
    stream.onaddtrack = (event) => {
      console.log('[ScreenPlayer] Track added to stream:', event.track.kind);
      if (event.track.kind === 'video' && this.video) {
        // New video track added — force a play
        this._tryPlay();
      }
    };
  }

  play() {
    if (this.video) {
      this._tryPlay();
    }
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
        this.video.muted = false; // Unmute on user gesture to unlock audio
        this.video.play().catch(e => console.warn('[ScreenPlayer] Play on tap failed:', e));
      }
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 300);
    };

    container.appendChild(overlay);
  }

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
  }
}
