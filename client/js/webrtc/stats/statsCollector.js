/**
 * QuickMeet — Stats Collector
 * Polls RTCPeerConnection.getStats() on a fixed interval.
 */

import { AppConfig } from '../../config/appConfig.js';

const POLL_INTERVAL_MS = AppConfig.STATS_POLL_INTERVAL_MS;

/** @type {number|null} */
let pollTimer = null;

/** @type {RTCPeerConnection|null} */
let activePeer = null;

/**
 * Start polling getStats() every 2 seconds.
 * @param {RTCPeerConnection} pc
 * @param {(report: RTCStatsReport|null, error?: Error) => void} onReport
 */
export function startCollecting(pc, onReport) {
  stopCollecting();

  if (!pc || typeof pc.getStats !== 'function') {
    onReport(null, new Error('getStats is not supported'));
    return;
  }

  activePeer = pc;

  const poll = async () => {
    if (!activePeer || activePeer.connectionState === 'closed') {
      stopCollecting();
      return;
    }

    try {
      const report = await activePeer.getStats();
      onReport(report);
    } catch (err) {
      onReport(null, err);
    }
  };

  poll();
  pollTimer = window.setInterval(poll, POLL_INTERVAL_MS);
}

/**
 * Stop stats polling.
 */
export function stopCollecting() {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  activePeer = null;
}

export { POLL_INTERVAL_MS };
