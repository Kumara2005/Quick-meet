/**
 * QuickMeet — Screen Share Events
 * Centralized event bus for screen sharing lifecycle.
 */

export const ScreenEvents = {
  SCREEN_SHARE_STARTED: 'SCREEN_SHARE_STARTED',
  SCREEN_SHARE_STOPPED: 'SCREEN_SHARE_STOPPED',
  SCREEN_SHARE_FAILED: 'SCREEN_SHARE_FAILED',
  SCREEN_TRACK_REPLACED: 'SCREEN_TRACK_REPLACED',
  CAMERA_TRACK_RESTORED: 'CAMERA_TRACK_RESTORED',
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
