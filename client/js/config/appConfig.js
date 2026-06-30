/**
 * QuickMeet — Client Application Configuration
 * Centralized constants (Phase 10).
 */

/** @type {boolean} */
const isDev =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.search.includes('debug=true'));

export const AppConfig = {
  /** Enable verbose client logging */
  LOG_LEVEL: isDev ? 'debug' : 'warn',

  /** Stats polling interval (ms) */
  STATS_POLL_INTERVAL_MS: 2000,

  /** UI notification display duration (ms) */
  NOTIFICATION_DURATION_MS: 4000,
  NOTIFICATION_FADE_MS: 300,

  /** Redirect delay when room code missing (ms) */
  ROOM_REDIRECT_DELAY_MS: 2000,

  /** Default video constraints */
  VIDEO: {
    WIDTH_IDEAL: 1280,
    HEIGHT_IDEAL: 720,
    FRAME_RATE_IDEAL: 30,
  },

  /** WebRTC ICE servers (STUN only — add TURN in production if needed) */
  ICE_SERVERS: [
    { urls: 'stun:stun.l.google.com:19302' },
  ],

  /** Health score level thresholds */
  HEALTH_THRESHOLDS: {
    EXCELLENT: 90,
    GOOD: 75,
    FAIR: 50,
    POOR: 25,
  },

  /** Health metric weights */
  HEALTH_WEIGHTS: {
    PACKET_LOSS: 0.35,
    RTT: 0.25,
    JITTER: 0.20,
    BITRATE: 0.10,
    FPS: 0.10,
  },

  /** Network anomaly detection */
  NETWORK: {
    PACKET_LOSS_SPIKE_MIN: 5,
    PACKET_LOSS_SPIKE_DELTA: 3,
    BITRATE_DROP_RATIO: 0.5,
    BITRATE_DROP_MIN_BPS: 300_000,
  },

  /** localStorage key for preferred devices */
  PREFERRED_DEVICES_KEY: 'quickmeet.preferredDevices',

  /** Room code pattern (must match server) */
  ROOM_CODE_PATTERN: /^[A-Z]{3}-\d{3}$/,
};

export const SocketEvents = {
  JOIN_ROOM: 'JOIN_ROOM',
  ROOM_WAITING: 'ROOM_WAITING',
  ROOM_READY: 'ROOM_READY',
  USER_JOINED: 'USER_JOINED',
  USER_LEFT: 'USER_LEFT',
  ERROR: 'ERROR',
  PING: 'PING',
  PONG: 'PONG',
  OFFER: 'OFFER',
  ANSWER: 'ANSWER',
  ICE_CANDIDATE: 'ICE_CANDIDATE',
};
