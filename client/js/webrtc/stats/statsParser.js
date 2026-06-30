/**
 * QuickMeet — Stats Parser
 * Converts raw RTCStatsReport into readable connection metrics.
 */

/**
 * @typedef {Object} ConnectionMetrics
 * @property {number|null} rtt
 * @property {number|null} jitter
 * @property {number|null} availableOutgoingBitrate
 * @property {number|null} availableIncomingBitrate
 * @property {number} packetsSent
 * @property {number} packetsReceived
 * @property {number} packetsLost
 * @property {number|null} framesPerSecond
 * @property {number|null} framesDropped
 * @property {number|null} frameWidth
 * @property {number|null} frameHeight
 * @property {number} bytesSent
 * @property {number} bytesReceived
 * @property {string|null} candidateType
 * @property {string|null} transportProtocol
 * @property {number|null} connectionDuration
 * @property {number|null} packetLossPercent
 */

/**
 * Find the active candidate pair from a stats report.
 * @param {RTCStatsReport} report
 * @returns {RTCStats|null}
 */
function findCandidatePair(report) {
  let selected = null;
  let succeeded = null;

  report.forEach((stat) => {
    if (stat.type !== 'candidate-pair') return;
    if (stat.selected || stat.nominated) selected = stat;
    if (stat.state === 'succeeded') succeeded = stat;
  });

  return selected || succeeded;
}

/**
 * Find inbound video RTP stats.
 * @param {RTCStatsReport} report
 * @returns {RTCStats|null}
 */
function findInboundVideo(report) {
  let videoStat = null;

  report.forEach((stat) => {
    if (stat.type === 'inbound-rtp' && stat.kind === 'video') {
      videoStat = stat;
    }
  });

  return videoStat;
}

/**
 * Find outbound video RTP stats.
 * @param {RTCStatsReport} report
 * @returns {RTCStats|null}
 */
function findOutboundVideo(report) {
  let videoStat = null;

  report.forEach((stat) => {
    if (stat.type === 'outbound-rtp' && stat.kind === 'video') {
      videoStat = stat;
    }
  });

  return videoStat;
}

/**
 * Parse RTCStatsReport into connection metrics.
 * @param {RTCStatsReport|null} report
 * @returns {ConnectionMetrics|null}
 */
export function parseStatsReport(report) {
  if (!report) return null;

  /** @type {ConnectionMetrics} */
  const metrics = {
    rtt: null,
    jitter: null,
    availableOutgoingBitrate: null,
    availableIncomingBitrate: null,
    packetsSent: 0,
    packetsReceived: 0,
    packetsLost: 0,
    framesPerSecond: null,
    framesDropped: null,
    frameWidth: null,
    frameHeight: null,
    bytesSent: 0,
    bytesReceived: 0,
    candidateType: null,
    transportProtocol: null,
    connectionDuration: null,
    packetLossPercent: null,
  };

  const candidatePair = findCandidatePair(report);
  const inboundVideo = findInboundVideo(report);
  const outboundVideo = findOutboundVideo(report);

  if (candidatePair) {
    if (candidatePair.currentRoundTripTime != null) {
      metrics.rtt = Math.round(candidatePair.currentRoundTripTime * 1000);
    }
    metrics.bytesSent = candidatePair.bytesSent || 0;
    metrics.bytesReceived = candidatePair.bytesReceived || 0;
    metrics.availableOutgoingBitrate = candidatePair.availableOutgoingBitrate ?? null;
    metrics.availableIncomingBitrate = candidatePair.availableIncomingBitrate ?? null;

    const localCandidate = report.get(candidatePair.localCandidateId);
    if (localCandidate) {
      metrics.candidateType = localCandidate.candidateType || null;
      metrics.transportProtocol = localCandidate.protocol || null;
    }
  }

  if (inboundVideo) {
    if (inboundVideo.jitter != null) {
      metrics.jitter = Math.round(inboundVideo.jitter * 1000);
    }
    metrics.packetsReceived = inboundVideo.packetsReceived || 0;
    metrics.packetsLost = inboundVideo.packetsLost || 0;
    metrics.framesPerSecond = inboundVideo.framesPerSecond ?? null;
    metrics.framesDropped = inboundVideo.framesDropped ?? null;
    metrics.frameWidth = inboundVideo.frameWidth ?? null;
    metrics.frameHeight = inboundVideo.frameHeight ?? null;

    if (inboundVideo.roundTripTime != null && metrics.rtt == null) {
      metrics.rtt = Math.round(inboundVideo.roundTripTime * 1000);
    }
  }

  if (outboundVideo) {
    metrics.packetsSent = outboundVideo.packetsSent || metrics.packetsSent;
    if (metrics.framesPerSecond == null) {
      metrics.framesPerSecond = outboundVideo.framesPerSecond ?? null;
    }
    if (metrics.frameWidth == null) {
      metrics.frameWidth = outboundVideo.frameWidth ?? null;
      metrics.frameHeight = outboundVideo.frameHeight ?? null;
    }
  }

  const totalPackets = metrics.packetsReceived + metrics.packetsLost;
  if (totalPackets > 0) {
    metrics.packetLossPercent = Math.round((metrics.packetsLost / totalPackets) * 1000) / 10;
  } else {
    metrics.packetLossPercent = 0;
  }

  return metrics;
}

/**
 * Format bitrate for display.
 * @param {number|null} bps
 * @returns {string}
 */
export function formatBitrate(bps) {
  if (bps == null || bps <= 0) return '—';
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} Mbps`;
  if (bps >= 1_000) return `${Math.round(bps / 1_000)} Kbps`;
  return `${bps} bps`;
}
