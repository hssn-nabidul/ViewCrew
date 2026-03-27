import { PlayerInterface } from './PlayerInterface';

export class YouTubePlayer extends PlayerInterface {
  constructor(containerId, onEvent) {
    super(containerId, onEvent);
    this.player = null;
    this.isReady = false;
    this.initAPI();
  }

  initAPI() {
    if (window.YT && window.YT.Player) {
      this.isReady = true;
      return;
    }

    if (!document.getElementById('yt-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'yt-api-script';
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    window.onYouTubeIframeAPIReady = () => {
      this.isReady = true;
    };
  }

  load(videoId) {
    if (!this.isReady) {
      setTimeout(() => this.load(videoId), 100);
      return;
    }

    if (this.player) {
      this.player.loadVideoById(videoId);
    } else {
      this.player = new window.YT.Player(this.containerId, {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          modestbranding: 1,
          rel: 0
        },
        events: {
          onReady: () => {
            this.onEvent('ready', null);
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
