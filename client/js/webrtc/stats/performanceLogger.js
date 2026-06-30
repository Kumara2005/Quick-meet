/**
 * QuickMeet — Performance Logger
 * Logs connection events and performance warnings (configurable verbosity).
 */

import { logger } from '../../utils/logger.js';

/** @type {number|null} */
let callStartTime = null;

/** @type {string|null} */
let lastLevel = null;

/**
 * Mark the start of a monitored call session.
 */
export function logConnectionStarted() {
  callStartTime = Date.now();
  lastLevel = null;
  logger.debug('Connection monitoring started');
}

/**
 * Log ICE connected event.
 */
export function logIceConnected() {
  logger.debug('ICE connected');
}

/**
 * Log ICE failure.
 */
export function logIceFailed() {
  logger.warn('ICE connection failed');
}

/**
 * Log health level change.
 * @param {{ level: string, label: string, score: number }} health
 */
export function logHealthChange(health) {
  if (health.level === lastLevel) return;

  const prev = lastLevel;
  lastLevel = health.level;

  logger.info(`Network quality: ${health.label} (score ${health.score})`);

  if (prev && prev !== 'disconnected' && health.level === 'disconnected') {
    logger.warn('Connection lost');
  }

  if (prev === 'disconnected' && health.level !== 'disconnected') {
    logger.info('Connection recovered');
  }

  if (['poor', 'critical'].includes(health.level)) {
    logger.warn(`Degraded connection: ${health.label}`);
  }
}

/**
 * Log packet loss spike.
 * @param {number} packetLossPercent
 */
export function logPacketLossSpike(packetLossPercent) {
  logger.warn(`Packet loss spike: ${packetLossPercent}%`);
}

/**
 * Log bitrate drop.
 * @param {number|null} bitrate
 */
export function logBitrateDrop(bitrate) {
  logger.warn(`Low outgoing bitrate: ${bitrate ?? 0} bps`);
}

/**
 * Log call end with duration.
 */
export function logCallEnded() {
  if (callStartTime) {
    const durationSec = Math.round((Date.now() - callStartTime) / 1000);
    logger.info(`Call ended — duration ${durationSec}s`);
  } else {
    logger.debug('Connection monitoring stopped');
  }

  callStartTime = null;
  lastLevel = null;
}

/**
 * Log getStats failure.
 * @param {Error} error
 */
export function logStatsError(error) {
  logger.warn('getStats failed:', error.message);
}
