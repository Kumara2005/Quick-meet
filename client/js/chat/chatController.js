/**
 * QuickMeet — Chat Controller
 * Sends/receives chat messages via WebSocket. No DOM logic.
 */

import * as socket from '../socket/socket.js';
import { SocketEvents, AppConfig } from '../config/appConfig.js';
import { ChatEvents, dispatch } from './chatEvents.js';
import * as chatState from './chatState.js';
import * as appState from '../core/appState.js';
import { logger } from '../utils/logger.js';

/** @type {boolean} */
let socketHandlersRegistered = false;

/** @type {(() => string|null)|null} */
let getSelfPeerId = null;

/**
 * @param {{ getSelfPeerId: () => string|null }} options
 */
export function init(options) {
  getSelfPeerId = options.getSelfPeerId;

  if (!socketHandlersRegistered) {
    socketHandlersRegistered = true;
    socket.on(SocketEvents.CHAT_MESSAGE, handleIncomingMessage);
  }
}

/**
 * @param {string} rawText
 * @returns {boolean}
 */
export function sendMessage(rawText) {
  const text = rawText.trim();

  if (!text) {
    dispatch(ChatEvents.SEND_FAILED, { reason: 'empty' });
    return false;
  }

  if (text.length > AppConfig.CHAT_MAX_LENGTH) {
    dispatch(ChatEvents.SEND_FAILED, { reason: 'too-long' });
    return false;
  }

  if (!socket.isConnected()) {
    dispatch(ChatEvents.SEND_FAILED, { reason: 'disconnected' });
    return false;
  }

  const selfPeerId = getSelfPeerId?.() || 'local';
  const message = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    peerId: selfPeerId,
    text,
    timestamp: Date.now(),
    isOwn: true,
  };

  chatState.addMessage(message);
  dispatch(ChatEvents.MESSAGE_SENT, message);

  try {
    socket.send(SocketEvents.CHAT_MESSAGE, { text });
  } catch (err) {
    logger.warn('[ChatController] Send failed:', err.message);
    dispatch(ChatEvents.SEND_FAILED, { reason: 'send-failed' });
    return false;
  }

  return true;
}

/**
 * @param {Object} payload
 */
function handleIncomingMessage(payload) {
  if (!payload?.text || typeof payload.text !== 'string') return;

  const selfPeerId = getSelfPeerId?.();
  const peerId = payload.peerId || 'remote';

  if (selfPeerId && peerId === selfPeerId) return;

  const message = {
    id: payload.id || `remote-${Date.now()}`,
    peerId,
    text: payload.text.trim(),
    timestamp: payload.timestamp || Date.now(),
    isOwn: false,
  };

  chatState.addMessage(message);

  if (!chatState.isChatOpen()) {
    appState.incrementUnreadCount();
  }

  dispatch(ChatEvents.MESSAGE_RECEIVED, message);
}

/**
 * Remove socket listeners.
 */
export function destroy() {
  if (socketHandlersRegistered) {
    socket.off(SocketEvents.CHAT_MESSAGE, handleIncomingMessage);
    socketHandlersRegistered = false;
  }
  getSelfPeerId = null;
}
