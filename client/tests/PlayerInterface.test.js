import { describe, it, expect } from 'vitest';
import { PlayerInterface } from '../players/PlayerInterface';

describe('PlayerInterface', () => {
  it('is a class', () => {
    expect(typeof PlayerInterface).toBe('function');
  });

  it('initializes with containerId and onEvent', () => {
    const player = new PlayerInterface('test-container', () => {});
    expect(player.containerId).toBe('test-container');
    expect(typeof player.onEvent).toBe('function');
  });

  it('initializes isMuted to false', () => {
    const player = new PlayerInterface('test-container', () => {});
    expect(player.isMuted).toBe(false);
  });

  describe('default method implementations', () => {
    let player;

    beforeEach(() => {
      player = new PlayerInterface('test-container', () => {});
    });

    it('load is a function', () => {
      expect(typeof player.load).toBe('function');
    });

    it('play is a function', () => {
      expect(typeof player.play).toBe('function');
    });

    it('pause is a function', () => {
      expect(typeof player.pause).toBe('function');
    });

    it('seek is a function', () => {
      expect(typeof player.seek).toBe('function');
    });

    it('getCurrentTime returns 0', () => {
      expect(player.getCurrentTime()).toBe(0);
    });

    it('getDuration returns 0', () => {
      expect(player.getDuration()).toBe(0);
    });

    it('isPaused returns true', () => {
      expect(player.isPaused()).toBe(true);
    });

    it('setVolume is a function', () => {
      expect(typeof player.setVolume).toBe('function');
    });

    it('destroy is a function', () => {
      expect(typeof player.destroy).toBe('function');
    });
  });
});
