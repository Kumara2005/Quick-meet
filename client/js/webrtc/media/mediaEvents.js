/**
 * QuickMeet — Media Events
 * Lightweight event bus for decoupled media state notifications.
 */

export const MediaEvents = {
  MEDIA_STARTED: 'MEDIA_STARTED',
  MEDIA_STOPPED: 'MEDIA_STOPPED',
  PERMISSION_GRANTED: 'PERMISSION_GRANTED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  DEVICE_CHANGED: 'DEVICE_CHANGED',
};

/** @type {Map<string, Set<Function>>} */
const listeners = new Map();

/**
 * Subscribe to a media event.
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
 * Unsubscribe from a media event.
 * @param {string} event
 * @param {Function} handler
 */
export function off(event, handler) {
  listeners.get(event)?.delete(handler);
}

/**
 * Dispatch a media event with optional detail payload.
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
