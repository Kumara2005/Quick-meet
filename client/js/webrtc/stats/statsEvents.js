/**
 * QuickMeet — Stats Events
 * Event bus for network quality and connection health notifications.
 */

export const StatsEvents = {
  NETWORK_EXCELLENT: 'NETWORK_EXCELLENT',
  NETWORK_GOOD: 'NETWORK_GOOD',
  NETWORK_FAIR: 'NETWORK_FAIR',
  NETWORK_POOR: 'NETWORK_POOR',
  NETWORK_CRITICAL: 'NETWORK_CRITICAL',
  NETWORK_DISCONNECTED: 'NETWORK_DISCONNECTED',
  NETWORK_RECOVERED: 'NETWORK_RECOVERED',
  STATS_UPDATED: 'STATS_UPDATED',
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

/**
 * Map health level to stats event name.
 * @param {string} level
 * @returns {string|null}
 */
export function levelToEvent(level) {
  const map = {
    excellent: StatsEvents.NETWORK_EXCELLENT,
    good: StatsEvents.NETWORK_GOOD,
    fair: StatsEvents.NETWORK_FAIR,
    poor: StatsEvents.NETWORK_POOR,
    critical: StatsEvents.NETWORK_CRITICAL,
    disconnected: StatsEvents.NETWORK_DISCONNECTED,
  };
  return map[level] || null;
}
