export class LocalFileStream {
  constructor() {
    this.file = null;
    this.chunkSize = 16 * 1024; // 16KB
    this.totalChunks = 0;
    this.currentChunk = 0;
    this.isStreaming = false;
    this._reader = null;
    this._abortController = null;
    this.onProgress = null;
    this.onComplete = null;
    this.onError = null;
  }

  async start(file, sendChunk) {
    if (this.isStreaming) {
      this.stop();
    }

    this.file = file;
    this.totalChunks = Math.ceil(file.size / this.chunkSize);
    this.currentChunk = 0;
    this.isStreaming = true;
    this._abortController = new AbortController();

    const metadata = {
      type: 'file-meta',
      filename: file.name,
      size: file.size,
      mimeType: file.type || this._guessMimeType(file.name),
      totalChunks: this.totalChunks
    };

    sendChunk(metadata);

    await this._streamChunks(sendChunk);
  }

  _guessMimeType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const types = {
      mp4: 'video/mp4',
      webm: 'video/webm',
      mkv: 'video/x-matroska',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo'
    };
    return types[ext] || 'video/mp4';
  }

  async _streamChunks(sendChunk) {
    const file = this.file;
    let offset = 0;
    let index = 0;

    while (offset < file.size && this.isStreaming) {
      if (this._abortController.signal.aborted) {
        break;
      }

      const chunk = file.slice(offset, offset + this.chunkSize);
      const buffer = await chunk.arrayBuffer();

      sendChunk({
        type: 'file-chunk',
        index: index,
        data: buffer
      });

      offset += this.chunkSize;
      index++;
      this.currentChunk = index;

      if (this.onProgress) {
        this.onProgress(index / this.totalChunks);
      }

      // Small delay to prevent overwhelming the DataChannel
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    if (this.isStreaming && !this._abortController.signal.aborted) {
      sendChunk({ type: 'file-end' });
      this.isStreaming = false;
      if (this.onComplete) {
        this.onComplete();
      }
    }
  }

  stop() {
    this.isStreaming = false;
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }
    this.file = null;
    this.currentChunk = 0;
    this.totalChunks = 0;
  }
}
