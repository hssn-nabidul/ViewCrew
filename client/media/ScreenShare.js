export class ScreenShare {
  constructor() {
    this.stream = null;
    this.onStop = null;
  }

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always"
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      this.stream.getVideoTracks()[0].onended = () => {
        this.stop();
      };

      console.log('[ScreenShare] Capture started');
      return this.stream;
    } catch (err) {
      console.error('[ScreenShare] Error starting:', err);
      return null;
    }
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      if (this.onStop) this.onStop();
      console.log('[ScreenShare] Capture stopped');
    }
  }

  isActive() {
    return !!this.stream;
  }
}
