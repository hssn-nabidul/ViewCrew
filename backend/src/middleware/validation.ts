const VALID_SYNC_TYPES = new Set(['play', 'pause', 'seek', 'source-change']);
const VALID_EMOJI_IDS = new Set(['heart', 'laugh', 'wow', 'cry', 'clap', 'fire', 'love', 'skull']);
const ROOM_ID_REGEX = /^[A-Z0-9]{6}$/;
const MAX_DISPLAY_NAME = 30;
const MAX_CHAT_MESSAGE = 500;

export function sanitizeString(input: unknown, maxLength: number): string {
  if (typeof input !== 'string') return '';
  return input.trim().substring(0, maxLength);
}

export function validateRoomId(roomId: unknown): string | null {
  if (typeof roomId !== 'string') return null;
  const normalized = roomId.toUpperCase();
  if (!ROOM_ID_REGEX.test(normalized)) return null;
  return normalized;
}

export function validateDisplayName(name: unknown): string | null {
  const sanitized = sanitizeString(name, MAX_DISPLAY_NAME);
  if (sanitized.length === 0) return null;
  return sanitized;
}

export function validateChatMessage(message: unknown): string | null {
  const sanitized = sanitizeString(message, MAX_CHAT_MESSAGE);
  if (sanitized.length === 0) return null;
  return sanitized;
}

export function validateSyncType(type: unknown): string | null {
  if (typeof type !== 'string') return null;
  if (!VALID_SYNC_TYPES.has(type)) return null;
  return type;
}

export function validateEmojiId(emojiId: unknown): string | null {
  if (typeof emojiId !== 'string') return null;
  if (!VALID_EMOJI_IDS.has(emojiId)) return null;
  return emojiId;
}

export function validateTime(time: unknown): number | null {
  if (typeof time !== 'number' || time < 0 || !isFinite(time)) return null;
  return time;
}

export function validateUserId(userId: unknown): string | null {
  if (typeof userId !== 'string' || userId.trim().length === 0) return null;
  return userId.trim();
}
