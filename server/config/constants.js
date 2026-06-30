/**
 * QuickMeet — Application Constants
 */

const ROOM_STATUS = {
  WAITING: 'waiting',
  READY: 'ready',
};

const ROOM_LIMITS = {
  MIN_PARTICIPANTS: 0,
  MAX_PARTICIPANTS: 2,
};

/** Matches format: ABC-123 (three uppercase letters, hyphen, three digits) */
const ROOM_CODE_PATTERN = /^[A-Z]{3}-\d{3}$/;

const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

const WS_LIMITS = {
  /** Maximum incoming WebSocket message size (bytes) */
  MAX_MESSAGE_BYTES: 64 * 1024,
  /** Maximum SDP string length */
  MAX_SDP_LENGTH: 32 * 1024,
};

const WS_TIMING = {
  HEARTBEAT_INTERVAL_MS: 30_000,
  HEARTBEAT_TIMEOUT_MS: 10_000,
};

const MESSAGES = {
  ROOM_NOT_FOUND: 'Room not found',
  ROOM_FULL: 'Room Full',
  MISSING_ROOM_CODE: 'Room code is required',
  INVALID_ROOM_CODE: 'Invalid room code format. Expected format: ABC-123',
  ROOM_EMPTY: 'Room has no participants to remove',
  INTERNAL_ERROR: 'An unexpected error occurred',
};

module.exports = {
  PORT: Number(process.env.PORT) || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  ROOM_STATUS,
  ROOM_LIMITS,
  ROOM_CODE_PATTERN,
  HTTP_STATUS,
  WS_LIMITS,
  WS_TIMING,
  MESSAGES,
};
