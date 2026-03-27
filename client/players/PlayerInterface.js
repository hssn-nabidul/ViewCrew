export class PlayerInterface {
  constructor(containerId, onEvent) {
    this.containerId = containerId;
    this.onEvent = onEvent; // (type, data)
  }

  // To be implemented by subclasses
  load(source) {}
  play() {}
  pause() {}
  seek(time) {}
  getCurrentTime() { return 0; }
  getDuration() { return 0; }
  isPaused() { return true; }
  setVolume(volume) {} // volume between 0.0 and 1.0
  destroy() {}
}
