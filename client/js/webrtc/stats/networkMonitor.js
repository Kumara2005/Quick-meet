/**
 * QuickMeet — Network Monitor
 * Tracks connection/ICE/signaling state and processes stats reports.
 */

import { parseStatsReport } from './statsParser.js';
import { calculateHealth } from './healthCalculator.js';
import { StatsEvents, dispatch, levelToEvent } from './statsEvents.js';
import { AppConfig } from '../../config/appConfig.js';
import * as performanceLogger from './performanceLogger.js';

/** @type {RTCPeerConnection|null} */
let peerConnection = null;

/** @type {string|null} */
let lastHealthLevel = null;

/** @type {number} */
let lastPacketLoss = 0;

/** @type {number|null} */
let lastBitrate = null;

/** @type {number|null} */
let monitorStartTime = null;

/** @type {boolean} */
let iceConnectedLogged = false;

/** @type {boolean} */
let iceFailedLogged = false;

/** @type {((health: Object) => void)|null} */
let onHealthUpdate = null;

/** @type {WeakMap<RTCPeerConnection, Object>} */
const stateHandlers = new WeakMap();

/**
 * Initialize the network monitor.
 * @param {{ onHealthUpdate?: (health: Object) => void }} [options]
 */
export function init(options = {}) {
  onHealthUpdate = options.onHealthUpdate || null;
}

/**
 * Attach state listeners to a peer connection (non-destructive via addEventListener).
 * @param {RTCPeerConnection} pc
 */
export function attachStateListeners(pc) {
  detachStateListeners(pc);

  const handlers = {
    onChange: () => handleStateChange(pc),
  };

  pc.addEventListener('connectionstatechange', handlers.onChange);
  pc.addEventListener('iceconnectionstatechange', handlers.onChange);
  pc.addEventListener('icegatheringstatechange', handlers.onChange);
  pc.addEventListener('signalingstatechange', handlers.onChange);

  stateHandlers.set(pc, handlers);
  handleStateChange(pc);
}

/**
 * Remove state listeners from a peer connection.
 * @param {RTCPeerConnection|null} pc
 */
export function detachStateListeners(pc) {
  if (!pc) return;

  const handlers = stateHandlers.get(pc);
  if (!handlers) return;

  pc.removeEventListener('connectionstatechange', handlers.onChange);
  pc.removeEventListener('iceconnectionstatechange', handlers.onChange);
  pc.removeEventListener('icegatheringstatechange', handlers.onChange);
  pc.removeEventListener('signalingstatechange', handlers.onChange);

  stateHandlers.delete(pc);
}

/**
 * Set the active peer connection reference.
 * @param {RTCPeerConnection|null} pc
 */
export function setPeerConnection(pc) {
  peerConnection = pc;
  if (pc && !monitorStartTime) {
    monitorStartTime = Date.now();
  }
}

/**
 * Handle immediate state changes without waiting for polling.
 * @param {RTCPeerConnection} pc
 */
function handleStateChange(pc) {
  const { connectionState, iceConnectionState } = pc;

  if ((iceConnectionState === 'connected' || iceConnectionState === 'completed') && !iceConnectedLogged) {
    iceConnectedLogged = true;
    performanceLogger.logIceConnected();
  }

  if (iceConnectionState === 'failed' && !iceFailedLogged) {
    iceFailedLogged = true;
    performanceLogger.logIceFailed();
  }

  const isDisconnected =
    connectionState === 'disconnected' ||
    connectionState === 'closed' ||
    connectionState === 'failed' ||
    iceConnectionState === 'disconnected' ||
    iceConnectionState === 'failed' ||
    iceConnectionState === 'closed';

  if (isDisconnected) {
    const health = calculateHealth(null, connectionState, iceConnectionState);
    publishHealth(health);
  }
}

/**
 * Process a raw RTCStatsReport from polling.
 * @param {RTCStatsReport|null} report
 * @param {Error} [error]
 */
export function processStatsReport(report, error) {
  if (error) {
    performanceLogger.logStatsError(error);
    return;
  }

  if (!peerConnection) return;

  const metrics = parseStatsReport(report);
  if (metrics && monitorStartTime) {
    metrics.connectionDuration = Math.round((Date.now() - monitorStartTime) / 1000);
  }

  const health = calculateHealth(
    metrics,
    peerConnection.connectionState,
    peerConnection.iceConnectionState
  );

  if (metrics) {
    detectAnomalies(metrics);
  }

  publishHealth(health);
  dispatch(StatsEvents.STATS_UPDATED, { health, metrics });
}

/**
 * Detect performance anomalies and log warnings.
 * @param {import('./statsParser.js').ConnectionMetrics} metrics
 */
function detectAnomalies(metrics) {
  const loss = metrics.packetLossPercent ?? 0;
  const { PACKET_LOSS_SPIKE_MIN, PACKET_LOSS_SPIKE_DELTA, BITRATE_DROP_RATIO, BITRATE_DROP_MIN_BPS } = AppConfig.NETWORK;

  if (loss >= PACKET_LOSS_SPIKE_MIN && loss > lastPacketLoss + PACKET_LOSS_SPIKE_DELTA) {
    performanceLogger.logPacketLossSpike(loss);
  }
  lastPacketLoss = loss;

  const bitrate = metrics.availableOutgoingBitrate;
  if (bitrate != null && lastBitrate != null && bitrate < lastBitrate * BITRATE_DROP_RATIO && bitrate < BITRATE_DROP_MIN_BPS) {
    performanceLogger.logBitrateDrop(bitrate);
  }
  if (bitrate != null) {
    lastBitrate = bitrate;
  }
}

/**
 * Publish health update to UI and event bus.
 * @param {Object} health
 */
function publishHealth(health) {
  onHealthUpdate?.(health);

  const eventName = levelToEvent(health.level);
  if (eventName && health.level !== lastHealthLevel) {
    dispatch(eventName, health);

    if (lastHealthLevel === 'disconnected' && health.level !== 'disconnected') {
      dispatch(StatsEvents.NETWORK_RECOVERED, health);
    }
  }

  performanceLogger.logHealthChange(health);
  lastHealthLevel = health.level;
}

/**
 * Reset monitor state.
 */
export function resetMonitor() {
  lastHealthLevel = null;
  lastPacketLoss = 0;
  lastBitrate = null;
  monitorStartTime = null;
  iceConnectedLogged = false;
  iceFailedLogged = false;
  peerConnection = null;
}

// Device switching: client/js/media/mediaSwitcher.js
