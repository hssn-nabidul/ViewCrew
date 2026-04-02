export const EMOJI_REACTIONS = [
  { id: 'heart', emoji: '❤️' },
  { id: 'laugh', emoji: '😂' },
  { id: 'wow', emoji: '😮' },
  { id: 'cry', emoji: '😢' },
  { id: 'clap', emoji: '👏' },
  { id: 'fire', emoji: '🔥' },
  { id: 'love', emoji: '😍' },
  { id: 'skull', emoji: '💀' },
];

export class ReactionManager {
  constructor(containerId, onSendReaction) {
    this.containerId = containerId;
    this.onSendReaction = onSendReaction;
    this.picker = null;
    this.isVisible = false;
    this.reactionElements = new Map();
  }

  init() {
    this._createPicker();
    this._createListeners();
  }

  _createPicker() {
    if (this.picker) return;

    this.picker = document.createElement('div');
    this.picker.id = 'reaction-picker';
    this.picker.className = 'reaction-picker';
    this.picker.setAttribute('role', 'dialog');
    this.picker.setAttribute('aria-label', 'Emoji reactions');

    const grid = document.createElement('div');
    grid.className = 'reaction-grid';

    EMOJI_REACTIONS.forEach(({ id, emoji }) => {
      const btn = document.createElement('button');
      btn.className = 'reaction-btn';
      btn.setAttribute('data-emoji-id', id);
      btn.setAttribute('aria-label', `React with ${emoji}`);
      btn.textContent = emoji;
      grid.appendChild(btn);
    });

    this.picker.appendChild(grid);
  }

  show() {
    if (!this.picker) this.init();

    const container = document.getElementById(this.containerId);
    if (!container || !this.picker) return;

    if (this.picker.parentNode !== container) {
      container.appendChild(this.picker);
    }

    this.picker.classList.add('visible');
    this.isVisible = true;
  }

  hide() {
    if (this.picker) {
      this.picker.classList.remove('visible');
      this.isVisible = false;
    }
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  _createListeners() {
    this.picker.addEventListener('click', (e) => {
      const btn = e.target.closest('.reaction-btn');
      if (!btn) return;

      const emojiId = btn.getAttribute('data-emoji-id');
      const reaction = EMOJI_REACTIONS.find(r => r.id === emojiId);
      if (!reaction) return;

      this._animateReaction(reaction.emoji);
      this.onSendReaction?.(emojiId);
      this.hide();
    });

    document.addEventListener('click', (e) => {
      if (this.isVisible && !this.picker.contains(e.target) && !e.target.closest('[data-reaction-trigger]')) {
        this.hide();
      }
    });
  }

  _animateReaction(emoji) {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const el = document.createElement('div');
    el.className = 'emoji-reaction';
    el.textContent = emoji;

    const containerRect = container.getBoundingClientRect();
    const x = Math.random() * (containerRect.width - 60) + 30;
    const y = containerRect.height - 100;

    el.style.left = `${x}px`;
    el.style.bottom = `${containerRect.height - y}px`;

    container.appendChild(el);

    el.addEventListener('animationend', () => {
      el.remove();
    });

    setTimeout(() => {
      if (el.parentNode) el.remove();
    }, 2500);
  }

  handleRemoteReaction(data) {
    const { emojiId, displayName } = data;
    const reaction = EMOJI_REACTIONS.find(r => r.id === emojiId);
    if (!reaction) return;

    this._animateReaction(reaction.emoji);
  }

  destroy() {
    this.reactionElements.forEach(el => el.remove());
    this.reactionElements.clear();

    if (this.picker && this.picker.parentNode) {
      this.picker.parentNode.removeChild(this.picker);
      this.picker = null;
    }
  }
}
