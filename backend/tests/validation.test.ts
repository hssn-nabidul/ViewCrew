import { describe, it, expect } from 'vitest';
import {
  sanitizeString,
  validateRoomId,
  validateDisplayName,
  validateChatMessage,
  validateSyncType,
  validateEmojiId,
  validateTime,
  validateUserId
} from '../src/middleware/validation';

describe('sanitizeString', () => {
  it('trims whitespace', () => {
    expect(sanitizeString('  hello  ', 100)).toBe('hello');
  });

  it('truncates to max length', () => {
    expect(sanitizeString('hello world', 5)).toBe('hello');
  });

  it('returns empty string for non-string input', () => {
    expect(sanitizeString(123 as any, 100)).toBe('');
    expect(sanitizeString(null as any, 100)).toBe('');
    expect(sanitizeString(undefined as any, 100)).toBe('');
  });

  it('handles empty string', () => {
    expect(sanitizeString('', 100)).toBe('');
  });
});

describe('validateRoomId', () => {
  it('accepts valid 6-char uppercase alphanumeric', () => {
    expect(validateRoomId('ABC123')).toBe('ABC123');
    expect(validateRoomId('XYZ789')).toBe('XYZ789');
  });

  it('normalizes lowercase to uppercase', () => {
    expect(validateRoomId('abc123')).toBe('ABC123');
    expect(validateRoomId('AbCdEf')).toBe('ABCDEF');
  });

  it('rejects too short IDs', () => {
    expect(validateRoomId('ABC12')).toBeNull();
    expect(validateRoomId('AB')).toBeNull();
  });

  it('rejects too long IDs', () => {
    expect(validateRoomId('ABC1234')).toBeNull();
  });

  it('rejects special characters', () => {
    expect(validateRoomId('ABC!23')).toBeNull();
    expect(validateRoomId('A C123')).toBeNull();
  });

  it('rejects empty or invalid input', () => {
    expect(validateRoomId('')).toBeNull();
    expect(validateRoomId(null as any)).toBeNull();
    expect(validateRoomId(undefined as any)).toBeNull();
  });
});

describe('validateDisplayName', () => {
  it('accepts valid names within length limit', () => {
    expect(validateDisplayName('Alice')).toBe('Alice');
    expect(validateDisplayName('Bob')).toBe('Bob');
  });

  it('trims and truncates long names', () => {
    const longName = 'A'.repeat(50);
    const result = validateDisplayName(longName);
    expect(result).toBe('A'.repeat(30));
  });

  it('rejects empty names', () => {
    expect(validateDisplayName('')).toBeNull();
    expect(validateDisplayName('   ')).toBeNull();
  });

  it('rejects non-string input', () => {
    expect(validateDisplayName(123 as any)).toBeNull();
  });
});

describe('validateChatMessage', () => {
  it('accepts valid messages within length limit', () => {
    expect(validateChatMessage('Hello world')).toBe('Hello world');
  });

  it('trims and truncates long messages', () => {
    const longMsg = 'A'.repeat(600);
    const result = validateChatMessage(longMsg);
    expect(result).toBe('A'.repeat(500));
  });

  it('rejects empty messages', () => {
    expect(validateChatMessage('')).toBeNull();
    expect(validateChatMessage('   ')).toBeNull();
  });

  it('rejects non-string input', () => {
    expect(validateChatMessage(123 as any)).toBeNull();
  });
});

describe('validateSyncType', () => {
  it('accepts valid sync types', () => {
    expect(validateSyncType('play')).toBe('play');
    expect(validateSyncType('pause')).toBe('pause');
    expect(validateSyncType('seek')).toBe('seek');
    expect(validateSyncType('source-change')).toBe('source-change');
  });

  it('rejects invalid sync types', () => {
    expect(validateSyncType('rewind')).toBeNull();
    expect(validateSyncType('fast-forward')).toBeNull();
    expect(validateSyncType('')).toBeNull();
    expect(validateSyncType(null as any)).toBeNull();
  });
});

describe('validateEmojiId', () => {
  it('accepts valid emoji IDs', () => {
    expect(validateEmojiId('heart')).toBe('heart');
    expect(validateEmojiId('laugh')).toBe('laugh');
    expect(validateEmojiId('wow')).toBe('wow');
    expect(validateEmojiId('cry')).toBe('cry');
    expect(validateEmojiId('clap')).toBe('clap');
    expect(validateEmojiId('fire')).toBe('fire');
    expect(validateEmojiId('love')).toBe('love');
    expect(validateEmojiId('skull')).toBe('skull');
  });

  it('rejects invalid emoji IDs', () => {
    expect(validateEmojiId('thumbsup')).toBeNull();
    expect(validateEmojiId('')).toBeNull();
    expect(validateEmojiId(null as any)).toBeNull();
  });
});

describe('validateTime', () => {
  it('accepts valid non-negative numbers', () => {
    expect(validateTime(0)).toBe(0);
    expect(validateTime(142.5)).toBe(142.5);
    expect(validateTime(3600)).toBe(3600);
  });

  it('rejects negative numbers', () => {
    expect(validateTime(-1)).toBeNull();
    expect(validateTime(-0.1)).toBeNull();
  });

  it('rejects NaN and Infinity', () => {
    expect(validateTime(NaN)).toBeNull();
    expect(validateTime(Infinity)).toBeNull();
    expect(validateTime(-Infinity)).toBeNull();
  });

  it('rejects non-number input', () => {
    expect(validateTime('123' as any)).toBeNull();
    expect(validateTime(null as any)).toBeNull();
  });
});

describe('validateUserId', () => {
  it('accepts valid user IDs', () => {
    expect(validateUserId('user_abc123')).toBe('user_abc123');
    expect(validateUserId('uuid-v4-here')).toBe('uuid-v4-here');
  });

  it('trims whitespace', () => {
    expect(validateUserId('  user_abc  ')).toBe('user_abc');
  });

  it('rejects empty input', () => {
    expect(validateUserId('')).toBeNull();
    expect(validateUserId('   ')).toBeNull();
  });

  it('rejects non-string input', () => {
    expect(validateUserId(123 as any)).toBeNull();
  });
});
