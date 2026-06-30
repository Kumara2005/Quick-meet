/**
 * QuickMeet — Local Media Manager
 * Acquires and manages camera/microphone MediaStream for local preview.
 */

import {
  requestMediaStream,
  getDefaultConstraints,
  getErrorMessage,
  isMediaSupported,
} from './permissions.js';
import {
  enumerateDevices,
  syncSelectedFromStream,
} from './deviceManager.js';
import { MediaEvents, dispatch } from './mediaEvents.js';

/** @type {MediaStream|null} */
let localStream = null;

/**
 * Initialize camera and microphone access.
 * @returns {Promise<MediaStream>}
 */
export async function initializeMedia() {
  if (localStream) {
    return localStream;
  }

  if (!isMediaSupported()) {
    const message = 'Your browser does not support camera or microphone access.';
    dispatch(MediaEvents.PERMISSION_DENIED, { message });
    throw new Error(message);
  }

  try {
    localStream = await requestMediaStream(getDefaultConstraints());

    await enumerateDevices();
    syncSelectedFromStream(localStream);

    dispatch(MediaEvents.PERMISSION_GRANTED, { stream: localStream });
    dispatch(MediaEvents.MEDIA_STARTED, { stream: localStream });

    return localStream;
  } catch (err) {
    const message = getErrorMessage(err);
    dispatch(MediaEvents.PERMISSION_DENIED, { message, error: err });
    throw new Error(message);
  }
}

/**
 * Get the current local MediaStream.
 * @returns {MediaStream|null}
 */
export function getLocalStream() {
  return localStream;
}

/**
 * Attach the local stream to a video element for preview.
 * @param {HTMLVideoElement} videoElement
 */
export function attachToVideoElement(videoElement) {
  if (!videoElement || !localStream) return;

  videoElement.srcObject = localStream;
  videoElement.muted = true;
  videoElement.autoplay = true;
  videoElement.playsInline = true;

  videoElement.play().catch(() => {
    // Autoplay may be blocked until user interaction — preview still binds stream.
  });
}

/**
 * Enable the camera video track.
 */
export async function startCamera() {
  const track = localStream?.getVideoTracks()[0];
  if (track) {
    track.enabled = true;
    return;
  }

  if (!localStream) {
    await initializeMedia();
    return;
  }

  const stream = await requestMediaStream({ video: getDefaultConstraints().video });
  stream.getVideoTracks().forEach((t) => localStream.addTrack(t));
}

/**
 * Disable the camera video track (keeps stream alive).
 */
export function stopCamera() {
  const track = localStream?.getVideoTracks()[0];
  if (track) {
    track.enabled = false;
  }
}

/**
 * Enable the microphone audio track.
 */
export async function startMicrophone() {
  const track = localStream?.getAudioTracks()[0];
  if (track) {
    track.enabled = true;
    return;
  }

  if (!localStream) {
    await initializeMedia();
    return;
  }

  const stream = await requestMediaStream({ audio: getDefaultConstraints().audio });
  stream.getAudioTracks().forEach((t) => localStream.addTrack(t));
}

/**
 * Disable the microphone audio track (keeps stream alive).
 */
export function stopMicrophone() {
  const track = localStream?.getAudioTracks()[0];
  if (track) {
    track.enabled = false;
  }
}

/**
 * Check if the camera track is active.
 * @returns {boolean}
 */
export function isCameraEnabled() {
  const track = localStream?.getVideoTracks()[0];
  return Boolean(track?.enabled);
}

/**
 * Check if the microphone track is active.
 * @returns {boolean}
 */
export function isMicrophoneEnabled() {
  const track = localStream?.getAudioTracks()[0];
  return Boolean(track?.enabled);
}

/**
 * Stop all tracks, release devices, and clear state.
 * @param {HTMLVideoElement|null} [videoElement]
 */
export function cleanup(videoElement = null) {
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }

  if (videoElement) {
    videoElement.srcObject = null;
  }

  syncSelectedFromStream(null);
  dispatch(MediaEvents.MEDIA_STOPPED);
}
