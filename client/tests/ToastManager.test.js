import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ToastManager } from '../utils/ToastManager';

describe('ToastManager', () => {
  let tm;
  let container;

  beforeEach(() => {
    // Clean up any existing container
    const existing = document.getElementById('toast-container');
    if (existing) existing.remove();

    tm = new ToastManager();
    container = null;
  });

  afterEach(() => {
    tm.destroy();
  });

  describe('init', () => {
    it('creates a container element', () => {
      tm.init();
      container = document.getElementById('toast-container');
      expect(container).not.toBeNull();
      expect(container.getAttribute('role')).toBe('status');
      expect(container.getAttribute('aria-live')).toBe('polite');
    });

    it('does not create duplicate containers', () => {
      tm.init();
      const first = tm.container;
      tm.init();
      expect(tm.container).toBe(first);
    });
  });

  describe('show', () => {
    it('shows a toast with default options', () => {
      tm.init();
      const id = tm.show('Hello world');
      expect(id).toBeDefined();
      expect(tm.toasts.length).toBe(1);
      expect(tm.toasts[0].message).toBe('Hello world');
      expect(tm.toasts[0].type).toBe('info');
    });

    it('shows a toast with custom type', () => {
      tm.init();
      tm.show('Success!', { type: 'success' });
      expect(tm.toasts[0].type).toBe('success');
    });

    it('shows a toast with custom icon', () => {
      tm.init();
      tm.show('Custom', { icon: 'star' });
      expect(tm.toasts[0].icon).toBe('star');
    });

    it('enforces max visible limit of 3', () => {
      tm.init();
      tm.show('Toast 1');
      tm.show('Toast 2');
      tm.show('Toast 3');
      tm.show('Toast 4');
      expect(tm.toasts.length).toBeLessThanOrEqual(3);
    });

    it('returns a unique toast ID', () => {
      tm.init();
      const id1 = tm.show('First');
      const id2 = tm.show('Second');
      expect(id1).not.toBe(id2);
    });
  });

  describe('dismiss', () => {
    it('removes a toast by ID', () => {
      tm.init();
      const id = tm.show('Dismiss me');
      expect(tm.toasts.length).toBe(1);
      tm.dismiss(id);
      expect(tm.toasts.length).toBe(0);
    });

    it('does nothing for non-existent ID', () => {
      tm.init();
      tm.show('Keep me');
      expect(tm.toasts.length).toBe(1);
      tm.dismiss('non-existent');
      expect(tm.toasts.length).toBe(1);
    });
  });

  describe('dismissAll', () => {
    it('removes all toasts', () => {
      tm.init();
      tm.show('First');
      tm.show('Second');
      tm.show('Third');
      expect(tm.toasts.length).toBe(3);
      tm.dismissAll();
      expect(tm.toasts.length).toBe(0);
    });
  });

  describe('destroy', () => {
    it('removes the container and clears toasts', () => {
      tm.init();
      tm.show('Toast');
      tm.destroy();
      expect(tm.container).toBeNull();
      expect(tm.toasts.length).toBe(0);
    });
  });
});
