/**
 * QuickMeet — Generic Event Bus
 * Reusable pub/sub primitive for application and domain events.
 */

/**
 * Create an isolated event bus instance.
 * @returns {{ on: Function, off: Function, once: Function, dispatch: Function, clear: Function }}
 */
export function createEventBus() {
  /** @type {Map<string, Set<Function>>} */
  const listeners = new Map();

  /**
   * @param {string} event
   * @param {Function} handler
   */
  function on(event, handler) {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event).add(handler);
  }

  /**
   * @param {string} event
   * @param {Function} handler
   */
  function off(event, handler) {
    listeners.get(event)?.delete(handler);
  }

  /**
   * @param {string} event
   * @param {Function} handler
   */
  function once(event, handler) {
    const wrapper = (detail) => {
      off(event, wrapper);
      handler(detail);
    };
    on(event, wrapper);
  }

  /**
   * @param {string} event
   * @param {Object} [detail={}]
   */
  function dispatch(event, detail = {}) {
    const handlers = listeners.get(event);
    if (!handlers) return;

    for (const handler of handlers) {
      handler(detail);
    }
  }

  function clear() {
    listeners.clear();
  }

  return { on, off, once, dispatch, clear };
}
