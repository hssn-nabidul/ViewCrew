export class VAD {
  constructor(stream, onSpeakingChange) {
    this.stream = stream;
    this.onSpeakingChange = onSpeakingChange;
    this.isSpeaking = false;
    this.audioContext = null;
    this.analyser = null;
    this.scriptProcessor = null;
    this.THRESHOLD = -50; // dB
    this.POLL_INTERVAL = 100; // ms
    this.stopMonitoring = false;
    
    if (stream) {
      this.init();
    }
  }

  init() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);
      
      this.monitor();
    } catch (err) {
      console.error('[VAD] Error initializing:', err);
    }
  }

  monitor() {
    if (this.stopMonitoring) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    this.analyser.getFloatTimeDomainData(dataArray);

    let sumSquares = 0.0;
    for (const amplitude of dataArray) {
      sumSquares += amplitude * amplitude;
    }
    const rms = Math.sqrt(sumSquares / dataArray.length);
    const db = 20 * Math.log10(rms);

    const isSpeaking = db > this.THRESHOLD;

    if (isSpeaking !== this.isSpeaking) {
      this.isSpeaking = isSpeaking;
      this.onSpeakingChange(this.isSpeaking);
    }

    setTimeout(() => this.monitor(), this.POLL_INTERVAL);
  }

  stop() {
    this.stopMonitoring = true;
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
