/**
 * QuickMeet — Reaction Controller
 * Sends and receives emoji reactions via WebSocket.
 */

import * as socket from '../socket/socket.js';
import { SocketEvents, AppConfig } from '../config/appConfig.js';
import { ReactionEvents, dispatch } from './reactionEvents.js';
import * as appState from '../core/appState.js';
import { logger } from '../utils/logger.js';

/** @type {boolean} */
let socketHandlersRegistered = false;

/** @type {(() => string|null)|null} */
let getSelfPeerId = null;

/** @type {((detail: Object) => void)|null} */
let onReactionVisual = null;

/**
 * @param {{
 *   getSelfPeerId: () => string|null,
 *   onReactionVisual: (detail: { emoji: string, peerId: string, isOwn: boolean }) => void,
 * }} options
 */
export function init(options) {
  getSelfPeerId = options.getSelfPeerId;
  onReactionVisual = options.onReactionVisual;

  if (!socketHandlersRegistered) {
    socketHandlersRegistered = true;
    socket.on(SocketEvents.REACTION, handleIncomingReaction);
  }
}

/**
 * @param {string} emoji
 * @returns {boolean}
 */
export function sendReaction(emoji) {
  if (!AppConfig.ALLOWED_REACTIONS.includes(emoji)) {
    dispatch(ReactionEvents.SEND_FAILED, { reason: 'unknown' });
    return false;
  }

  if (!socket.isConnected()) {
    dispatch(ReactionEvents.SEND_FAILED, { reason: 'disconnected' });
    return false;
  }

  const selfPeerId = getSelfPeerId?.() || 'local';
  const detail = {
    emoji,
    peerId: selfPeerId,
    timestamp: Date.now(),
    isOwn: true,
  };

  appState.setLastReaction(detail);
  onReactionVisual?.(detail);
  dispatch(ReactionEvents.SENT, detail);

  try {
    socket.send(SocketEvents.REACTION, { emoji });
  } catch (err) {
    logger.warn('[ReactionController] Send failed:', err.message);
    dispatch(ReactionEvents.SEND_FAILED, { reason: 'send-failed' });
    return false;
  }

  return true;
}

/**
 * @param {Object} payload
 */
function handleIncomingReaction(payload) {
  if (!payload?.emoji || typeof payload.emoji !== 'string') return;

  if (!AppConfig.ALLOWED_REACTIONS.includes(payload.emoji)) return;

  const selfPeerId = getSelfPeerId?.();
  const peerId = payload.peerId || 'remote';

  if (selfPeerId && peerId === selfPeerId) return;

  const detail = {
    emoji: payload.emoji,
    peerId,
    timestamp: payload.timestamp || Date.now(),
    isOwn: false,
  };

  appState.setLastReaction(detail);
  onReactionVisual?.(detail);
  dispatch(ReactionEvents.RECEIVED, detail);
}

export function destroy() {
  if (socketHandlersRegistered) {
    socket.off(SocketEvents.REACTION, handleIncomingReaction);
    socketHandlersRegistered = false;
  }
  getSelfPeerId = null;
  onReactionVisual = null;
}
