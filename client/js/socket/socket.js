/**
 * QuickMeet — WebSocket Client
 * Event-driven socket wrapper. No business logic.
 */

import { SocketEvents } from '../config/appConfig.js';
import { logger } from '../utils/logger.js';

const EVENTS = SocketEvents;

/** @type {WebSocket|null} */
let ws = null;

/** @type {Map<string, Set<Function>>} */
const listeners = new Map();

/** @type {string|null} */
let socketUrl = null;

/**
 * Get the WebSocket URL for the current host.
 * @returns {string}
 */
function getDefaultUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}`;
}

/**
 * Dispatch an event to all registered listeners.
 * @param {string} type
 * @param {Object} payload
 */
function emit(type, payload) {
  const handlers = listeners.get(type);
  if (!handlers) return;

  for (const handler of handlers) {
    handler(payload);
  }
}

/**
 * Handle incoming WebSocket messages.
 * @param {MessageEvent} event
 */
function handleMessage(event) {
  let parsed;

  try {
    parsed = JSON.parse(event.data);
  } catch {
    emit('ERROR', { message: 'Invalid message from server' });
    return;
  }

  const { type, payload = {} } = parsed;

  if (typeof type !== 'string') {
    emit('ERROR', { message: 'Invalid message from server' });
    return;
  }

  if (type === EVENTS.PING) {
    send(EVENTS.PONG);
    return;
  }

  emit(type, payload);
}

/**
 * Connect to the WebSocket server.
 * @param {string} [url] - WebSocket URL (defaults to current host)
 * @returns {Promise<void>}
 */
export function connect(url) {
  return new Promise((resolve, reject) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      resolve();
      return;
    }

    socketUrl = url || getDefaultUrl();
    ws = new WebSocket(socketUrl);

    ws.addEventListener('open', () => {
      resolve();
    });

    ws.addEventListener('message', handleMessage);

    ws.addEventListener('close', () => {
      emit('disconnected', {});
    });

    ws.addEventListener('error', () => {
      reject(new Error('WebSocket connection failed'));
    });
  });
}

/**
 * Disconnect from the WebSocket server and release listeners.
 */
export function disconnect() {
  if (!ws) return;

  ws.removeEventListener('message', handleMessage);
  ws.close();
  ws = null;
  listeners.clear();
}

/**
 * Remove all registered event listeners without closing the socket.
 */
export function removeAllListeners() {
  listeners.clear();
}

/**
 * Send a typed message to the server.
 * @param {string} type
 * @param {Object} [payload={}]
 */
export function send(type, payload = {}) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    logger.warn('Cannot send — not connected');
    return;
  }

  ws.send(JSON.stringify({ type, payload }));
}

/**
 * Register an event listener.
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
 * Remove an event listener.
 * @param {string} event
 * @param {Function} handler
 */
export function off(event, handler) {
  const handlers = listeners.get(event);
  if (handlers) {
    handlers.delete(handler);
  }
}

/**
 * Check if the socket is currently connected.
 * @returns {boolean}
 */
export function isConnected() {
  return ws !== null && ws.readyState === WebSocket.OPEN;
}

export { EVENTS as SocketEvents };
