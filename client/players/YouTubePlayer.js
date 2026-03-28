import { PlayerInterface } from './PlayerInterface';

export class YouTubePlayer extends PlayerInterface {
  constructor(containerId, onEvent, onReady) {
    super(containerId, onEvent);
    this.player = null;
    this.isReady = false;
    this.onReady = onReady;
    this._loadAttempts = 0;
    this._maxAttempts = 50;
    this.initAPI();
  }

  initAPI() {
    if (window.YT && window.YT.Player) {
      console.log('[YouTubePlayer] API already loaded');
      this.isReady = true;
      return;
    }

    if (!document.getElementById('yt-api-script')) {
      console.log('[YouTubePlayer] Loading YouTube IFrame API...');
      const tag = document.createElement('script');
      tag.id = 'yt-api-script';
      tag.src = "https://www.youtube.com/iframe_api";
      tag.onerror = (e) => console.error('[YouTubePlayer] Failed to load YouTube API:', e);
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    window.onYouTubeIframeAPIReady = () => {
      console.log('[YouTubePlayer] YouTube API ready');
      this.isReady = true;
    };
  }

  load(videoId) {
    console.log('[YouTubePlayer] Load called, videoId:', videoId, 'isReady:', this.isReady);
    
    if (!this.isReady) {
      this._loadAttempts++;
      if (this._loadAttempts > this._maxAttempts) {
        console.error('[YouTubePlayer] Max load attempts reached, YouTube API not ready');
        return;
      }
      console.log('[YouTubePlayer] Waiting for API... attempt', this._loadAttempts);
      setTimeout(() => this.load(videoId), 200);
      return;
    }

    if (this.player) {
      console.log('[YouTubePlayer] Using existing player, loading video:', videoId);
      this.player.loadVideoById(videoId);
      if (this.onReady) this.onReady();
    } else {
      console.log('[YouTubePlayer] Creating new player for video:', videoId);
      const container = document.getElementById(this.containerId);
      if (!container) {
        console.error('[YouTubePlayer] Container not found:', this.containerId);
        return;
      }
      
      this.player = new window.YT.Player(this.containerId, {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1
        },
        events: {
          onReady: () => {
            console.log('[YouTubePlayer] Player ready');
            if (this.onReady) this.onReady();
            this.onEvent('ready', null);
          },
          onError: (event) => {
            console.error('[YouTubePlayer] YouTube player error:', event.data);
          },
          onStateChange: (event) => {
            let type;
            switch (event.data) {
              case window.YT.PlayerState.PLAYING: type = 'play'; break;
              case window.YT.PlayerState.PAUSED: type = 'pause'; break;
              case window.YT.PlayerState.BUFFERING: type = 'buffering'; break;
            }
            if (type) this.onEvent(type, { time: this.getCurrentTime() });
          }
        }
      });
    }
  }

  play() { 
    if (this.player && typeof this.player.playVideo === 'function') {
      this.player.playVideo(); 
    }
  }
  pause() { 
    if (this.player && typeof this.player.pauseVideo === 'function') {
      this.player.pauseVideo(); 
    }
  }
  seek(time) { 
    if (this.player && typeof this.player.seekTo === 'function') {
      this.player.seekTo(time, true); 
    }
  }
  getCurrentTime() { 
    return (this.player && typeof this.player.getCurrentTime === 'function') ? this.player.getCurrentTime() : 0; 
  }
  getDuration() { 
    return (this.player && typeof this.player.getDuration === 'function') ? this.player.getDuration() : 0; 
  }
  isPaused() { 
    if (!this.player || typeof this.player.getPlayerState !== 'function') return true;
    const state = this.player.getPlayerState();
    return state === window.YT.PlayerState.PAUSED || state === window.YT.PlayerState.UNSTARTED || state === window.YT.PlayerState.ENDED;
  }
  setVolume(volume) { 
    if (this.player && typeof this.player.setVolume === 'function') {
      this.player.setVolume(volume * 100); 
    }
  }
  destroy() { 
    if (this.player && typeof this.player.destroy === 'function') {
      this.player.destroy(); 
    }
  }
}
