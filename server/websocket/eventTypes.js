/**
 * QuickMeet — WebSocket Event Types
 * Centralized message type constants for signaling.
 */

const EVENTS = {
  // Client → Server
  JOIN_ROOM: 'JOIN_ROOM',
  PONG: 'PONG',

  // Server → Client
  USER_JOINED: 'USER_JOINED',
  USER_LEFT: 'USER_LEFT',
  ROOM_READY: 'ROOM_READY',
  ROOM_WAITING: 'ROOM_WAITING',
  ERROR: 'ERROR',
  PING: 'PING',

  // WebRTC signaling (Phase 5)
  OFFER: 'OFFER',
  ANSWER: 'ANSWER',
  ICE_CANDIDATE: 'ICE_CANDIDATE',
};

const WS_ERRORS = {
  ROOM_NOT_FOUND: 'Room not found',
  ROOM_FULL: 'Room is full',
  INVALID_MESSAGE: 'Invalid message format',
  UNKNOWN_EVENT: 'Unknown event type',
  MISSING_ROOM_CODE: 'Room code is required',
  INVALID_ROOM_CODE: 'Invalid room code format',
  ALREADY_IN_ROOM: 'Already connected to a room',
  NOT_IN_ROOM: 'Not connected to a room',
  INVALID_SDP: 'Invalid session description',
  INVALID_CANDIDATE: 'Invalid ICE candidate',
};

module.exports = { EVENTS, WS_ERRORS };
