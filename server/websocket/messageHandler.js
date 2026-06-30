/**
 * QuickMeet — WebSocket Message Handler
 * Dispatches incoming messages to modular handler functions.
 */

const { randomUUID } = require('crypto');
const { ROOM_CODE_PATTERN, ROOM_LIMITS, WS_LIMITS, ALLOWED_REACTIONS } = require('../config/constants');
const roomService = require('../services/roomService');
const connectionManager = require('./connectionManager');
const roomSocketManager = require('./roomSocketManager');
const { EVENTS, WS_ERRORS } = require('./eventTypes');
const logger = require('../utils/logger');

/**
 * Send a typed message to a specific socket.
 * @param {string} socketId
 * @param {string} type
 * @param {Object} [payload={}]
 */
function sendToSocket(socketId, type, payload = {}) {
  const conn = connectionManager.getConnection(socketId);
  if (!conn || conn.ws.readyState !== 1) return;

  conn.ws.send(JSON.stringify({ type, payload }));
}

/**
 * Send an error message to a specific socket.
 * @param {string} socketId
 * @param {string} message
 */
function sendError(socketId, message) {
  sendToSocket(socketId, EVENTS.ERROR, { message });
}

/**
 * Broadcast a message to all sockets in a room, optionally excluding one.
 * @param {string} roomCode
 * @param {string} type
 * @param {Object} payload
 * @param {string|null} [excludeSocketId=null]
 */
function broadcastToRoom(roomCode, type, payload, excludeSocketId = null) {
  const socketIds = roomSocketManager.getRoomSockets(roomCode);

  for (const id of socketIds) {
    if (id !== excludeSocketId) {
      sendToSocket(id, type, payload);
    }
  }
}

/**
 * Normalize and validate a room code string.
 * @param {string} rawCode
 * @returns {string|null}
 */
function parseRoomCode(rawCode) {
  if (!rawCode || typeof rawCode !== 'string') return null;
  const normalized = rawCode.trim().toUpperCase();
  return ROOM_CODE_PATTERN.test(normalized) ? normalized : null;
}

/**
 * Validate payload is a plain object (not array/null).
 * @param {*} payload
 * @returns {boolean}
 */
function isValidPayload(payload) {
  return payload !== null && typeof payload === 'object' && !Array.isArray(payload);
}

/**
 * Handle JOIN_ROOM event.
 * @param {string} socketId
 * @param {Object} payload
 */
function handleJoinRoom(socketId, payload) {
  const conn = connectionManager.getConnection(socketId);
  if (!conn) return;

  if (conn.roomCode) {
    return sendError(socketId, WS_ERRORS.ALREADY_IN_ROOM);
  }

  if (!isValidPayload(payload)) {
    return sendError(socketId, WS_ERRORS.INVALID_MESSAGE);
  }

  if (!payload.roomCode) {
    return sendError(socketId, WS_ERRORS.MISSING_ROOM_CODE);
  }

  const roomCode = parseRoomCode(payload.roomCode);

  if (!roomCode) {
    return sendError(socketId, WS_ERRORS.INVALID_ROOM_CODE);
  }

  if (!roomService.roomExists(roomCode)) {
    return sendError(socketId, WS_ERRORS.ROOM_NOT_FOUND);
  }

  if (roomSocketManager.getRoomSocketCount(roomCode) >= ROOM_LIMITS.MAX_PARTICIPANTS) {
    return sendError(socketId, WS_ERRORS.ROOM_FULL);
  }

  roomSocketManager.addSocketToRoom(roomCode, socketId);
  connectionManager.setRoom(socketId, roomCode);

  const participantCount = roomSocketManager.getRoomSocketCount(roomCode);

  logger.info(`Room Joined: ${roomCode} (socket: ${socketId.slice(0, 8)}…, total: ${participantCount})`);

  if (participantCount === 1) {
    sendToSocket(socketId, EVENTS.ROOM_WAITING, {
      roomCode,
      participants: participantCount,
      peerId: socketId,
    });
    return;
  }

  if (participantCount === 2) {
    sendToSocket(socketId, EVENTS.ROOM_READY, {
      roomCode,
      participants: participantCount,
      peerId: socketId,
    });

    broadcastToRoom(roomCode, EVENTS.ROOM_READY, {
      roomCode,
      participants: participantCount,
    }, socketId);

    broadcastToRoom(roomCode, EVENTS.USER_JOINED, {
      roomCode,
      peerId: socketId,
      participants: participantCount,
    }, socketId);

    logger.info(`Room Ready: ${roomCode}`);
  }
}

/**
 * Handle PONG heartbeat response.
 * @param {string} socketId
 */
function handlePong(socketId) {
  connectionManager.markAlive(socketId);
}

/**
 * Forward WebRTC signaling messages to the other participant in the room.
 * @param {string} socketId
 * @param {string} eventType
 * @param {Object} payload
 * @param {string} requiredField
 */
function forwardSignalingMessage(socketId, eventType, payload, requiredField) {
  const conn = connectionManager.getConnection(socketId);

  if (!conn?.roomCode) {
    return sendError(socketId, WS_ERRORS.NOT_IN_ROOM);
  }

  if (!isValidPayload(payload) || !payload[requiredField]) {
    return sendError(socketId, WS_ERRORS.INVALID_MESSAGE);
  }

  const forwardPayload = {
    ...payload,
    peerId: socketId,
  };

  if (payload.targetPeerId) {
    sendToSocket(payload.targetPeerId, eventType, forwardPayload);
    return;
  }

  broadcastToRoom(conn.roomCode, eventType, forwardPayload, socketId);
  logger.debug(`${eventType} forwarded in room ${conn.roomCode}`);
}

/**
 * Handle OFFER — forward SDP offer to the other participant.
 * @param {string} socketId
 * @param {Object} payload
 */
function handleOffer(socketId, payload) {
  if (!isValidPayload(payload) || !payload.sdp?.type || !payload.sdp?.sdp) {
    return sendError(socketId, WS_ERRORS.INVALID_SDP);
  }
  if (payload.sdp.sdp.length > WS_LIMITS.MAX_SDP_LENGTH) {
    return sendError(socketId, WS_ERRORS.INVALID_SDP);
  }
  forwardSignalingMessage(socketId, EVENTS.OFFER, payload, 'sdp');
}

/**
 * Handle ANSWER — forward SDP answer to the other participant.
 * @param {string} socketId
 * @param {Object} payload
 */
function handleAnswer(socketId, payload) {
  if (!isValidPayload(payload) || !payload.sdp?.type || !payload.sdp?.sdp) {
    return sendError(socketId, WS_ERRORS.INVALID_SDP);
  }
  if (payload.sdp.sdp.length > WS_LIMITS.MAX_SDP_LENGTH) {
    return sendError(socketId, WS_ERRORS.INVALID_SDP);
  }
  forwardSignalingMessage(socketId, EVENTS.ANSWER, payload, 'sdp');
}

/**
 * Handle ICE_CANDIDATE — forward ICE candidate to the other participant.
 * @param {string} socketId
 * @param {Object} payload
 */
function handleIceCandidate(socketId, payload) {
  if (!payload?.candidate) {
    return sendError(socketId, WS_ERRORS.INVALID_CANDIDATE);
  }
  forwardSignalingMessage(socketId, EVENTS.ICE_CANDIDATE, payload, 'candidate');
}

/**
 * Broadcast collaboration messages to other participants in the room.
 * @param {string} socketId
 * @param {string} eventType
 * @param {Object} payload
 */
function broadcastCollaboration(socketId, eventType, payload) {
  const conn = connectionManager.getConnection(socketId);

  if (!conn?.roomCode) {
    return sendError(socketId, WS_ERRORS.NOT_IN_ROOM);
  }

  broadcastToRoom(conn.roomCode, eventType, {
    ...payload,
    peerId: socketId,
  }, socketId);
}

/**
 * Handle CHAT_MESSAGE — validate and broadcast to room peers.
 * @param {string} socketId
 * @param {Object} payload
 */
function handleChatMessage(socketId, payload) {
  if (!isValidPayload(payload)) {
    return sendError(socketId, WS_ERRORS.INVALID_MESSAGE);
  }

  const text = typeof payload.text === 'string' ? payload.text.trim() : '';

  if (!text) {
    return sendError(socketId, 'Message cannot be empty');
  }

  if (text.length > WS_LIMITS.MAX_CHAT_MESSAGE_LENGTH) {
    return sendError(socketId, 'Message is too long');
  }

  broadcastCollaboration(socketId, EVENTS.CHAT_MESSAGE, {
    id: randomUUID(),
    text: text.slice(0, WS_LIMITS.MAX_CHAT_MESSAGE_LENGTH),
    timestamp: Date.now(),
  });
}

/**
 * Handle REACTION — validate emoji and broadcast to room peers.
 * @param {string} socketId
 * @param {Object} payload
 */
function handleReaction(socketId, payload) {
  if (!isValidPayload(payload) || typeof payload.emoji !== 'string') {
    return sendError(socketId, WS_ERRORS.INVALID_MESSAGE);
  }

  if (!ALLOWED_REACTIONS.includes(payload.emoji)) {
    return sendError(socketId, 'Unknown reaction');
  }

  broadcastCollaboration(socketId, EVENTS.REACTION, {
    emoji: payload.emoji,
    timestamp: Date.now(),
  });
}

/**
 * Handle CHAT_OPENED — optional presence signal (no-op broadcast).
 * @param {string} socketId
 * @param {Object} payload
 */
function handleChatOpened(socketId, payload) {
  if (!isValidPayload(payload)) {
    return sendError(socketId, WS_ERRORS.INVALID_MESSAGE);
  }

  broadcastCollaboration(socketId, EVENTS.CHAT_OPENED, {
    timestamp: Date.now(),
  });
}

/** @type {Record<string, (socketId: string, payload: Object) => void>} */
const eventHandlers = {
  [EVENTS.JOIN_ROOM]: handleJoinRoom,
  [EVENTS.PONG]: handlePong,
  [EVENTS.OFFER]: handleOffer,
  [EVENTS.ANSWER]: handleAnswer,
  [EVENTS.ICE_CANDIDATE]: handleIceCandidate,
  [EVENTS.CHAT_MESSAGE]: handleChatMessage,
  [EVENTS.REACTION]: handleReaction,
  [EVENTS.CHAT_OPENED]: handleChatOpened,
};

/**
 * Process an incoming WebSocket message.
 * @param {string} socketId
 * @param {string} rawMessage
 */
function handleMessage(socketId, rawMessage) {
  if (typeof rawMessage !== 'string' || rawMessage.length > WS_LIMITS.MAX_MESSAGE_BYTES) {
    logger.warn(`Oversized or invalid message from socket ${socketId.slice(0, 8)}…`);
    return sendError(socketId, WS_ERRORS.INVALID_MESSAGE);
  }

  let parsed;

  try {
    parsed = JSON.parse(rawMessage);
  } catch {
    logger.warn(`Malformed JSON from socket ${socketId.slice(0, 8)}…`);
    return sendError(socketId, WS_ERRORS.INVALID_MESSAGE);
  }

  const { type, payload = {} } = parsed;

  if (!type || typeof type !== 'string') {
    return sendError(socketId, WS_ERRORS.INVALID_MESSAGE);
  }

  if (!isValidPayload(payload)) {
    return sendError(socketId, WS_ERRORS.INVALID_MESSAGE);
  }

  const handler = eventHandlers[type];

  if (!handler) {
    logger.warn(`Unknown event "${type}" from socket ${socketId.slice(0, 8)}…`);
    return sendError(socketId, WS_ERRORS.UNKNOWN_EVENT);
  }

  try {
    handler(socketId, payload);
  } catch (err) {
    logger.error(`Error handling "${type}":`, err.message);
    sendError(socketId, WS_ERRORS.INVALID_MESSAGE);
  }
}

/**
 * Handle socket disconnection — remove from room and notify peers.
 * @param {string} socketId
 */
function handleDisconnect(socketId) {
  const conn = connectionManager.removeConnection(socketId);
  if (!conn || !conn.roomCode) return;

  const { roomCode } = conn;
  const isRoomEmpty = roomSocketManager.removeSocketFromRoom(roomCode, socketId);

  logger.info(`Room Left: ${roomCode} (socket: ${socketId.slice(0, 8)}…)`);

  if (!isRoomEmpty) {
    broadcastToRoom(roomCode, EVENTS.USER_LEFT, {
      roomCode,
      peerId: socketId,
      participants: roomSocketManager.getRoomSocketCount(roomCode),
    });
  } else {
    roomSocketManager.deleteRoom(roomCode);
    logger.debug(`Room Empty: ${roomCode} (removed from socket map)`);
  }
}

module.exports = {
  handleMessage,
  handleDisconnect,
  sendToSocket,
  sendError,
  broadcastToRoom,
};
