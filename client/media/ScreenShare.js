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
          autoGainControl: false,
          googEchoCancellation: false,
          googNoiseSuppression: false,
          googAutoGainControl: false
        }
      });

      const audioTrack = this.stream.getAudioTracks()[0];
      if (audioTrack) {
        const settings = audioTrack.getSettings();
        console.log('[ScreenShare] Audio track settings:', settings);
      }

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
      console.log('[ScreenShare] Stream marked as inactive (keeping tracks alive for late joiners)');
      this.stream = null;
      if (this.onStop) this.onStop();
    }
  }

  isActive() {
    return !!this.stream;
  }
}
