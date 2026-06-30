/**
 * QuickMeet — Quality Badge
 * UI-only updates for the connection health badge. No calculations.
 */

import { formatBitrate } from './statsParser.js';

/** @type {HTMLElement|null} */
let badgeEl = null;

/** @type {HTMLElement|null} */
let dotEl = null;

/** @type {HTMLElement|null} */
let labelEl = null;

/** @type {HTMLElement|null} */
let latencyEl = null;

/** @type {HTMLElement|null} */
let lossEl = null;

/** @type {HTMLElement|null} */
let detailsEl = null;

/**
 * Bind DOM elements for the health badge.
 * @param {Object} elements
 */
export function bindElements(elements) {
  badgeEl = elements.badge || null;
  dotEl = elements.dot || null;
  labelEl = elements.label || null;
  latencyEl = elements.latency || null;
  lossEl = elements.loss || null;
  detailsEl = elements.details || null;
}

/**
 * Update the health badge display.
 * @param {Object} health
 */
export function updateBadge(health) {
  if (!badgeEl) return;

  const { level, label, emoji, score, metrics } = health;

  badgeEl.hidden = false;
  badgeEl.className = `health-badge health-badge--${level}`;
  badgeEl.setAttribute('data-level', level);

  if (dotEl) {
    dotEl.textContent = emoji || '⚫';
    dotEl.setAttribute('aria-hidden', 'true');
  }

  if (labelEl) {
    labelEl.textContent = label;
  }

  const rtt = metrics?.rtt != null ? `${metrics.rtt} ms` : '—';
  const loss = metrics?.packetLossPercent != null ? `${metrics.packetLossPercent}%` : '—';

  if (latencyEl) {
    latencyEl.textContent = rtt;
  }

  if (lossEl) {
    lossEl.textContent = loss;
  }

  const tooltip = buildTooltip(health, rtt, loss);
  badgeEl.setAttribute('title', tooltip);
  badgeEl.setAttribute('aria-label', `Connection quality: ${label}. Latency ${rtt}. Packet loss ${loss}. Score ${score}.`);

  if (detailsEl && metrics) {
    detailsEl.innerHTML = buildDetailsHtml(health, metrics);
  }
}

/**
 * Hide the health badge.
 */
export function hideBadge() {
  if (badgeEl) {
    badgeEl.hidden = true;
    badgeEl.className = 'health-badge health-badge--hidden';
  }
}

/**
 * @param {Object} health
 * @param {string} rtt
 * @param {string} loss
 * @returns {string}
 */
function buildTooltip(health, rtt, loss) {
  return `${health.label} · Score ${health.score}/100 · RTT ${rtt} · Loss ${loss}`;
}

/**
 * @param {Object} health
 * @param {Object} metrics
 * @returns {string}
 */
function buildDetailsHtml(health, metrics) {
  const fps = metrics.framesPerSecond != null ? `${Math.round(metrics.framesPerSecond)} fps` : '—';
  const res = metrics.frameWidth && metrics.frameHeight
    ? `${metrics.frameWidth}×${metrics.frameHeight}`
    : '—';
  const candidate = metrics.candidateType || '—';
  const transport = metrics.transportProtocol || '—';
  const duration = metrics.connectionDuration != null ? `${metrics.connectionDuration}s` : '—';
  const outBitrate = formatBitrate(metrics.availableOutgoingBitrate);
  const inBitrate = formatBitrate(metrics.availableIncomingBitrate);

  return `
    <dl class="health-badge__details-list">
      <div><dt>Score</dt><dd>${health.score}/100</dd></div>
      <div><dt>Duration</dt><dd>${duration}</dd></div>
      <div><dt>RTT</dt><dd>${metrics.rtt ?? '—'} ms</dd></div>
      <div><dt>Jitter</dt><dd>${metrics.jitter ?? '—'} ms</dd></div>
      <div><dt>Packet loss</dt><dd>${metrics.packetLossPercent ?? 0}%</dd></div>
      <div><dt>Frame rate</dt><dd>${fps}</dd></div>
      <div><dt>Resolution</dt><dd>${res}</dd></div>
      <div><dt>Out bitrate</dt><dd>${outBitrate}</dd></div>
      <div><dt>In bitrate</dt><dd>${inBitrate}</dd></div>
      <div><dt>Candidate</dt><dd>${candidate}</dd></div>
      <div><dt>Transport</dt><dd>${transport}</dd></div>
    </dl>
  `;
}
