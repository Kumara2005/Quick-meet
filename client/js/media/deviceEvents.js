/**
 * QuickMeet — Device Events
 * Event bus for media device lifecycle (Phase 9).
 */

export const DeviceEvents = {
  CAMERA_CHANGED: 'CAMERA_CHANGED',
  MIC_CHANGED: 'MIC_CHANGED',
  DEVICE_CONNECTED: 'DEVICE_CONNECTED',
  DEVICE_DISCONNECTED: 'DEVICE_DISCONNECTED',
  PERMISSION_CHANGED: 'PERMISSION_CHANGED',
  SETTINGS_APPLIED: 'SETTINGS_APPLIED',
  DEVICES_UPDATED: 'DEVICES_UPDATED',
};

/** @type {Map<string, Set<Function>>} */
const listeners = new Map();

export function on(event, handler) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(handler);
}

export function off(event, handler) {
  listeners.get(event)?.delete(handler);
}

export function dispatch(event, detail = {}) {
  const handlers = listeners.get(event);
  if (!handlers) return;
  for (const handler of handlers) handler(detail);
}
