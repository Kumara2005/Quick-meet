/**
 * QuickMeet — Peer Connection Events
 * Event bus for WebRTC peer connection state notifications.
 */

export const PeerEvents = {
  PEER_CONNECTED: 'PEER_CONNECTED',
  PEER_DISCONNECTED: 'PEER_DISCONNECTED',
  REMOTE_STREAM_READY: 'REMOTE_STREAM_READY',
  NEGOTIATION_STARTED: 'NEGOTIATION_STARTED',
  NEGOTIATION_COMPLETED: 'NEGOTIATION_COMPLETED',
  ICE_CONNECTED: 'ICE_CONNECTED',
  ICE_FAILED: 'ICE_FAILED',
};

/** @type {Map<string, Set<Function>>} */
const listeners = new Map();

/**
 * @param {string} event
 * @param {Function} handler
 */
export function on(event, handler) {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event).add(handler);
}

/**
 * @param {string} event
 * @param {Function} handler
 */
export function off(event, handler) {
  listeners.get(event)?.delete(handler);
}

/**
 * @param {string} event
 * @param {Object} [detail={}]
 */
export function dispatch(event, detail = {}) {
  const handlers = listeners.get(event);
  if (!handlers) return;

  for (const handler of handlers) {
    handler(detail);
  }
}
