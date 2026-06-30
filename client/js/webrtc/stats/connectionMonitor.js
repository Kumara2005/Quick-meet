/**
 * QuickMeet — Connection Monitor
 * Orchestrates stats collection, parsing, health calculation, and UI updates.
 */

import { startCollecting, stopCollecting } from './statsCollector.js';
import {
  init as initNetworkMonitor,
  attachStateListeners,
  detachStateListeners,
  setPeerConnection,
  processStatsReport,
  resetMonitor,
} from './networkMonitor.js';
import * as performanceLogger from './performanceLogger.js';
import * as qualityBadge from './qualityBadge.js';

/** @type {RTCPeerConnection|null} */
let monitoredPeer = null;

/** @type {boolean} */
let isMonitoring = false;

/**
 * Initialize the connection monitor with UI bindings.
 * @param {Object} badgeElements - DOM elements for qualityBadge.bindElements
 */
export function init(badgeElements) {
  qualityBadge.bindElements(badgeElements);

  initNetworkMonitor({
    onHealthUpdate: (health) => {
      qualityBadge.updateBadge(health);
    },
  });
}

/**
 * Start monitoring a peer connection.
 * @param {RTCPeerConnection} pc
 */
export function startMonitoring(pc) {
  if (isMonitoring) {
    stopMonitoring();
  }

  if (!pc) return;

  monitoredPeer = pc;
  isMonitoring = true;

  setPeerConnection(pc);
  attachStateListeners(pc);
  performanceLogger.logConnectionStarted();

  qualityBadge.updateBadge({
    score: 50,
    level: 'fair',
    label: 'Connecting',
    emoji: '🟡',
    metrics: null,
  });

  startCollecting(pc, (report, error) => {
    processStatsReport(report, error);
  });
}

/**
 * Stop monitoring and reset UI.
 */
export function stopMonitoring() {
  stopCollecting();
  detachStateListeners(monitoredPeer);
  performanceLogger.logCallEnded();
  resetMonitor();

  monitoredPeer = null;
  isMonitoring = false;

  qualityBadge.hideBadge();
}

/**
 * @returns {boolean}
 */
export function isActive() {
  return isMonitoring;
}
