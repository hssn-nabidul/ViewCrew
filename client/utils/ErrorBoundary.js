export class ErrorBoundary {
  constructor() {
    this.errorCount = 0;
    this.maxErrors = 5;
    this.windowMs = 30000;
    this.errorWindow = [];
    this._handleError = this.handleError.bind(this);
    this._handleRejection = this.handleRejection.bind(this);
  }

  init() {
    window.addEventListener('error', this._handleError);
    window.addEventListener('unhandledrejection', this._handleRejection);
  }

  handleError(event) {
    const { message, filename, lineno, colno, error } = event;

    this.trackError();

    console.error('[ErrorBoundary] Unhandled error:', {
      message,
      filename,
      line: lineno,
      col: colno,
      stack: error?.stack
    });

    if (this.isCriticalError()) {
      this.showFallbackUI();
    }

    event.preventDefault();
  }

  handleRejection(event) {
    this.trackError();

    console.error('[ErrorBoundary] Unhandled promise rejection:', event.reason);

    event.preventDefault();
  }

  trackError() {
    const now = Date.now();
    this.errorWindow.push(now);
    this.errorWindow = this.errorWindow.filter(t => now - t < this.windowMs);

    if (this.errorWindow.length > this.maxErrors) {
      this.errorCount = this.errorWindow.length;
    }
  }

  isCriticalError() {
    return this.errorWindow.length >= this.maxErrors;
  }

  showFallbackUI() {
    const existing = document.getElementById('error-fallback');
    if (existing) return;

    const overlay = document.createElement('div');
    overlay.id = 'error-fallback';
    overlay.className = 'fixed inset-0 z-[99999] bg-background flex flex-col items-center justify-center p-6';
    overlay.innerHTML = `
      <div class="text-center space-y-4 max-w-md">
        <div class="w-16 h-16 mx-auto rounded-full bg-surface-elevated flex items-center justify-center">
          <span class="material-symbols-outlined text-3xl text-error">error</span>
        </div>
        <h2 class="text-xl font-bold text-on-surface">Something went wrong</h2>
        <p class="text-sm text-on-surface-variant">
          We hit an unexpected error. You can try to reload the page.
        </p>
        <button 
          id="btn-error-reload" 
          class="btn-primary px-6 py-3 rounded-lg font-bold"
        >
          Reload Page
        </button>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.querySelector('#btn-error-reload')?.addEventListener('click', () => {
      window.location.reload();
    });
  }

  destroy() {
    window.removeEventListener('error', this._handleError);
    window.removeEventListener('unhandledrejection', this._handleRejection);
  }
}
