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

      // Disable any audio processing on the screen share stream
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
    // Don't stop tracks - keep stream cached for late joiners to receive
    if (this.stream) {
      console.log('[ScreenShare] Stream marked as inactive (keeping tracks alive for late joiners)');
      this.stream = null;
      if (this.onStop) this.onStop();
    }
  }
}
  }

  getStream() {
    return this.stream;
  }

  cloneStream() {
    if (!this.stream) return null;
    
    const videoTrack = this.stream.getVideoTracks()[0];
    const audioTrack = this.stream.getAudioTracks()[0];
    
    if (!videoTrack) return null;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Create a video element to capture frames
    const video = document.createElement('video');
    video.srcObject = this.stream;
    video.play();
    
    const captureStream = canvas.captureStream(30);
    const capturedVideoTrack = captureStream.getVideoTracks()[0];
    
    // Copy the current frame to canvas
    const drawFrame = () => {
      if (video.readyState >= 2) {
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        ctx.drawImage(video, 0, 0);
      }
      if (this.stream) {
        requestAnimationFrame(drawFrame);
      }
    };
    drawFrame();
    
    return captureStream;
  }

  isActive() {
    return !!this.stream;
  }
}
