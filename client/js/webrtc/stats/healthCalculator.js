/**
 * QuickMeet — Health Calculator
 * Computes a 0–100 network health score from connection metrics.
 */

import { AppConfig } from '../../config/appConfig.js';

const { HEALTH_THRESHOLDS: T, HEALTH_WEIGHTS: W } = AppConfig;

export const HealthLevel = {
  EXCELLENT: 'excellent',
  GOOD: 'good',
  FAIR: 'fair',
  POOR: 'poor',
  CRITICAL: 'critical',
  DISCONNECTED: 'disconnected',
};

/**
 * Score packet loss (35% weight). Lower loss = higher score.
 * @param {number} packetLossPercent
 * @returns {number}
 */
function scorePacketLoss(packetLossPercent) {
  if (packetLossPercent <= 0.5) return 100;
  if (packetLossPercent <= 1) return 95;
  if (packetLossPercent <= 2) return 85;
  if (packetLossPercent <= 5) return 65;
  if (packetLossPercent <= 10) return 40;
  if (packetLossPercent <= 20) return 20;
  return 5;
}

/**
 * Score RTT in ms (25% weight).
 * @param {number|null} rtt
 * @returns {number}
 */
function scoreRtt(rtt) {
  if (rtt == null) return 75;
  if (rtt < 50) return 100;
  if (rtt < 100) return 90;
  if (rtt < 150) return 80;
  if (rtt < 250) return 65;
  if (rtt < 400) return 45;
  if (rtt < 600) return 25;
  return 10;
}

/**
 * Score jitter in ms (20% weight).
 * @param {number|null} jitter
 * @returns {number}
 */
function scoreJitter(jitter) {
  if (jitter == null) return 75;
  if (jitter < 10) return 100;
  if (jitter < 20) return 90;
  if (jitter < 40) return 75;
  if (jitter < 80) return 55;
  if (jitter < 150) return 30;
  return 10;
}

/**
 * Score available outgoing bitrate (10% weight).
 * @param {number|null} bitrate
 * @returns {number}
 */
function scoreBitrate(bitrate) {
  if (bitrate == null) return 70;
  if (bitrate >= 2_500_000) return 100;
  if (bitrate >= 1_000_000) return 85;
  if (bitrate >= 500_000) return 70;
  if (bitrate >= 250_000) return 50;
  if (bitrate >= 100_000) return 30;
  return 15;
}

/**
 * Score frames per second (10% weight).
 * @param {number|null} fps
 * @returns {number}
 */
function scoreFps(fps) {
  if (fps == null) return 70;
  if (fps >= 28) return 100;
  if (fps >= 24) return 90;
  if (fps >= 18) return 75;
  if (fps >= 12) return 55;
  if (fps >= 5) return 30;
  return 10;
}

/**
 * Map numeric score to health level.
 * @param {number} score
 * @returns {string}
 */
export function scoreToLevel(score) {
  if (score >= T.EXCELLENT) return HealthLevel.EXCELLENT;
  if (score >= T.GOOD) return HealthLevel.GOOD;
  if (score >= T.FAIR) return HealthLevel.FAIR;
  if (score >= T.POOR) return HealthLevel.POOR;
  return HealthLevel.CRITICAL;
}

/**
 * Human-readable label for a health level.
 * @param {string} level
 * @returns {string}
 */
export function levelToLabel(level) {
  const labels = {
    excellent: 'Excellent',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
    critical: 'Critical',
    disconnected: 'Disconnected',
  };
  return labels[level] || 'Unknown';
}

/**
 * Emoji indicator for a health level.
 * @param {string} level
 * @returns {string}
 */
export function levelToEmoji(level) {
  const emojis = {
    excellent: '🟢',
    good: '🟢',
    fair: '🟡',
    poor: '🟠',
    critical: '🔴',
    disconnected: '⚫',
  };
  return emojis[level] || '⚫';
}

/**
 * Calculate overall network health from metrics and connection state.
 * @param {import('./statsParser.js').ConnectionMetrics|null} metrics
 * @param {string} connectionState
 * @param {string} [iceConnectionState]
 * @returns {{ score: number, level: string, label: string, emoji: string, metrics: import('./statsParser.js').ConnectionMetrics|null }}
 */
export function calculateHealth(metrics, connectionState, iceConnectionState = '') {
  const isDisconnected =
    connectionState === 'disconnected' ||
    connectionState === 'closed' ||
    connectionState === 'failed' ||
    iceConnectionState === 'disconnected' ||
    iceConnectionState === 'failed' ||
    iceConnectionState === 'closed';

  if (isDisconnected) {
    return {
      score: 0,
      level: HealthLevel.DISCONNECTED,
      label: levelToLabel(HealthLevel.DISCONNECTED),
      emoji: levelToEmoji(HealthLevel.DISCONNECTED),
      metrics,
    };
  }

  if (!metrics) {
    return {
      score: 50,
      level: HealthLevel.FAIR,
      label: levelToLabel(HealthLevel.FAIR),
      emoji: levelToEmoji(HealthLevel.FAIR),
      metrics: null,
    };
  }

  const packetLossScore = scorePacketLoss(metrics.packetLossPercent ?? 0);
  const rttScore = scoreRtt(metrics.rtt);
  const jitterScore = scoreJitter(metrics.jitter);
  const bitrateScore = scoreBitrate(metrics.availableOutgoingBitrate);
  const fpsScore = scoreFps(metrics.framesPerSecond);

  const score = Math.round(
    packetLossScore * W.PACKET_LOSS +
    rttScore * W.RTT +
    jitterScore * W.JITTER +
    bitrateScore * W.BITRATE +
    fpsScore * W.FPS
  );

  const level = scoreToLevel(score);

  return {
    score,
    level,
    label: levelToLabel(level),
    emoji: levelToEmoji(level),
    metrics,
  };
}

// Thresholds and weights: client/js/config/appConfig.js
