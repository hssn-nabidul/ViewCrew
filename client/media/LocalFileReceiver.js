export class LocalFileReceiver {
  constructor() {
    this.mediaSource = null;
    this.sourceBuffer = null;
    this.video = null;
    this.fileInfo = null;
    this.chunks = new Map();
    this.nextAppendIndex = 0;
    this.isReceiving = false;
    this.isReady = false;
    this._pendingAppends = [];
    this.onProgress = null;
    this.onReady = null;
    this.onComplete = null;
    this.onError = null;
  }

  async init(mimeType) {
    if (!MediaSource.isTypeSupported(mimeType)) {
      const fallback = this._getFallbackMimeType(mimeType);
      if (!fallback) {
        throw new Error(`Unsupported MIME type: ${mimeType}`);
      }
      mimeType = fallback;
    }

    this.mediaSource = new MediaSource();
    this.video = document.createElement('video');
    this.video.autoplay = true;
    this.video.controls = false;
    this.video.style.width = '100%';
    this.video.style.height = '100%';
    this.video.style.objectFit = 'contain';

    return new Promise((resolve) => {
      this.mediaSource.addEventListener('sourceopen', () => {
        try {
          this.sourceBuffer = this.mediaSource.addSourceBuffer(mimeType);
          this.sourceBuffer.mode = 'sequence';
          this.sourceBuffer.addEventListener('updateend', () => {
            this._processPendingAppends();
          });
          this.video.src = URL.createObjectURL(this.mediaSource);
          resolve(this.video);
        } catch (err) {
          if (this.onError) this.onError(err);
          resolve(null);
        }
      });
    });
  }

  _getFallbackMimeType(originalType) {
    if (originalType === 'video/x-matroska') {
      return MediaSource.isTypeSupported('video/webm') ? 'video/webm' : null;
    }
    if (originalType === 'video/quicktime' || originalType === 'video/x-msvideo') {
      return MediaSource.isTypeSupported('video/mp4') ? 'video/mp4' : null;
    }
    return null;
  }

  receiveChunk(message) {
    if (message.type === 'file-meta') {
      this.fileInfo = message;
      this.isReceiving = true;
      this.nextAppendIndex = 0;
      this.chunks.clear();
      return;
    }

    if (message.type === 'file-chunk') {
      this.chunks.set(message.index, message.data);

      if (this.onProgress && this.fileInfo) {
        this.onProgress((this.chunks.size) / this.fileInfo.totalChunks);
      }

      this._processPendingAppends();

      if (this.chunks.size === this.fileInfo?.totalChunks && !this.isReady) {
        this._finalize();
      }
      return;
    }

    if (message.type === 'file-end') {
      this._finalize();
    }
  }

  _processPendingAppends() {
    if (!this.sourceBuffer || this.sourceBuffer.updating) return;

    while (this.chunks.has(this.nextAppendIndex)) {
      const data = this.chunks.get(this.nextAppendIndex);
      try {
        this.sourceBuffer.appendBuffer(data);
        this.chunks.delete(this.nextAppendIndex);
        this.nextAppendIndex++;

        if (this.nextAppendIndex >= 3 && !this.isReady) {
          this.isReady = true;
          if (this.onReady) this.onReady(this.video);
        }
      } catch (err) {
        if (err.name === 'QuotaExceededError') {
          break;
        }
        if (this.onError) this.onError(err);
        return;
      }
    }
  }

  _finalize() {
    this.isReceiving = false;

    this._processPendingAppends();

    if (this.mediaSource.readyState === 'open') {
      try {
        this.mediaSource.endOfStream();
      } catch {
        // Already ended
      }
    }

    if (this.onComplete) {
      this.onComplete();
    }
  }

  cleanup() {
    this.isReceiving = false;
    this.isReady = false;

    if (this.video) {
      this.video.pause();
      this.video.src = '';
      this.video.remove();
      this.video = null;
    }

    if (this.mediaSource && this.mediaSource.readyState === 'open') {
      try {
        this.mediaSource.endOfStream();
      } catch {
        // Already ended
      }
    }

    this.sourceBuffer = null;
    this.mediaSource = null;
    this.chunks.clear();
    this.fileInfo = null;
    this.nextAppendIndex = 0;
  }
}
