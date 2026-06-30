/**
 * QuickMeet — Media Switcher
 * Switches camera/microphone via replaceTrack() without renegotiation.
 */

import * as media from '../webrtc/media/media.js';
import { replaceVideoTrack } from '../webrtc/screen/trackReplacement.js';
import { isScreenSharing, setScreenState } from '../webrtc/screen/screenState.js';
import { acquireCameraTrack, isCameraAvailable } from './cameraManager.js';
import { acquireMicrophoneTrack, isMicrophoneAvailable } from './microphoneManager.js';
import { savePreferredDevice } from './devicePersistence.js';
import { syncActiveFromStream, getCameras, getMicrophones, getDefaultDevice } from './deviceManager.js';
import { DeviceEvents, dispatch } from './deviceEvents.js';
import * as appState from '../core/appState.js';

/** @type {(() => RTCPeerConnection|null)|null} */
let getPeerConnection = null;

/** @type {((stream: MediaStream) => void)|null} */
let onPreviewUpdate = null;

/**
 * Initialize media switcher with session dependencies.
 * @param {{ getPeerConnection: () => RTCPeerConnection|null, onPreviewUpdate?: (stream: MediaStream) => void }} options
 */
export function init(options) {
  getPeerConnection = options.getPeerConnection;
  onPreviewUpdate = options.onPreviewUpdate || null;
}

/**
 * Find the RTCRtpSender for audio.
 * @param {RTCPeerConnection} pc
 * @returns {RTCRtpSender|null}
 */
function findAudioSender(pc) {
  if (!pc) return null;
  return pc.getSenders().find((s) => s.track?.kind === 'audio') || null;
}

/**
 * Replace outbound audio track on peer connection.
 * @param {RTCPeerConnection} pc
 * @param {MediaStreamTrack} newTrack
 */
async function replaceAudioTrack(pc, newTrack) {
  const sender = findAudioSender(pc);
  if (!sender) {
    throw new Error('Audio sender not found on peer connection.');
  }
  await sender.replaceTrack(newTrack);
}

/**
 * Replace a track in the local MediaStream and stop the old one.
 * @param {'video'|'audio'} kind
 * @param {MediaStreamTrack} newTrack
 */
function replaceTrackInLocalStream(kind, newTrack) {
  const stream = media.getLocalStream();
  if (!stream) return;

  const tracks = kind === 'video' ? stream.getVideoTracks() : stream.getAudioTracks();
  const oldTrack = tracks[0];

  if (oldTrack && oldTrack.id !== newTrack.id) {
    stream.removeTrack(oldTrack);
    oldTrack.stop();
  }

  if (!stream.getTracks().includes(newTrack)) {
    stream.addTrack(newTrack);
  }

  newTrack.enabled = oldTrack ? oldTrack.enabled : true;
}

/**
 * Apply preferred devices after initial media start.
 * @returns {Promise<void>}
 */
export async function applyPreferredDevices() {
  const { preferredCameraId, preferredMicrophoneId } = appState.getState();

  if (preferredCameraId && isCameraAvailable(preferredCameraId, getCameras())) {
    try {
      await switchCamera(preferredCameraId, { silent: true });
    } catch (err) {
      console.warn('[QuickMeet] Preferred camera unavailable:', err.message);
    }
  }

  if (preferredMicrophoneId && isMicrophoneAvailable(preferredMicrophoneId, getMicrophones())) {
    try {
      await switchMicrophone(preferredMicrophoneId, { silent: true });
    } catch (err) {
      console.warn('[QuickMeet] Preferred microphone unavailable:', err.message);
    }
  }
}

/**
 * Switch to a different camera.
 * @param {string} deviceId
 * @param {{ silent?: boolean }} [options]
 * @returns {Promise<MediaStreamTrack>}
 */
export async function switchCamera(deviceId, options = {}) {
  if (!deviceId) {
    throw new Error('No camera selected.');
  }

  if (!isCameraAvailable(deviceId, getCameras())) {
    throw new Error('Selected camera is not available.');
  }

  const state = appState.getState();
  if (deviceId === state.activeCameraId) {
    return media.getLocalStream()?.getVideoTracks()[0] || null;
  }

  appState.setSwitchingDevice(true);

  try {
    const newTrack = await acquireCameraTrack(deviceId);
    const wasEnabled = media.isCameraEnabled();
    newTrack.enabled = wasEnabled;

    replaceTrackInLocalStream('video', newTrack);

    const pc = getPeerConnection?.();
    const screenSharing = isScreenSharing();

    if (screenSharing) {
      setScreenState({
        cameraVideoTrack: newTrack,
        cameraStream: media.getLocalStream(),
      });
    }

    if (pc && !screenSharing) {
      await replaceVideoTrack(pc, newTrack);
    }

    savePreferredDevice('camera', deviceId);
    syncActiveFromStream(media.getLocalStream());

    const stream = media.getLocalStream();
    if (stream && onPreviewUpdate && !screenSharing) {
      onPreviewUpdate(stream);
    }

    dispatch(DeviceEvents.CAMERA_CHANGED, { deviceId, trackId: newTrack.id });

    return newTrack;
  } finally {
    appState.setSwitchingDevice(false);
  }
}

/**
 * Switch to a different microphone.
 * @param {string} deviceId
 * @param {{ silent?: boolean }} [options]
 * @returns {Promise<MediaStreamTrack>}
 */
export async function switchMicrophone(deviceId, options = {}) {
  if (!deviceId) {
    throw new Error('No microphone selected.');
  }

  if (!isMicrophoneAvailable(deviceId, getMicrophones())) {
    throw new Error('Selected microphone is not available.');
  }

  const state = appState.getState();
  if (deviceId === state.activeMicrophoneId) {
    return media.getLocalStream()?.getAudioTracks()[0] || null;
  }

  appState.setSwitchingDevice(true);

  try {
    const newTrack = await acquireMicrophoneTrack(deviceId);
    const wasEnabled = media.isMicrophoneEnabled();
    newTrack.enabled = wasEnabled;

    replaceTrackInLocalStream('audio', newTrack);

    const pc = getPeerConnection?.();
    if (pc) {
      await replaceAudioTrack(pc, newTrack);
    }

    savePreferredDevice('microphone', deviceId);
    syncActiveFromStream(media.getLocalStream());

    dispatch(DeviceEvents.MIC_CHANGED, { deviceId, trackId: newTrack.id });

    return newTrack;
  } finally {
    appState.setSwitchingDevice(false);
  }
}

/**
 * Handle active device removed during call — fall back to default.
 * @param {'videoinput'|'audioinput'} kind
 * @param {string} removedDeviceId
 */
export async function handleDeviceRemoved(kind, removedDeviceId) {
  const state = appState.getState();
  const activeId = kind === 'videoinput' ? state.activeCameraId : state.activeMicrophoneId;

  if (activeId !== removedDeviceId) return;

  const fallback = getDefaultDevice(kind);
  if (!fallback) return;

  try {
    if (kind === 'videoinput') {
      await switchCamera(fallback.deviceId);
    } else {
      await switchMicrophone(fallback.deviceId);
    }
  } catch (err) {
    console.warn('[QuickMeet] Device fallback failed:', err.message);
  }
}

/**
 * Apply settings from the settings modal.
 * @param {{ cameraId: string|null, microphoneId: string|null }} selection
 */
export async function applySettings(selection) {
  const changes = [];

  if (selection.cameraId) {
    await switchCamera(selection.cameraId);
    changes.push('camera');
  }

  if (selection.microphoneId) {
    await switchMicrophone(selection.microphoneId);
    changes.push('microphone');
  }

  dispatch(DeviceEvents.SETTINGS_APPLIED, { ...selection, changes });
}

// TODO Phase 10: Adaptive bitrate hints after device switch.
