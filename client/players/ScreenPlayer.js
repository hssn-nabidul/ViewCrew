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

      // --- MOBILE PLAYBACK FLAGS ---
      this.video.autoplay = true;
      this.video.muted = true;       // Always start muted for autoplay success
      this.video.controls = false;
      this.video.playsInline = true;
      this.video.setAttribute('playsinline', '');
      this.video.setAttribute('webkit-playsinline', '');
      
      // --- LAYOUT ---
      this.video.style.width = '100%';
      this.video.style.height = '100%';
      this.video.style.objectFit = 'contain';
      this.video.style.display = 'block';
      this.video.style.backgroundColor = '#000';

      // --- ANDROID RENDERING FIX ---
      this.video.style.transform = 'translateZ(0)';
      this.video.style.webkitTransform = 'translateZ(0)';
      this.video.style.willChange = 'transform';

      container.innerHTML = '';
      container.appendChild(this.video);

      this.video.onplay = () => this.onEvent('play', { time: this.video.currentTime });
      this.video.onpause = () => this.onEvent('pause', { time: this.video.currentTime });
    }

    if (stream && stream !== this._currentStream) {
      this._currentStream = stream;
      this._attachStreamListeners(stream);

      // FIX: Force reset srcObject to clear any stuck buffers in Android Chrome
      this.video.srcObject = null;
      this.video.srcObject = stream;

      // Try to play immediately
      this._tryPlay();

      // Backup trigger for mobile
      const onData = () => {
        this.video.removeEventListener('loadeddata', onData);
        if (this.video && this.video.paused) this._tryPlay();
      };
      this.video.addEventListener('loadeddata', onData);
    } else if (stream && stream === this._currentStream) {
      if (this.video.paused) this._tryPlay();
    }

    this.onEvent('ready', null);
  }

  _tryPlay(retries = 5) {
    if (!this.video) return;

    // Ensure we are muted for the autoplay attempt
    this.video.muted = true;

    this.video.play()
      .then(() => {
        console.log('[ScreenPlayer] Play successful (muted)');
        // FIX: Instead of a tiny button, show a large, easy-to-click overlay
        // if the video is still muted (which it will be).
        this._showEasyUnmuteOverlay();
        
        // ANDROID RENDERING KICK: Toggle a property to force GPU repaint
        // This often fixes the "black screen while playing" bug on Android Chrome
        setTimeout(() => {
          if (this.video) {
            this.video.style.opacity = '0.99';
            setTimeout(() => { if (this.video) this.video.style.opacity = '1'; }, 50);
          }
        }, 200);
      })
      .catch((err) => {
        console.warn(`[ScreenPlayer] Play failed (${retries} left):`, err);
        if (retries > 0) {
          setTimeout(() => this._tryPlay(retries - 1), 500);
        } else {
          this.showPlayOverlay();
        }
      });
  }

  _showEasyUnmuteOverlay() {
    if (!this.video || !this.video.muted) return;
    if (document.getElementById('unmute-overlay')) return;

    const container = document.getElementById(this.containerId);
    if (!container) return;

    const overlay = document.createElement('div');
    overlay.id = 'unmute-overlay';
    overlay.className = 'absolute inset-0 z-[70] flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] cursor-pointer transition-opacity duration-300';
    overlay.innerHTML = `
      <div class="flex flex-col items-center animate-bounce">
        <div class="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/40 mb-4">
          <span class="material-symbols-outlined text-white text-5xl">volume_off</span>
        </div>
        <span class="text-white font-bold tracking-widest uppercase text-sm drop-shadow-md">Tap Anywhere to Unmute</span>
      </div>
    `;

    overlay.onclick = (e) => {
      e.stopPropagation();
      if (this.video) {
        this.video.muted = false;
        // Re-play inside user gesture to ensure audio context unlocks
        this.video.play().catch(console.error);
      }
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 300);
    };

    container.appendChild(overlay);
  }

  _attachStreamListeners(stream) {
    stream.onaddtrack = () => {
      console.log('[ScreenPlayer] Track added, retrying play');
      setTimeout(() => this._tryPlay(), 200);
    };
    
    // Check for "live" status on tracks
    const videoTracks = stream.getVideoTracks();
    videoTracks.forEach(track => {
      track.onunmute = () => {
        console.log('[ScreenPlayer] Track unmuted (data flowing)');
        if (this.video && this.video.paused) this._tryPlay();
      };
    });
  }

  showPlayOverlay() {
    const container = document.getElementById(this.containerId);
    if (!container || document.getElementById('play-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'play-overlay';
    overlay.className = 'absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md cursor-pointer transition-opacity duration-300';
    overlay.innerHTML = `
      <div class="w-24 h-24 bg-primary rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(192,193,255,0.4)] mb-6">
        <span class="material-symbols-outlined text-6xl text-on-primary">play_arrow</span>
      </div>
      <span class="text-white font-black tracking-[0.2em] uppercase text-xl drop-shadow-lg text-center px-6">Tap to Start Watching</span>
    `;

    overlay.onclick = () => {
      if (this.video) {
        this.video.muted = false;
        this.video.play().catch(console.error);
      }
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 300);
    };

    container.appendChild(overlay);
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
    const unmute = document.getElementById('unmute-overlay');
    if (unmute) unmute.remove();
    this._currentStream = null;
  }
}
