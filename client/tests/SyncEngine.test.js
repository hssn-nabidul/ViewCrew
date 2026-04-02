import { describe, it, expect } from 'vitest';
import { SyncEngine } from '../core/SyncEngine.js';

describe('SyncEngine', () => {
  describe('constructor', () => {
    it('initializes with correct default values', () => {
      const mockSocket = { on: () => {}, off: () => {} };
      const engine = new SyncEngine(mockSocket, 'video-container', true, 'test-room');

      expect(engine.isHost).toBe(true);
      expect(engine.roomId).toBe('test-room');
      expect(engine.containerId).toBe('video-container');
      expect(engine.player).toBeNull();
      expect(engine.currentSource).toBeNull();
      expect(engine.currentSourceValue).toBeNull();
      expect(engine._isLoadingSource).toBe(false);
      expect(engine._justAppliedPending).toBe(false);
      expect(engine._pendingSource).toBeNull();
      expect(engine._pendingStream).toBeNull();
    });
  });

  describe('loadSource re-entrancy', () => {
    it('prevents re-entrant calls via _isLoadingSource flag', () => {
      const mockSocket = { on: () => {}, off: () => {} };
      const engine = new SyncEngine(mockSocket, 'video-container', true, 'test-room');

      engine._isLoadingSource = true;
      engine.loadSource('youtube', 'abc123');

      expect(engine.currentSource).toBeNull();
      expect(engine._isLoadingSource).toBe(true);
    });

    it('skips when _justAppliedPending is true', () => {
      const mockSocket = { on: () => {}, off: () => {} };
      const engine = new SyncEngine(mockSocket, 'video-container', true, 'test-room');

      engine._justAppliedPending = true;
      engine.loadSource('youtube', 'abc123');

      expect(engine.currentSource).toBeNull();
    });

    it('skips when same source and player already exists', () => {
      const mockSocket = { on: () => {}, off: () => {} };
      const engine = new SyncEngine(mockSocket, 'video-container', true, 'test-room');

      engine.currentSource = 'youtube';
      engine.currentSourceValue = 'abc123';
      engine.player = { destroy: () => {} };

      engine.loadSource('youtube', 'abc123');

      expect(engine._isLoadingSource).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('resets state flags', () => {
      const mockSocket = { on: () => {}, off: () => {} };
      const engine = new SyncEngine(mockSocket, 'video-container', true, 'test-room');

      engine._isLoadingSource = true;
      engine._justAppliedPending = true;
      engine._pendingSource = { source: 'youtube', value: 'abc' };
      engine._pendingStream = {};

      engine.cleanup();

      expect(engine._isLoadingSource).toBe(false);
      expect(engine._justAppliedPending).toBe(false);
      expect(engine._pendingSource).toBeNull();
      expect(engine._pendingStream).toBeNull();
    });
  });
});
