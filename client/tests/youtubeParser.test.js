import { describe, it, expect } from 'vitest';
import { parseYouTubeUrl, isValidYouTubeUrl } from '../utils/youtubeParser';

describe('parseYouTubeUrl', () => {
  describe('direct video ID', () => {
    it('accepts 11-char video ID', () => {
      expect(parseYouTubeUrl('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('accepts ID with underscores and hyphens', () => {
      expect(parseYouTubeUrl('abc-123_XYZ')).toBe('abc-123_XYZ');
    });

    it('rejects invalid ID length', () => {
      expect(parseYouTubeUrl('abc123')).toBeNull();
      expect(parseYouTubeUrl('abc1234567890')).toBeNull();
    });

    it('rejects ID with special characters', () => {
      expect(parseYouTubeUrl('abc!123@#$%^')).toBeNull();
    });
  });

  describe('standard URLs', () => {
    it('parses youtube.com/watch?v=ID', () => {
      expect(parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('parses youtube.com/watch with extra params', () => {
      expect(parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120s')).toBe('dQw4w9WgXcQ');
    });

    it('parses youtu.be/ID', () => {
      expect(parseYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('parses youtube.com/embed/ID', () => {
      expect(parseYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('parses youtube.com/shorts/ID', () => {
      expect(parseYouTubeUrl('https://www.youtube.com/shorts/abc12345678')).toBe('abc12345678');
    });

    it('parses youtube.com/live/ID', () => {
      expect(parseYouTubeUrl('https://www.youtube.com/live/abc12345678')).toBe('abc12345678');
    });

    it('parses youtube.com/v/ID', () => {
      expect(parseYouTubeUrl('https://www.youtube.com/v/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('parses youtube-nocookie.com/embed/ID', () => {
      expect(parseYouTubeUrl('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });
  });

  describe('invalid inputs', () => {
    it('returns null for empty string', () => {
      expect(parseYouTubeUrl('')).toBeNull();
    });

    it('returns null for null', () => {
      expect(parseYouTubeUrl(null)).toBeNull();
    });

    it('returns null for undefined', () => {
      expect(parseYouTubeUrl(undefined)).toBeNull();
    });

    it('returns null for non-string', () => {
      expect(parseYouTubeUrl(123)).toBeNull();
    });

    it('returns null for non-YouTube URL', () => {
      expect(parseYouTubeUrl('https://vimeo.com/123456')).toBeNull();
    });

    it('returns null for invalid URL string', () => {
      expect(parseYouTubeUrl('not a url at all!')).toBeNull();
    });

    it('returns null for youtube.com without video ID', () => {
      expect(parseYouTubeUrl('https://www.youtube.com/')).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('trims whitespace', () => {
      expect(parseYouTubeUrl('  dQw4w9WgXcQ  ')).toBe('dQw4w9WgXcQ');
    });

    it('handles http protocol', () => {
      expect(parseYouTubeUrl('http://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('handles no protocol', () => {
      expect(parseYouTubeUrl('www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    });
  });
});

describe('isValidYouTubeUrl', () => {
  it('returns true for valid video ID', () => {
    expect(isValidYouTubeUrl('dQw4w9WgXcQ')).toBe(true);
  });

  it('returns true for valid URL', () => {
    expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
  });

  it('returns false for invalid input', () => {
    expect(isValidYouTubeUrl('')).toBe(false);
    expect(isValidYouTubeUrl(null)).toBe(false);
    expect(isValidYouTubeUrl('https://vimeo.com/123')).toBe(false);
  });
});
