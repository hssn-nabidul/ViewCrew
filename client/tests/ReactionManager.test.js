import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ReactionManager, EMOJI_REACTIONS } from '../utils/ReactionManager';

describe('ReactionManager', () => {
  let rm;
  let container;
  let onSendReaction;

  beforeEach(() => {
    // Create container
    container = document.createElement('div');
    container.id = 'test-container';
    container.getBoundingClientRect = () => ({ width: 400, height: 300, top: 0, left: 0, bottom: 300, right: 400 });
    document.body.appendChild(container);

    onSendReaction = vi.fn();
    rm = new ReactionManager('test-container', onSendReaction);
  });

  afterEach(() => {
    rm.destroy();
    container.remove();
    // Clean up any remaining picker
    const picker = document.getElementById('reaction-picker');
    if (picker) picker.remove();
  });

  describe('EMOJI_REACTIONS', () => {
    it('exports 8 emoji reactions', () => {
      expect(EMOJI_REACTIONS).toHaveLength(8);
    });

    it('each emoji has id and emoji properties', () => {
      EMOJI_REACTIONS.forEach(r => {
        expect(r).toHaveProperty('id');
        expect(r).toHaveProperty('emoji');
        expect(typeof r.id).toBe('string');
        expect(typeof r.emoji).toBe('string');
      });
    });
  });

  describe('constructor', () => {
    it('initializes with correct properties', () => {
      expect(rm.containerId).toBe('test-container');
      expect(rm.isVisible).toBe(false);
      expect(rm.picker).toBeNull();
    });
  });

  describe('show', () => {
    it('creates picker and shows it', () => {
      rm.show();
      expect(rm.picker).not.toBeNull();
      expect(rm.isVisible).toBe(true);
      expect(rm.picker.classList.contains('visible')).toBe(true);
    });

    it('appends picker to container', () => {
      rm.show();
      expect(rm.picker.parentNode).toBe(container);
    });

    it('does not duplicate picker on multiple shows', () => {
      rm.show();
      const first = rm.picker;
      rm.hide();
      rm.show();
      expect(rm.picker).toBe(first);
    });
  });

  describe('hide', () => {
    it('hides the picker', () => {
      rm.show();
      rm.hide();
      expect(rm.isVisible).toBe(false);
      expect(rm.picker.classList.contains('visible')).toBe(false);
    });
  });

  describe('toggle', () => {
    it('shows when hidden', () => {
      rm.toggle();
      expect(rm.isVisible).toBe(true);
    });

    it('hides when visible', () => {
      rm.show();
      rm.toggle();
      expect(rm.isVisible).toBe(false);
    });
  });

  describe('click handler', () => {
    it('calls onSendReaction with emoji ID', () => {
      rm.show();
      const btn = rm.picker.querySelector('[data-emoji-id="laugh"]');
      btn.click();
      expect(onSendReaction).toHaveBeenCalledWith('laugh');
    });

    it('hides picker after clicking emoji', () => {
      rm.show();
      const btn = rm.picker.querySelector('[data-emoji-id="heart"]');
      btn.click();
      expect(rm.isVisible).toBe(false);
    });
  });

  describe('handleRemoteReaction', () => {
    it('animates reaction for valid emoji ID', () => {
      // Should not throw
      expect(() => {
        rm.handleRemoteReaction({ emojiId: 'fire', displayName: 'Alice' });
      }).not.toThrow();
    });

    it('ignores invalid emoji ID', () => {
      expect(() => {
        rm.handleRemoteReaction({ emojiId: 'invalid', displayName: 'Bob' });
      }).not.toThrow();
    });
  });

  describe('destroy', () => {
    it('removes picker from DOM', () => {
      rm.show();
      rm.destroy();
      expect(document.getElementById('reaction-picker')).toBeNull();
    });

    it('removes document event listener', () => {
      rm.show();
      rm.destroy();
      // Should not throw on document click after destroy
      document.dispatchEvent(new MouseEvent('click'));
    });
  });
});
