import { PlayerInterface } from './PlayerInterface';

export class ScreenPlayer extends PlayerInterface {
  constructor(containerId, onEvent) {
    super(containerId, onEvent);
    this.video = null;
    this._currentStream = null;
    this._watchdog = null;
  }

  load(stream) {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    if (!this.video) {
      this.video = document.createElement('video');

      // --- MOBILE PLAYBACK FLAGS ---
      this.video.autoplay = true;
      this.video.muted = false; // Don't mute by default - audio comes through
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

      // FIX: Force reset srcObject
      this.video.srcObject = null;
      this.video.srcObject = stream;

      this._tryPlay();
      this._startRenderingWatchdog();
    } else if (stream && stream === this._currentStream) {
      if (this.video.paused) this._tryPlay();
    }

    this.onEvent('ready', null);
  }

  _tryPlay(retries = 5) {
    if (!this.video) return;

    // Don't force mute - let audio play
    this.video.play()
      .then(() => {
        this._forceRenderingKick();
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

  // FIX: Specialized Android "Kick" to force the hardware decoder to render
  _forceRenderingKick() {
    if (!this.video) return;
    
    // Trick 1: Opacity toggle
    this.video.style.opacity = '0.99';
    
    // Trick 2: Dimension toggle (1px difference forces a full re-layout and repaint)
    const originalWidth = this.video.style.width;
    this.video.style.width = 'calc(100% - 1px)';
    
    setTimeout(() => {
      if (this.video) {
        this.video.style.opacity = '1';
        this.video.style.width = originalWidth;
      }
    }, 100);
  }

  // FIX: Watchdog to detect black screen (playing but no dimensions or events)
  _startRenderingWatchdog() {
    if (this._watchdog) clearInterval(this._watchdog);
    
    let checks = 0;
    this._watchdog = setInterval(() => {
      if (!this.video || !this._currentStream) {
        clearInterval(this._watchdog);
        return;
      }

      // If video is playing but dimensions are 0, it's likely a black screen
      if (!this.video.paused && this.video.videoWidth === 0) {
        console.warn('[ScreenPlayer] Watchdog detected black screen, kicking renderer...');
        this._forceRenderingKick();
        
        // After 10 failed checks, try re-assigning srcObject
        if (checks > 10) {
          console.error('[ScreenPlayer] Persistent black screen, re-assigning stream');
          const s = this.video.srcObject;
          this.video.srcObject = null;
          this.video.srcObject = s;
          this._tryPlay();
          checks = 0;
        }
      } else if (!this.video.paused && this.video.videoWidth > 0) {
        // Success! Stop watchdog
        console.log('[ScreenPlayer] Watchdog confirmed rendering!');
        clearInterval(this._watchdog);
      }
      
      checks++;
      if (checks > 30) clearInterval(this._watchdog); // Stop after 30s
    }, 1000);
  }

  _showEasyUnmuteOverlay() {
    if (!this.video || !this.video.muted) return;
    if (document.getElementById('unmute-overlay')) return;

    const container = document.getElementById(this.containerId);
    if (!container) return;

    const overlay = document.createElement('div');
    overlay.id = 'unmute-overlay';
    // Use high z-index and fixed positioning to ensure it's clickable above all else
    overlay.style.cssText = `
      position: absolute;
      inset: 0;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.2);
      backdrop-filter: blur(1px);
      cursor: pointer;
    `;

    overlay.innerHTML = `
      <div style="background:rgba(0,0,0,0.6); padding: 20px; border-radius: 20px; text-align:center;">
        <span class="material-symbols-outlined" style="color:white; font-size: 64px; margin-bottom: 10px;">volume_off</span>
        <div style="color:white; font-weight: bold; letter-spacing: 2px; font-size: 14px;">TAP TO UNMUTE</div>
      </div>
    `;

    overlay.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.video) {
        this.video.muted = false;
        this.video.play().catch(console.error);
      }
      overlay.remove();
    };

    container.appendChild(overlay);
  }

  _attachStreamListeners(stream) {
    stream.onaddtrack = () => {
      console.log('[ScreenPlayer] Track added, retrying play');
      setTimeout(() => this._tryPlay(), 200);
    };
    
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

  play() { 
    if (this.video) {
      this._tryPlay(); 
    }
  }
  pause() { if (this.video) this.video.pause(); }
  seek(time) { 
    if (this.video && isFinite(time)) {
      this.video.currentTime = time; 
    }
  }
  getCurrentTime() { return this.video ? this.video.currentTime : 0; }
  getDuration() { return this.video ? this.video.duration : 0; }
  isPaused() { return this.video ? this.video.paused : true; }
  setVolume(volume) { if (this.video) this.video.volume = volume; }
  destroy() {
    if (this._watchdog) clearInterval(this._watchdog);
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
