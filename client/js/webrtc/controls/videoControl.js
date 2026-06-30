/**
 * QuickMeet — Video Control
 * Camera on/off via MediaStreamTrack.enabled (no SDP renegotiation).
 */

import * as media from '../media/media.js';
import { ControlEvents, dispatch } from './controlEvents.js';
import { setCameraEnabled } from './callManager.js';

/**
 * Get the local video track.
 * @returns {MediaStreamTrack|null}
 */
export function getVideoTrack() {
  const stream = media.getLocalStream();
  if (!stream) return null;
  return stream.getVideoTracks()[0] || null;
}

/**
 * Check if the camera is enabled.
 * @returns {boolean}
 */
export function isCameraEnabled() {
  const track = getVideoTrack();
  if (!track) return false;
  return track.enabled;
}

/**
 * Disable the local camera track.
 * @returns {boolean}
 */
export function disableCamera() {
  const track = getVideoTrack();
  if (!track) {
    console.warn('[VideoControl] No video track available');
    return false;
  }

  track.enabled = false;
  setCameraEnabled(false);
  dispatch(ControlEvents.VIDEO_DISABLED, { trackId: track.id });
  return true;
}

/**
 * Enable the local camera track.
 * @returns {boolean}
 */
export function enableCamera() {
  const track = getVideoTrack();
  if (!track) {
    console.warn('[VideoControl] No video track available');
    return false;
  }

  track.enabled = true;
  setCameraEnabled(true);
  dispatch(ControlEvents.VIDEO_ENABLED, { trackId: track.id });
  return true;
}

/**
 * Toggle camera on/off.
 * @returns {'disabled'|'enabled'|null}
 */
export function toggleCamera() {
  if (isCameraEnabled()) {
    return disableCamera() ? 'disabled' : null;
  }
  return enableCamera() ? 'enabled' : null;
}
