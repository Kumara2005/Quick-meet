/**
 * QuickMeet — Control Events
 * Centralized event bus for in-call control actions.
 */

export const ControlEvents = {
  AUDIO_MUTED: 'AUDIO_MUTED',
  AUDIO_UNMUTED: 'AUDIO_UNMUTED',
  VIDEO_DISABLED: 'VIDEO_DISABLED',
  VIDEO_ENABLED: 'VIDEO_ENABLED',
  CALL_ENDING: 'CALL_ENDING',
  CALL_ENDED: 'CALL_ENDED',
  PEER_DISCONNECTED: 'PEER_DISCONNECTED',
  // Future
  SCREEN_SHARE_STARTED: 'SCREEN_SHARE_STARTED',
  SCREEN_SHARE_STOPPED: 'SCREEN_SHARE_STOPPED',
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
