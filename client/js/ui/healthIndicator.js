/**
 * QuickMeet — Health Indicator UI
 * Mounts and manages the connection health badge in the room view.
 */

import * as connectionMonitor from '../webrtc/stats/connectionMonitor.js';
import { StatsEvents, on as onStatsEvent } from '../webrtc/stats/statsEvents.js';

/** @type {HTMLElement|null} */
let rootEl = null;

/** @type {boolean} */
let detailsExpanded = false;

/**
 * Initialize the health indicator and bind DOM elements.
 */
export function init() {
  rootEl = document.getElementById('health-badge');

  connectionMonitor.init({
    badge: rootEl,
    dot: document.getElementById('health-badge-dot'),
    label: document.getElementById('health-badge-label'),
    latency: document.getElementById('health-badge-latency'),
    loss: document.getElementById('health-badge-loss'),
    details: document.getElementById('health-badge-details'),
  });

  const toggleBtn = document.getElementById('health-badge-toggle');
  toggleBtn?.addEventListener('click', toggleDetails);
  toggleBtn?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleDetails();
    }
  });

  onStatsEvent(StatsEvents.STATS_UPDATED, () => {
    if (rootEl && !rootEl.hidden) {
      rootEl.setAttribute('aria-live', 'polite');
    }
  });
}

/**
 * Start monitoring the given peer connection.
 * @param {RTCPeerConnection} pc
 */
export function start(pc) {
  connectionMonitor.startMonitoring(pc);
}

/**
 * Stop monitoring and hide the badge.
 */
export function stop() {
  connectionMonitor.stopMonitoring();
  detailsExpanded = false;
  document.getElementById('health-badge-details')?.setAttribute('hidden', '');
}

/**
 * Toggle expanded network details panel.
 */
function toggleDetails() {
  const details = document.getElementById('health-badge-details');
  if (!details) return;

  detailsExpanded = !detailsExpanded;
  details.hidden = !detailsExpanded;

  const toggleBtn = document.getElementById('health-badge-toggle');
  toggleBtn?.setAttribute('aria-expanded', String(detailsExpanded));
}

/**
 * @returns {boolean}
 */
export function isMonitoring() {
  return connectionMonitor.isActive();
}
