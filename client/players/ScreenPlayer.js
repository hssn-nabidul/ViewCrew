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
      // MOBILE FIX: Create video element with ALL attributes set BEFORE adding to DOM
      // iOS Safari is extremely picky about this order
      this.video = document.createElement('video');

      // --- MOBILE PLAYBACK FLAGS (MUST be set before adding to DOM) ---
      this.video.autoplay = true;
      this.video.muted = true;       // CRITICAL: Must be muted for mobile autoplay
      this.video.controls = false;
      this.video.playsInline = true;
      
      // iOS Safari specific attributes
      this.video.setAttribute('playsinline', '');
      this.video.setAttribute('webkit-playsinline', '');
      this.video.setAttribute('x5-playsinline', '');           // WeChat browser
      this.video.setAttribute('x5-video-player-type', 'h5');   // Disable X5 native player
      this.video.setAttribute('x5-video-player-fullscreen', 'false');
      
      // Prevent native controls from appearing
      this.video.setAttribute('disablePictureInPicture', '');
      this.video.setAttribute('disableRemotePlayback', '');

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
      
      // Additional mobile GPU fixes
      this.video.style.backfaceVisibility = 'hidden';
      this.video.style.webkitBackfaceVisibility = 'hidden';
      this.video.style.perspective = '1000';
      this.video.style.webkitPerspective = '1000';

      // MOBILE FIX: Add to DOM FIRST, then set srcObject
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

      // MOBILE FIX: Ensure video is in DOM and visible before setting srcObject
      // iOS Safari requires the element to be attached and have dimensions
      const container = document.getElementById(this.containerId);
      if (container && !container.contains(this.video)) {
        container.innerHTML = '';
        container.appendChild(this.video);
      }

      // CRITICAL FIX: For WebRTC streams, we need to play IMMEDIATELY.
      // The 'loadedmetadata' event often never fires for live MediaStreams.
      // We assign srcObject and call play() right away, then use the
      // 'loadeddata' event as a backup trigger.
      this.video.srcObject = stream;

      // MOBILE FIX: Force a reflow to ensure the video element has dimensions
      // This is critical for iOS Safari
      void this.video.offsetHeight;

      // Try to play immediately - this works for most browsers
      this._tryPlay();

      // Also listen for loadeddata as a backup (fires when first frame is ready)
      const onLoadedData = () => {
        this.video.removeEventListener('loadeddata', onLoadedData);
        console.log('[ScreenPlayer] loadeddata fired, ensuring playback');
        if (this.video.paused) {
          this._tryPlay();
        }
      };
      this.video.addEventListener('loadeddata', onLoadedData);

      // MOBILE FIX: Also listen for 'canplay' which fires on mobile when ready
      const onCanPlay = () => {
        this.video.removeEventListener('canplay', onCanPlay);
        console.log('[ScreenPlayer] canplay fired, ensuring playback');
        if (this.video.paused) {
          this._tryPlay();
        }
      };
      this.video.addEventListener('canplay', onCanPlay);

      // Fallback: if video is still paused after 1.5s, try again
      // This handles cases where the stream starts slightly delayed on mobile
      setTimeout(() => {
        this.video.removeEventListener('loadeddata', onLoadedData);
        this.video.removeEventListener('canplay', onCanPlay);
        if (this.video && this.video.paused) {
          console.log('[ScreenPlayer] Fallback play attempt after timeout');
          this._tryPlay();
        }
      }, 1500);
    } else if (stream && stream === this._currentStream) {
      // Same stream re-attached — just ensure it's playing
      if (this.video.paused) {
        this._tryPlay();
      }
    }

    this.onEvent('ready', null);
  }

  _tryPlay(retries = 8) {
    if (!this.video) return;

    // MOBILE FIX: Ensure video is visible and has dimensions
    // iOS Safari won't play if element has 0x0 dimensions
    const rect = this.video.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      console.warn('[ScreenPlayer] Video has zero dimensions, waiting for layout...');
      if (retries > 0) {
        setTimeout(() => this._tryPlay(retries - 1), 200);
        return;
      }
    }

    // CRITICAL FIX: Check if stream has active tracks before trying to play
    const stream = this.video.srcObject;
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      const hasActiveTrack = videoTracks.some(track => track.readyState === 'live');
      if (videoTracks.length > 0 && !hasActiveTrack) {
        console.warn('[ScreenPlayer] Stream has video tracks but none are live yet, waiting...');
        if (retries > 0) {
          setTimeout(() => this._tryPlay(retries - 1), 300);
          return;
        }
      }
    }

    // MOBILE FIX: On mobile, we need to ensure muted is true for autoplay
    // Store original muted state and force muted for the play attempt
    const wasMuted = this.video.muted;
    if (!wasMuted) {
      this.video.muted = true;
    }

    this.video.play()
      .then(() => {
        console.log('[ScreenPlayer] Play succeeded');
        // Restore original muted state if it was unmuted
        if (!wasMuted && this.video) {
          this.video.muted = false;
        }
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
          // MOBILE FIX: More aggressive retry on mobile with shorter delays
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          const delay = isMobile ? 150 : (100 * Math.pow(2, 8 - retries));
          setTimeout(() => this._tryPlay(retries - 1), delay);
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
      // CRITICAL FIX: Listen for track becoming live (unmute event)
      // This fires when the track starts producing data
      track.onunmute = () => {
        console.log('[ScreenPlayer] Video track unmuted (data flowing)');
        if (this.video && this.video.paused) {
          this._tryPlay();
        }
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
        // Set up unmute listener for the new track
        event.track.onunmute = () => {
          console.log('[ScreenPlayer] New video track unmuted (data flowing)');
          if (this.video.paused) {
            this._tryPlay();
          }
        };
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
