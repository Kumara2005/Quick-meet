/**
 * QuickMeet — Client Logger
 * Configurable logging; quiet in production.
 */

import { AppConfig } from '../config/appConfig.js';

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3, silent: 4 };

const currentLevel = AppConfig.LOG_LEVEL in LEVELS ? AppConfig.LOG_LEVEL : 'warn';

/**
 * @param {string} level
 * @returns {boolean}
 */
function shouldLog(level) {
  return LEVELS[level] >= LEVELS[currentLevel];
}

export const logger = {
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
