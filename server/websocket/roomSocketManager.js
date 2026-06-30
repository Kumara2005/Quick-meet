/**
 * QuickMeet — Room Socket Manager
 * Maps room codes to connected WebSocket IDs.
 */

/** @type {Map<string, Set<string>>} */
const roomSockets = new Map();

/**
 * Add a socket to a room.
 * @param {string} roomCode
 * @param {string} socketId
 */
function addSocketToRoom(roomCode, socketId) {
  if (!roomSockets.has(roomCode)) {
    roomSockets.set(roomCode, new Set());
  }
  roomSockets.get(roomCode).add(socketId);
}

/**
 * Remove a socket from a room.
 * @param {string} roomCode
 * @param {string} socketId
 * @returns {boolean} True if the room is now empty
 */
function removeSocketFromRoom(roomCode, socketId) {
  const sockets = roomSockets.get(roomCode);
  if (!sockets) return true;

  sockets.delete(socketId);

  if (sockets.size === 0) {
    roomSockets.delete(roomCode);
    return true;
  }

  return false;
}

/**
 * Get all socket IDs in a room.
 * @param {string} roomCode
 * @returns {string[]}
 */
function getRoomSockets(roomCode) {
  const sockets = roomSockets.get(roomCode);
  return sockets ? Array.from(sockets) : [];
}

/**
 * Get the number of connected sockets in a room.
 * @param {string} roomCode
 * @returns {number}
 */
function getRoomSocketCount(roomCode) {
  const sockets = roomSockets.get(roomCode);
  return sockets ? sockets.size : 0;
}

/**
 * Check if a room has any connected sockets.
 * @param {string} roomCode
 * @returns {boolean}
 */
function roomHasSockets(roomCode) {
  return getRoomSocketCount(roomCode) > 0;
}

/**
 * Delete a room and all its socket mappings.
 * @param {string} roomCode
 */
function deleteRoom(roomCode) {
  roomSockets.delete(roomCode);
}

module.exports = {
  addSocketToRoom,
  removeSocketFromRoom,
  getRoomSockets,
  getRoomSocketCount,
  roomHasSockets,
  deleteRoom,
};
