import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorBoundary } from '../utils/ErrorBoundary';

describe('ErrorBoundary', () => {
  let eb;

  beforeEach(() => {
    // Clean up any existing fallback
    const existing = document.getElementById('error-fallback');
    if (existing) existing.remove();

    eb = new ErrorBoundary();
  });

  afterEach(() => {
    eb.destroy();
    const existing = document.getElementById('error-fallback');
    if (existing) existing.remove();
  });

  describe('constructor', () => {
    it('initializes with correct defaults', () => {
      expect(eb.errorCount).toBe(0);
      expect(eb.maxErrors).toBe(5);
      expect(eb.windowMs).toBe(30000);
      expect(eb.errorWindow).toEqual([]);
    });
  });

  describe('trackError', () => {
    it('adds timestamp to error window', () => {
      eb.trackError();
      expect(eb.errorWindow.length).toBe(1);
    });

    it('removes timestamps outside the window', () => {
      // Manually add old timestamps
      const now = Date.now();
      eb.errorWindow = [now - 60000, now - 45000];
      eb.trackError();
      // Old ones should be filtered out
      expect(eb.errorWindow.length).toBe(1);
    });

    it('updates errorCount when exceeding maxErrors', () => {
      for (let i = 0; i < 6; i++) {
        eb.trackError();
      }
      expect(eb.errorCount).toBe(6);
    });
  });

  describe('isCriticalError', () => {
    it('returns false when under threshold', () => {
      for (let i = 0; i < 4; i++) {
        eb.trackError();
      }
      expect(eb.isCriticalError()).toBe(false);
    });

    it('returns true when at threshold', () => {
      for (let i = 0; i < 5; i++) {
        eb.trackError();
      }
      expect(eb.isCriticalError()).toBe(true);
    });
  });

  describe('showFallbackUI', () => {
    it('creates fallback overlay', () => {
      eb.showFallbackUI();
      const overlay = document.getElementById('error-fallback');
      expect(overlay).not.toBeNull();
      expect(overlay.querySelector('h2').textContent).toBe('Something went wrong');
      expect(overlay.querySelector('#btn-error-reload')).not.toBeNull();
    });

    it('does not create duplicate overlays', () => {
      eb.showFallbackUI();
      eb.showFallbackUI();
      const overlays = document.querySelectorAll('#error-fallback');
      expect(overlays.length).toBe(1);
    });
  });

  describe('destroy', () => {
    it('removes event listeners', () => {
      eb.init();
      eb.destroy();
      // Should not throw when errors occur after destroy
      window.dispatchEvent(new ErrorEvent('error', { message: 'test' }));
    });
  });
});
