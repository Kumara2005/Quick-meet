/**
 * QuickMeet — Camera Manager
 * Acquires video tracks from a specific camera device.
 */

import { getErrorMessage } from '../webrtc/media/permissions.js';

/**
 * Build video constraints for a device ID.
 * @param {string|null} deviceId
 * @returns {MediaTrackConstraints}
 */
export function buildVideoConstraints(deviceId) {
  const base = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
  };

  if (deviceId) {
    return { ...base, deviceId: { ideal: deviceId } };
  }

  return { ...base, facingMode: 'user' };
}

/**
 * Acquire a video track from the specified camera.
 * @param {string|null} deviceId
 * @returns {Promise<MediaStreamTrack>}
 */
export async function acquireCameraTrack(deviceId) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera access is not supported in this browser.');
  }

  const constraints = { video: buildVideoConstraints(deviceId), audio: false };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const track = stream.getVideoTracks()[0];

    if (!track) {
      stream.getTracks().forEach((t) => t.stop());
      throw new Error('No camera track was returned.');
    }

    // Release the temporary stream wrapper; caller owns the track.
    return track;
  } catch (err) {
    if (err.name === 'OverconstrainedError' && deviceId) {
      const fallback = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      const track = fallback.getVideoTracks()[0];
      if (!track) throw new Error('No camera available.');
      return track;
    }

    throw new Error(getErrorMessage(err));
  }
}

/**
 * Check whether a camera device still exists.
 * @param {string} deviceId
 * @param {MediaDeviceInfo[]} cameras
 * @returns {boolean}
 */
export function isCameraAvailable(deviceId, cameras) {
  return cameras.some((d) => d.deviceId === deviceId);
}
