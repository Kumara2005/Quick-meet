/**
 * QuickMeet — Server Logger
 * Configurable log levels for development vs production.
 */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3, silent: 4 };

const envLevel = (process.env.LOG_LEVEL || '').toLowerCase();
const defaultLevel = process.env.NODE_ENV === 'production' ? 'warn' : 'debug';
const currentLevel = LEVELS[envLevel] !== undefined ? envLevel : defaultLevel;

/**
 * @param {string} level
 * @returns {boolean}
 */
function shouldLog(level) {
  return LEVELS[level] >= LEVELS[currentLevel];
}

const logger = {
  debug: (...args) => {
    if (shouldLog('debug')) console.log('[QuickMeet]', ...args);
  },
  info: (...args) => {
    if (shouldLog('info')) console.log('[QuickMeet]', ...args);
  },
  warn: (...args) => {
    if (shouldLog('warn')) console.warn('[QuickMeet]', ...args);
  },
  error: (...args) => {
    if (shouldLog('error')) console.error('[QuickMeet]', ...args);
  },
};

module.exports = logger;
