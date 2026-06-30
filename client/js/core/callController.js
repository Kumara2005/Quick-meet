/**
 * QuickMeet — Call Controller
 * Orchestrates signaling, peer connection lifecycle, and session state.
 * Publishes room-level events via the application event bus.
 */

import * as socket from '../socket/socket.js';
import * as media from '../webrtc/media/media.js';
import {
  createPeerConnection,
  addLocalTracks,
  attachConnectionListeners,
  closePeerConnection,
} from '../webrtc/peer/peerConnection.js';
import {
  createOffer,
  handleOffer,
  handleAnswer,
  serializeDescription,
} from '../webrtc/peer/negotiation.js';
import {
  setupIceGathering,
  addRemoteCandidate,
  flushPendingCandidates,
  resetIceManager,
} from '../webrtc/peer/iceManager.js';
import {
  setupRemoteTrackHandler,
  attachRemoteStream,
  clearRemoteStream,
} from '../webrtc/peer/remoteStream.js';
import { PeerEvents, on as onPeerEvent, dispatch as dispatchPeerEvent } from '../webrtc/peer/peerEvents.js';
import * as callManager from '../webrtc/controls/callManager.js';
import * as screenManager from '../webrtc/screen/screenManager.js';
import * as healthIndicator from '../ui/healthIndicator.js';
import { AppEvents, dispatch as dispatchApp } from './appEvents.js';
import { SocketEvents } from '../config/appConfig.js';
import * as deviceManager from '../media/deviceManager.js';
import * as permissionWatcher from '../media/permissionWatcher.js';
import * as mediaSwitcher from '../media/mediaSwitcher.js';
import { DeviceEvents, on as onDeviceEvent } from '../media/deviceEvents.js';
import * as appState from './appState.js';
import { logger } from '../utils/logger.js';

const SOCKET_EVENTS = SocketEvents;

/** @type {string|null} */
let roomCode = null;

/** @type {boolean} */
let isRoomReady = false;

/** @type {RTCPeerConnection|null} */
let peerConnection = null;

/** @type {string|null} */
let remotePeerId = null;

/** @type {boolean} */
let isNegotiating = false;

/** @type {HTMLVideoElement|null} */
let remoteVideoEl = null;

/** @type {HTMLVideoElement|null} */
let localVideoEl = null;

/** @type {boolean} */
let socketEventsRegistered = false;

/** @type {boolean} */
let peerHandlersRegistered = false;

/** @type {boolean} */
let deviceHandlersRegistered = false;

/**
 * Initialize the call controller with session dependencies.
 * @param {{ roomCode: string, remoteVideo: HTMLVideoElement|null, localVideo: HTMLVideoElement|null }} options
 */
export function init(options) {
  roomCode = options.roomCode;
  remoteVideoEl = options.remoteVideo;
  localVideoEl = options.localVideo;

  if (!peerHandlersRegistered) {
    peerHandlersRegistered = true;
    onPeerEvent(PeerEvents.PEER_DISCONNECTED, handleWebRtcDisconnected);
  }
}

/**
 * Initialize device switching and hot-plug handlers.
 * @param {{ onPreviewUpdate?: (stream: MediaStream) => void }} [options]
 */
export function initDeviceManagement(options = {}) {
  mediaSwitcher.init({
    getPeerConnection,
    onPreviewUpdate: options.onPreviewUpdate || null,
  });

  if (!deviceHandlersRegistered) {
    deviceHandlersRegistered = true;

    onDeviceEvent(DeviceEvents.DEVICE_DISCONNECTED, async ({ deviceId }) => {
      if (!deviceId) return;

      const state = appState.getState();
      if (deviceId === state.activeCameraId) {
        await mediaSwitcher.handleDeviceRemoved('videoinput', deviceId);
      }
      if (deviceId === state.activeMicrophoneId) {
        await mediaSwitcher.handleDeviceRemoved('audioinput', deviceId);
      }
    });
  }
}

/**
 * Start device enumeration, permission watching, and preferred device restore.
 */
export async function startDeviceServices() {
  await deviceManager.start();

  const permissions = await permissionWatcher.startWatching();
  appState.setPermissions(permissions);

  deviceManager.syncActiveFromStream(media.getLocalStream());
  await mediaSwitcher.applyPreferredDevices();
}

/**
 * Stop device services and reset device state.
 */
export function stopDeviceServices() {
  permissionWatcher.stopWatching();
  deviceManager.stop();
  appState.reset();
}

/**
 * React to WebRTC peer disconnect (cleanup only; UI listens on app bus).
 */
function handleWebRtcDisconnected() {
  if (!peerConnection) return;

  callManager.notifyPeerDisconnected();
  cleanupPeerConnection();
}

/**
 * @returns {RTCPeerConnection|null}
 */
export function getPeerConnection() {
  return peerConnection;
}

/**
 * @returns {boolean}
 */
export function isCallNegotiating() {
  return isNegotiating;
}

/**
 * @returns {string|null}
 */
export function getSelfPeerId() {
  return appState.getSelfPeerId();
}

/**
 * Connect to signaling server and join the room.
 */
export async function connectSignaling() {
  try {
    await socket.connect();
    socket.send(SOCKET_EVENTS.JOIN_ROOM, { roomCode });
    registerSocketEvents();
  } catch {
    dispatchApp(AppEvents.SOCKET_DISCONNECTED, { reason: 'connect-failed' });
    throw new Error('Failed to connect to server');
  }
}

/**
 * Initialize local camera/microphone.
 * @param {(loading: boolean) => void} [onLoadingChange]
 */
export async function initializeMedia(onLoadingChange) {
  onLoadingChange?.(true);

  try {
    await media.initializeMedia();
    if (localVideoEl) {
      media.attachToVideoElement(localVideoEl);
    }
    await startDeviceServices();
  } finally {
    onLoadingChange?.(false);
  }
}

/**
 * Tear down peer connection, screen share, and health monitoring.
 */
export function cleanupPeerConnection() {
  healthIndicator.stop();
  screenManager.cleanupScreenShare();
  isNegotiating = false;
  remotePeerId = null;

  closePeerConnection(peerConnection);
  peerConnection = null;

  if (remoteVideoEl) {
    clearRemoteStream(remoteVideoEl);
  }

  resetIceManager();

  const cameraStream = media.getLocalStream();
  if (cameraStream && localVideoEl) {
    localVideoEl.srcObject = cameraStream;
  }
}

/**
 * Full session teardown (call end, page unload).
 */
export function destroySession() {
  cleanupPeerConnection();
  stopDeviceServices();
  if (localVideoEl) {
    media.cleanup(localVideoEl);
  }
  socket.disconnect();
}

function registerSocketEvents() {
  if (socketEventsRegistered) return;
  socketEventsRegistered = true;

  socket.on(SOCKET_EVENTS.ROOM_WAITING, handleRoomWaiting);
  socket.on(SOCKET_EVENTS.ROOM_READY, handleRoomReady);
  socket.on(SOCKET_EVENTS.USER_JOINED, handleUserJoined);
  socket.on(SOCKET_EVENTS.USER_LEFT, handleUserLeft);
  socket.on(SOCKET_EVENTS.ERROR, handleSocketError);
  socket.on(SocketEvents.OFFER, handleIncomingOffer);
  socket.on(SocketEvents.ANSWER, handleIncomingAnswer);
  socket.on(SocketEvents.ICE_CANDIDATE, handleIncomingIceCandidate);
  socket.on('disconnected', handleSocketDisconnected);
}

function handleRoomWaiting(payload) {
  if (payload?.peerId) {
    appState.setSelfPeerId(payload.peerId);
  }
  dispatchApp(AppEvents.ROOM_WAITING);
}

function handleRoomReady(payload) {
  if (payload?.peerId) {
    appState.setSelfPeerId(payload.peerId);
  }
  isRoomReady = true;
  dispatchApp(AppEvents.ROOM_READY);
}

async function handleUserJoined(payload) {
  dispatchApp(AppEvents.USER_JOINED, payload);

  if (!payload?.peerId || isNegotiating) return;

  remotePeerId = payload.peerId;
  await startAsCaller();
}

async function handleUserLeft() {
  isRoomReady = false;
  callManager.notifyPeerDisconnected();
  cleanupPeerConnection();
  dispatchApp(AppEvents.USER_LEFT);
}

function handleSocketError(payload) {
  dispatchApp(AppEvents.SOCKET_ERROR, payload);
}

function handleSocketDisconnected() {
  if (isRoomReady) {
    dispatchApp(AppEvents.SOCKET_DISCONNECTED, { reason: 'server-lost' });
  }
  cleanupPeerConnection();
}

function initPeerConnection() {
  if (peerConnection) {
    closePeerConnection(peerConnection);
  }

  resetIceManager();
  peerConnection = createPeerConnection();

  const localStream = media.getLocalStream();
  addLocalTracks(peerConnection, localStream);

  setupRemoteTrackHandler(peerConnection, (stream) => {
    if (remoteVideoEl) {
      attachRemoteStream(remoteVideoEl, stream);
    }
    dispatchPeerEvent(PeerEvents.REMOTE_STREAM_READY, { stream });
  });

  setupIceGathering(peerConnection, (candidate) => {
    socket.send(SocketEvents.ICE_CANDIDATE, {
      candidate,
      targetPeerId: remotePeerId,
    });
  });

  attachConnectionListeners(peerConnection, {
    onConnectionState: (state) => {
      if (state === 'connected') {
        dispatchPeerEvent(PeerEvents.PEER_CONNECTED, { state });
      }
      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        dispatchPeerEvent(PeerEvents.PEER_DISCONNECTED, { state });
      }
    },
    onIceConnectionState: (state) => {
      if (state === 'connected' || state === 'completed') {
        dispatchPeerEvent(PeerEvents.ICE_CONNECTED, { state });
      }
      if (state === 'failed') {
        dispatchPeerEvent(PeerEvents.ICE_FAILED, { state });
      }
    },
  });

  healthIndicator.start(peerConnection);
}

async function startAsCaller() {
  if (!media.getLocalStream()) {
    dispatchApp(AppEvents.SOCKET_ERROR, { message: 'Local media not ready' });
    return;
  }

  try {
    isNegotiating = true;
    dispatchPeerEvent(PeerEvents.NEGOTIATION_STARTED);

    initPeerConnection();

    const offer = await createOffer(peerConnection);

    socket.send(SocketEvents.OFFER, {
      sdp: serializeDescription(offer),
      targetPeerId: remotePeerId,
    });
  } catch (err) {
    logger.error('Offer failed:', err.message);
    dispatchApp(AppEvents.SOCKET_ERROR, { message: 'Failed to start call negotiation' });
    cleanupPeerConnection();
  }
}

async function handleIncomingOffer(payload) {
  if (!payload?.sdp || !payload?.peerId) return;

  remotePeerId = payload.peerId;

  try {
    if (!media.getLocalStream()) {
      await media.initializeMedia();
      if (localVideoEl) {
        media.attachToVideoElement(localVideoEl);
      }
    }

    isNegotiating = true;
    dispatchPeerEvent(PeerEvents.NEGOTIATION_STARTED);

    if (!peerConnection) {
      initPeerConnection();
    }

    const answer = await handleOffer(peerConnection, payload.sdp);
    await flushPendingCandidates(peerConnection);

    socket.send(SocketEvents.ANSWER, {
      sdp: serializeDescription(answer),
      targetPeerId: remotePeerId,
    });

    dispatchPeerEvent(PeerEvents.NEGOTIATION_COMPLETED);
  } catch (err) {
    logger.error('Answer failed:', err.message);
    dispatchApp(AppEvents.SOCKET_ERROR, { message: 'Failed to answer call' });
    cleanupPeerConnection();
  }
}

async function handleIncomingAnswer(payload) {
  if (!payload?.sdp || !peerConnection) return;

  try {
    await handleAnswer(peerConnection, payload.sdp);
    await flushPendingCandidates(peerConnection);
    dispatchPeerEvent(PeerEvents.NEGOTIATION_COMPLETED);
  } catch (err) {
    logger.error('Set remote answer failed:', err.message);
    dispatchApp(AppEvents.SOCKET_ERROR, { message: 'Failed to complete negotiation' });
    cleanupPeerConnection();
  }
}

async function handleIncomingIceCandidate(payload) {
  if (!payload?.candidate || !peerConnection) return;

  try {
    await addRemoteCandidate(peerConnection, payload.candidate);
  } catch (err) {
    logger.warn('ICE candidate error:', err.message);
  }
}

// Production: reconnection logic can subscribe to AppEvents.SOCKET_DISCONNECTED.
