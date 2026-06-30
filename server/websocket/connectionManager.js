/**
 * QuickMeet — Connection Manager
 * Tracks active WebSocket connections and assigns unique socket IDs.
 */

const { randomUUID } = require('crypto');

/** @type {Map<string, { id: string, ws: import('ws'), roomCode: string|null, isAlive: boolean }>} */
const connections = new Map();

/**
 * Register a new WebSocket connection.
 * @param {import('ws')} ws
 * @returns {string} Assigned socket ID
 */
function addConnection(ws) {
  const id = randomUUID();

  connections.set(id, {
    id,
    ws,
    roomCode: null,
    isAlive: true,
  });

  ws.socketId = id;
  return id;
}

/**
 * Get a connection by socket ID.
 * @param {string} socketId
 * @returns {{ id: string, ws: import('ws'), roomCode: string|null, isAlive: boolean }|undefined}
 */
function getConnection(socketId) {
  return connections.get(socketId);
}

/**
 * Assign a room to a connection.
 * @param {string} socketId
 * @param {string} roomCode
 */
function setRoom(socketId, roomCode) {
  const conn = connections.get(socketId);
  if (conn) {
    conn.roomCode = roomCode;
  }
}

/**
 * Mark a connection as alive (heartbeat response received).
 * @param {string} socketId
 */
function markAlive(socketId) {
  const conn = connections.get(socketId);
  if (conn) {
    conn.isAlive = true;
  }
}

/**
 * Mark a connection as not alive (awaiting PONG).
 * @param {string} socketId
 */
function markAwaitingPong(socketId) {
  const conn = connections.get(socketId);
  if (conn) {
    conn.isAlive = false;
  }
}

/**
 * Remove a connection from the store.
 * @param {string} socketId
 * @returns {{ id: string, ws: import('ws'), roomCode: string|null, isAlive: boolean }|undefined}
 */
function removeConnection(socketId) {
  const conn = connections.get(socketId);
  connections.delete(socketId);
  return conn;
}

/**
 * Get all active connections.
 * @returns {Map<string, { id: string, ws: import('ws'), roomCode: string|null, isAlive: boolean }>}
 */
function getAllConnections() {
  return connections;
}

/**
 * Get total number of active connections.
 * @returns {number}
 */
function getConnectionCount() {
  return connections.size;
}

module.exports = {
  addConnection,
  getConnection,
  setRoom,
  markAlive,
  markAwaitingPong,
  removeConnection,
  getAllConnections,
  getConnectionCount,
};
