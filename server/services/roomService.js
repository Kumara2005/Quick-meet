/**
 * QuickMeet — Room Service
 * Business logic for in-memory room management.
 */

const { randomUUID } = require('crypto');
const { generateUniqueRoomCode } = require('../utils/roomGenerator');
const {
  ROOM_STATUS,
  ROOM_LIMITS,
  MESSAGES,
  HTTP_STATUS,
} = require('../config/constants');

/** @type {Record<string, { code: string, participants: Array<{ id: string, joinedAt: Date }>, createdAt: Date, status: string }>} */
const rooms = {};

/**
 * Custom error with HTTP status code for controller handling.
 */
class RoomError extends Error {
  /**
   * @param {string} message
   * @param {number} statusCode
   */
  constructor(message, statusCode) {
    super(message);
    this.name = 'RoomError';
    this.statusCode = statusCode;
  }
}

/**
 * Derive room status from current participant count.
 * @param {number} count
 * @returns {string}
 */
function deriveStatus(count) {
  if (count >= ROOM_LIMITS.MAX_PARTICIPANTS) {
    return ROOM_STATUS.READY;
  }
  return ROOM_STATUS.WAITING;
}

/**
 * Create a new room with a unique code.
 * @returns {{ success: boolean, roomCode: string }}
 */
function createRoom() {
  const roomCode = generateUniqueRoomCode(rooms);

  rooms[roomCode] = {
    code: roomCode,
    participants: [],
    createdAt: new Date(),
    status: ROOM_STATUS.WAITING,
  };

  return {
    success: true,
    roomCode,
  };
}

/**
 * Join an existing room.
 * @param {string} roomCode
 * @returns {{ success: boolean, participants: number, status: string }}
 */
function joinRoom(roomCode) {
  const room = rooms[roomCode];

  if (!room) {
    throw new RoomError(MESSAGES.ROOM_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  if (room.participants.length >= ROOM_LIMITS.MAX_PARTICIPANTS) {
    throw new RoomError(MESSAGES.ROOM_FULL, HTTP_STATUS.FORBIDDEN);
  }

  const participant = {
    id: randomUUID(),
    joinedAt: new Date(),
  };

  room.participants.push(participant);
  room.status = deriveStatus(room.participants.length);

  // WebSocket layer (Phase 3) handles real-time peer notifications.

  return {
    success: true,
    participants: room.participants.length,
    status: room.status,
  };
}

/**
 * Remove a participant from a room. Deletes the room if it becomes empty.
 * @param {string} roomCode
 * @returns {{ success: boolean, participants: number, deleted: boolean }}
 */
function leaveRoom(roomCode) {
  const room = rooms[roomCode];

  if (!room) {
    throw new RoomError(MESSAGES.ROOM_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  if (room.participants.length === 0) {
    throw new RoomError(MESSAGES.ROOM_EMPTY, HTTP_STATUS.BAD_REQUEST);
  }

  room.participants.pop();
  room.status = deriveStatus(room.participants.length);

  let deleted = false;

  if (room.participants.length === ROOM_LIMITS.MIN_PARTICIPANTS) {
    delete rooms[roomCode];
    deleted = true;
    // Room dissolved — WebSocket layer cleans up socket mappings separately.
  }

  return {
    success: true,
    participants: room.participants.length,
    deleted,
  };
}

/**
 * Get public information about a room.
 * @param {string} roomCode
 * @returns {{ code: string, participants: number, status: string }}
 */
function getRoomInfo(roomCode) {
  const room = rooms[roomCode];

  if (!room) {
    throw new RoomError(MESSAGES.ROOM_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  return {
    code: room.code,
    participants: room.participants.length,
    status: room.status,
  };
}

/**
 * Check whether a room exists (used internally / for future phases).
 * @param {string} roomCode
 * @returns {boolean}
 */
function roomExists(roomCode) {
  return Boolean(rooms[roomCode]);
}

module.exports = {
  RoomError,
  createRoom,
  joinRoom,
  leaveRoom,
  getRoomInfo,
  roomExists,
};
