/**
 * QuickMeet — ICE Candidate Manager
 * Collects, queues, and applies ICE candidates.
 */

/** @type {RTCIceCandidateInit[]} */
let pendingCandidates = [];

/**
 * Reset queued ICE candidates (call on cleanup).
 */
export function resetIceManager() {
  pendingCandidates = [];
}

/**
 * Register handler to emit local ICE candidates.
 * @param {RTCPeerConnection} pc
 * @param {Function} onCandidate - Called with serialized candidate
 */
export function setupIceGathering(pc, onCandidate) {
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      onCandidate(event.candidate.toJSON());
    }
  };
}

/**
 * Add a remote ICE candidate, queueing if remote description is not set yet.
 * @param {RTCPeerConnection} pc
 * @param {RTCIceCandidateInit} candidate
 */
export async function addRemoteCandidate(pc, candidate) {
  if (!candidate) return;

  if (!pc.remoteDescription) {
    pendingCandidates.push(candidate);
    return;
  }

  try {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (err) {
    console.warn('[ICE] Failed to add candidate:', err.message);
  }
}

/**
 * Flush queued ICE candidates after remote description is set.
 * @param {RTCPeerConnection} pc
 */
export async function flushPendingCandidates(pc) {
  const queue = [...pendingCandidates];
  pendingCandidates = [];

  for (const candidate of queue) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn('[ICE] Failed to flush candidate:', err.message);
    }
  }
}
