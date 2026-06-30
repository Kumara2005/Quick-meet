/**
 * QuickMeet — Microphone Manager
 * Acquires audio tracks from a specific microphone device.
 */

import { getErrorMessage } from '../webrtc/media/permissions.js';

/**
 * Build audio constraints for a device ID.
 * @param {string|null} deviceId
 * @returns {MediaTrackConstraints}
 */
export function buildAudioConstraints(deviceId) {
  const base = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };

  if (deviceId) {
    return { ...base, deviceId: { ideal: deviceId } };
  }

  return base;
}

/**
 * Acquire an audio track from the specified microphone.
 * @param {string|null} deviceId
 * @returns {Promise<MediaStreamTrack>}
 */
export async function acquireMicrophoneTrack(deviceId) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Microphone access is not supported in this browser.');
  }

  const constraints = { audio: buildAudioConstraints(deviceId), video: false };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const track = stream.getAudioTracks()[0];

    if (!track) {
      stream.getTracks().forEach((t) => t.stop());
      throw new Error('No microphone track was returned.');
    }

    return track;
  } catch (err) {
    if (err.name === 'OverconstrainedError' && deviceId) {
      const fallback = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      const track = fallback.getAudioTracks()[0];
      if (!track) throw new Error('No microphone available.');
      return track;
    }

    throw new Error(getErrorMessage(err));
  }
}

/**
 * Check whether a microphone device still exists.
 * @param {string} deviceId
 * @param {MediaDeviceInfo[]} microphones
 * @returns {boolean}
 */
export function isMicrophoneAvailable(deviceId, microphones) {
  return microphones.some((d) => d.deviceId === deviceId);
}
