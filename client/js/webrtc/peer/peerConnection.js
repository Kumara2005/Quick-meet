/**
 * QuickMeet — RTCPeerConnection Factory
 * Creates and configures peer connections. No signaling logic.
 */

import { AppConfig } from '../../config/appConfig.js';

/** @type {RTCConfiguration} */
export const ICE_CONFIG = {
  iceServers: AppConfig.ICE_SERVERS,
};

/**
 * Create a new RTCPeerConnection with STUN configuration.
 * @returns {RTCPeerConnection}
 */
export function createPeerConnection() {
  return new RTCPeerConnection(ICE_CONFIG);
}

/**
 * Add all tracks from a local MediaStream to the peer connection.
 * @param {RTCPeerConnection} pc
 * @param {MediaStream} stream
 */
export function addLocalTracks(pc, stream) {
  if (!stream) return;

  stream.getTracks().forEach((track) => {
    pc.addTrack(track, stream);
  });
}

/**
 * Attach connection state listeners.
 * @param {RTCPeerConnection} pc
 * @param {Object} callbacks
 * @param {Function} [callbacks.onConnectionState]
 * @param {Function} [callbacks.onIceConnectionState]
 * @param {Function} [callbacks.onSignalingState]
 */
export function attachConnectionListeners(pc, callbacks = {}) {
  pc.onconnectionstatechange = () => {
    callbacks.onConnectionState?.(pc.connectionState);
  };

  pc.oniceconnectionstatechange = () => {
    callbacks.onIceConnectionState?.(pc.iceConnectionState);
  };

  pc.onsignalingstatechange = () => {
    callbacks.onSignalingState?.(pc.signalingState);
  };
}

/**
 * Close and clean up a peer connection.
 * @param {RTCPeerConnection|null} pc
 */
export function closePeerConnection(pc) {
  if (!pc) return;

  pc.onconnectionstatechange = null;
  pc.oniceconnectionstatechange = null;
  pc.onsignalingstatechange = null;
  pc.ontrack = null;
  pc.onicecandidate = null;

  pc.close();
}

// TURN servers can be added via AppConfig.ICE_SERVERS for production relay.
