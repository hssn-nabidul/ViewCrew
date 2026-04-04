import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const mockStorage = {};
beforeEach(() => {
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  global.localStorage = {
    getItem: vi.fn((key) => mockStorage[key] || null),
    setItem: vi.fn((key, value) => { mockStorage[key] = String(value); }),
    removeItem: vi.fn((key) => { delete mockStorage[key]; }),
    clear: vi.fn(() => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); })
  };
});

// Re-import after mock setup
async function getStorage() {
  return import('../utils/storage.js');
}

describe('storage', () => {
  describe('getUserId', () => {
    it('generates a new user ID if none exists', async () => {
      const { storage } = await getStorage();
      const id = storage.getUserId();
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('returns existing user ID', async () => {
      mockStorage['watchsync-userId'] = 'existing-user-123';
      const { storage } = await getStorage();
      const id = storage.getUserId();
      expect(id).toBe('existing-user-123');
    });

    it('stores generated user ID in localStorage', async () => {
      const { storage } = await getStorage();
      storage.getUserId();
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('setUserId', () => {
    it('stores user ID in localStorage', async () => {
      const { storage } = await getStorage();
      storage.setUserId('new-user-456');
      expect(localStorage.setItem).toHaveBeenCalledWith('watchsync-userId', 'new-user-456');
    });
  });

  describe('getDisplayName', () => {
    it('returns stored display name', async () => {
      mockStorage['watchsync-displayName'] = 'Alice';
      const { storage } = await getStorage();
      expect(storage.getDisplayName('user1')).toBe('Alice');
    });

    it('returns fallback with userId if no name stored', async () => {
      const { storage } = await getStorage();
      expect(storage.getDisplayName('user1')).toBe('User_user1');
    });
  });

  describe('setDisplayName', () => {
    it('stores display name in localStorage', async () => {
      const { storage } = await getStorage();
      storage.setDisplayName('Bob');
      expect(localStorage.setItem).toHaveBeenCalledWith('watchsync-displayName', 'Bob');
    });
  });

  describe('getHostToken', () => {
    it('returns stored host token', async () => {
      mockStorage['watchsync-hostToken'] = 'token-abc';
      const { storage } = await getStorage();
      expect(storage.getHostToken()).toBe('token-abc');
    });

    it('returns null if no token stored', async () => {
      const { storage } = await getStorage();
      expect(storage.getHostToken()).toBeNull();
    });
  });

  describe('setHostToken', () => {
    it('stores host token in localStorage', async () => {
      const { storage } = await getStorage();
      storage.setHostToken('new-token');
      expect(localStorage.setItem).toHaveBeenCalledWith('watchsync-hostToken', 'new-token');
    });
  });

  describe('clearHostToken', () => {
    it('removes host token from localStorage', async () => {
      const { storage } = await getStorage();
      storage.clearHostToken();
      expect(localStorage.removeItem).toHaveBeenCalledWith('watchsync-hostToken');
    });
  });
});
