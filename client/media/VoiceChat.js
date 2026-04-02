export class VoiceChat {
  constructor() {
    this.stream = null;
    this.isMuted = false;
    this.isReady = false;
    this.onSpeakingChange = null;
    this._vadInterval = null;
    this._audioContext = null;
    this._analyser = null;
    this._sourceNode = null;
  }

  async start() {
    if (this.isReady) return this.stream;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 2,
          sampleRate: 48000
        }
      });
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        throw new Error('MIC_PERMISSION_DENIED');
      }
      if (err.name === 'NotFoundError') {
        throw new Error('NO_MICROPHONE');
      }
      throw new Error(`MIC_ERROR: ${err.message}`);
    }

    this.isReady = true;
    this.isMuted = false;

    this._setupVAD();

    return this.stream;
  }

  _setupVAD() {
    if (!this.stream) return;

    this._audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this._analyser = this._audioContext.createAnalyser();
    this._analyser.fftSize = 512;
    this._analyser.smoothingTimeConstant = 0.3;

    this._sourceNode = this._audioContext.createMediaStreamSource(this.stream);
    this._sourceNode.connect(this._analyser);

    const dataArray = new Uint8Array(this._analyser.frequencyBinCount);
    const speakThreshold = 35;
    const silenceThreshold = 20;
    let isCurrentlySpeaking = false;

    this._vadInterval = setInterval(() => {
      if (!this.stream || this.isMuted) {
        if (isCurrentlySpeaking && this.onSpeakingChange) {
          isCurrentlySpeaking = false;
          this.onSpeakingChange(false);
        }
        return;
      }

      this._analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;

      if (!isCurrentlySpeaking && average > speakThreshold) {
        isCurrentlySpeaking = true;
        if (this.onSpeakingChange) this.onSpeakingChange(true);
      } else if (isCurrentlySpeaking && average < silenceThreshold) {
        isCurrentlySpeaking = false;
        if (this.onSpeakingChange) this.onSpeakingChange(false);
      }
    }, 100);
  }

  stop() {
    if (this._vadInterval) {
      clearInterval(this._vadInterval);
      this._vadInterval = null;
    }

    if (this._sourceNode) {
      this._sourceNode.disconnect();
      this._sourceNode = null;
    }

    if (this._analyser) {
      this._analyser.disconnect();
      this._analyser = null;
    }

    if (this._audioContext && this._audioContext.state !== 'closed') {
      this._audioContext.close();
      this._audioContext = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.isReady = false;
    this.isMuted = false;
  }

  toggleMute() {
    if (!this.stream) return;

    this.isMuted = !this.isMuted;
    this.stream.getAudioTracks().forEach(track => {
      track.enabled = !this.isMuted;
    });

    if (this.isMuted && this.onSpeakingChange) {
      this.onSpeakingChange(false);
    }
  }

  getStream() {
    return this.stream;
  }
}
