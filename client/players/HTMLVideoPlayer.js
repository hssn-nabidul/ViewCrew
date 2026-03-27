import { PlayerInterface } from './PlayerInterface';

export class HTMLVideoPlayer extends PlayerInterface {
  constructor(containerId, onEvent) {
    super(containerId, onEvent);
    this.video = null;
  }

  load(url) {
    console.log('[HTMLVideoPlayer] Loading URL:', url ? 'URL provided' : 'No URL');
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error('[HTMLVideoPlayer] Container not found:', this.containerId);
      return;
    }

    if (!this.video) {
      console.log('[HTMLVideoPlayer] Creating video element');
      this.video = document.createElement('video');
      this.video.style.width = '100%';
      this.video.style.height = '100%';
      this.video.style.position = 'relative';
      this.video.style.zIndex = '10';
      this.video.controls = false;
      this.video.playsInline = true;
      this.video.muted = false; // Must be false so the host can hear the local video
      
      this.video.onplay = () => {
        console.log('[HTMLVideoPlayer] Video playing');
        this.onEvent('play', { time: this.video.currentTime });
      };
      this.video.onpause = () => {
        console.log('[HTMLVideoPlayer] Video paused');
        this.onEvent('pause', { time: this.video.currentTime });
      };
      this.video.onseeking = () => this.onEvent('seek', { time: this.video.currentTime });
      this.video.onloadeddata = () => {
        console.log('[HTMLVideoPlayer] Video loaded data');
        this.onEvent('ready', null);
        // Attempt autoplay. If unmuted autoplay is blocked (some desktop browsers
        // require a direct user gesture), mute and retry. This is critical because
        // captureStream() only fires after onplay — if play() never succeeds,
        // the viewer never receives the WebRTC stream and gets a black screen.
        const playPromise = this.video.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            console.warn('[HTMLVideoPlayer] Unmuted autoplay blocked, retrying muted');
            this.video.muted = true;
            this.video.play()
              .then(() => this.showPlayOverlay()) // show overlay so host can unmute
              .catch(err => {
                console.error('[HTMLVideoPlayer] Muted play also failed:', err);
                this.showPlayOverlay();
              });
          });
        }
      };
      this.video.onwaiting = () => console.log('[HTMLVideoPlayer] Video buffering');
      this.video.onerror = (e) => console.error('[HTMLVideoPlayer] Video error:', e);
    }

    // Always ensure video is in the current container (it might have been re-rendered)
    if (!container.contains(this.video)) {
      console.log('[HTMLVideoPlayer] Attaching video to container');
      container.innerHTML = '';
      container.appendChild(this.video);
    }

    if (url && this.video.src !== url) {
      this.video.src = url;
      this.video.load();
    }
  }

  play() { 
    console.log('[HTMLVideoPlayer] Play requested');
    if (this.video) {
      const playPromise = this.video.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn('[HTMLVideoPlayer] Play failed, showing overlay:', err);
          this.showPlayOverlay();
        });
      }
    } else {
      console.warn('[HTMLVideoPlayer] Play requested but no video element');
    }
  }

  showPlayOverlay() {
    const container = document.getElementById(this.containerId);
    if (!container || document.getElementById('play-overlay-local')) return;
    
    const overlay = document.createElement('div');
    overlay.id = 'play-overlay-local';
    overlay.className = 'absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md cursor-pointer transition-opacity duration-300';
    overlay.innerHTML = `
      <div class="w-24 h-24 bg-primary rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(192,193,255,0.4)] hover:scale-110 active:scale-95 transition-all mb-6">
        <span class="material-symbols-outlined text-6xl text-on-primary">play_arrow</span>
      </div>
      <span class="text-white font-black tracking-[0.2em] uppercase text-xl drop-shadow-lg">Tap to Play Local Video</span>
    `;
    
    overlay.onclick = () => {
      if (this.video) {
        this.video.play();
      }
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 300);
    };
    
    container.appendChild(overlay);
  }

  pause() { 
    console.log('[HTMLVideoPlayer] Pause requested');
    if (this.video) this.video.pause(); 
  }
  seek(time) { if (this.video) this.video.currentTime = time; }
  getCurrentTime() { return this.video ? this.video.currentTime : 0; }
  getDuration() { return this.video ? this.video.duration : 0; }
  isPaused() { return this.video ? this.video.paused : true; }
  setVolume(volume) { if (this.video) this.video.volume = volume; }
  destroy() { 
    if (this.video) {
      this.video.pause();
      this.video.removeAttribute('src');
      this.video.load();
      this.video.remove(); 
      this.video = null;
    }
  }
}
