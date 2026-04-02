export class ToastManager {
  constructor() {
    this.container = null;
    this.toasts = [];
    this.maxVisible = 3;
    this.defaultDuration = 3000;
  }

  init() {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.id = 'toast-container';
    this.container.setAttribute('role', 'status');
    this.container.setAttribute('aria-live', 'polite');
    document.body.appendChild(this.container);
  }

  show(message, options = {}) {
    this.init();

    const {
      type = 'info',
      duration = this.defaultDuration,
      icon = null,
    } = options;

    const toast = {
      id: Date.now() + Math.random(),
      message,
      type,
      icon,
      createdAt: Date.now(),
    };

    this.toasts.push(toast);

    // Enforce max visible limit
    if (this.toasts.length > this.maxVisible) {
      const removed = this.toasts.shift();
      this._removeElement(removed.id);
    }

    this._renderToast(toast);

    if (duration > 0) {
      setTimeout(() => this.dismiss(toast.id), duration);
    }

    return toast.id;
  }

  dismiss(id) {
    const index = this.toasts.findIndex(t => t.id === id);
    if (index === -1) return;

    this._removeElement(id);
    this.toasts.splice(index, 1);
  }

  dismissAll() {
    this.toasts.forEach(t => this._removeElement(t.id));
    this.toasts = [];
  }

  _renderToast(toast) {
    const el = document.createElement('div');
    el.id = `toast-${toast.id}`;
    el.className = `toast toast-${toast.type}`;
    el.setAttribute('role', 'alert');

    const iconMap = {
      info: 'info',
      success: 'check_circle',
      warning: 'warning',
      error: 'error',
      user: 'person',
      play: 'play_arrow',
      pause: 'pause',
      seek: 'fast_forward',
      screen: 'screen_share',
    };

    const icon = toast.icon || iconMap[toast.type] || 'info';

    el.innerHTML = `
      <span class="material-symbols-outlined toast-icon" aria-hidden="true">${icon}</span>
      <span class="toast-message">${toast.message}</span>
      <button class="toast-dismiss" aria-label="Dismiss notification">
        <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
      </button>
    `;

    el.querySelector('.toast-dismiss').onclick = () => this.dismiss(toast.id);

    this.container.appendChild(el);

    // Trigger enter animation
    requestAnimationFrame(() => {
      el.classList.add('toast-enter');
    });
  }

  _removeElement(id) {
    const el = document.getElementById(`toast-${id}`);
    if (!el) return;

    el.classList.remove('toast-enter');
    el.classList.add('toast-exit');

    el.addEventListener('animationend', () => {
      el.remove();
    });

    // Fallback if animation doesn't fire
    setTimeout(() => el.remove(), 300);
  }

  destroy() {
    this.dismissAll();
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
    }
  }
}
