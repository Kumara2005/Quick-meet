/**
 * QuickMeet — Screen Share Manager
 * Coordinates screen capture, track replacement, preview, and events.
 */

import * as media from '../media/media.js';
import {
  requestScreenStream,
  releaseScreenStream,
  getScreenShareErrorMessage,
} from './screenShare.js';
import { replaceVideoTrack } from './trackReplacement.js';
import {
  getScreenState,
  isScreenSharing,
  setScreenState,
  resetScreenState,
} from './screenState.js';
import { ScreenEvents, dispatch } from './screenEvents.js';

/** @type {(() => RTCPeerConnection|null)|null} */
let getPeerConnection = null;

/** @type {((stream: MediaStream|null) => void)|null} */
let onLocalPreviewUpdate = null;

/** @type {((message: string) => void)|null} */
let onError = null;

/** @type {Function|null} */
let screenTrackEndedHandler = null;

/**
 * Initialize screen manager with room-level dependencies.
 * @param {{
 *   getPeerConnection: () => RTCPeerConnection|null,
 *   onLocalPreviewUpdate: (stream: MediaStream|null) => void,
 *   onError?: (message: string) => void,
 * }} options
 */
export function init(options) {
  getPeerConnection = options.getPeerConnection;
  onLocalPreviewUpdate = options.onLocalPreviewUpdate;
  onError = options.onError || null;
}

/**
 * Toggle screen sharing on or off.
 * @returns {Promise<boolean>}
 */
export async function toggleScreenShare() {
  if (isScreenSharing()) {
    await stopScreenShare();
    return false;
  }
  await startScreenShare();
  return true;
}

/**
 * Start screen sharing: capture display and replace camera video track.
 */
export async function startScreenShare() {
  if (isScreenSharing()) return;

  const pc = getPeerConnection?.();
  if (!pc || pc.connectionState === 'closed') {
    const message = 'Cannot share screen — peer connection is not active.';
    onError?.(message);
    dispatch(ScreenEvents.SCREEN_SHARE_FAILED, { message });
    throw new Error(message);
  }

  const cameraStream = media.getLocalStream();
  const cameraVideoTrack = cameraStream?.getVideoTracks()[0] || null;

  if (!cameraVideoTrack) {
    const message = 'Cannot share screen — camera stream is unavailable.';
    onError?.(message);
    dispatch(ScreenEvents.SCREEN_SHARE_FAILED, { message });
    throw new Error(message);
  }

  try {
    const screenStream = await requestScreenStream();
    const screenTrack = screenStream.getVideoTracks()[0];

    if (!screenTrack) {
      releaseScreenStream(screenStream);
      throw new Error('No video track received from screen capture.');
    }

    const videoSender = await replaceVideoTrack(pc, screenTrack);

    setScreenState({
      isScreenSharing: true,
      screenStream,
      cameraStream,
      cameraVideoTrack,
      videoSender,
      activeVideoTrack: screenTrack,
    });

    attachScreenTrackEndedListener(screenTrack);
    updateLocalPreview(screenStream);

    dispatch(ScreenEvents.SCREEN_TRACK_REPLACED, { trackId: screenTrack.id });
    dispatch(ScreenEvents.SCREEN_SHARE_STARTED, { stream: screenStream });
  } catch (err) {
    const message = getScreenShareErrorMessage(err);
    onError?.(message);
    dispatch(ScreenEvents.SCREEN_SHARE_FAILED, { message, error: err });
    throw err;
  }
}

/**
 * Stop screen sharing and restore the camera video track.
 */
export async function stopScreenShare() {
  if (!isScreenSharing()) return;

  const state = getScreenState();
  const pc = getPeerConnection?.();

  detachScreenTrackEndedListener(state.activeVideoTrack);

  try {
    if (pc && pc.connectionState !== 'closed' && state.cameraVideoTrack) {
      await replaceVideoTrack(pc, state.cameraVideoTrack);
      dispatch(ScreenEvents.CAMERA_TRACK_RESTORED, {
        trackId: state.cameraVideoTrack.id,
      });
    }
  } catch (err) {
    console.error('[ScreenManager] Restore camera track failed:', err.message);
    onError?.('Failed to restore camera after screen sharing.');
  }

  releaseScreenStream(state.screenStream);
  updateLocalPreview(state.cameraStream);
  resetScreenState();

  dispatch(ScreenEvents.SCREEN_SHARE_STOPPED);
}

/**
 * Update local video preview element via callback.
 * @param {MediaStream|null} stream
 */
function updateLocalPreview(stream) {
  onLocalPreviewUpdate?.(stream);
}

/**
 * Listen for browser "Stop sharing" UI.
 * @param {MediaStreamTrack} screenTrack
 */
function attachScreenTrackEndedListener(screenTrack) {
  detachScreenTrackEndedListener(screenTrack);

  screenTrackEndedHandler = () => {
    stopScreenShare().catch((err) => {
      console.warn('[ScreenManager] Auto-stop failed:', err.message);
    });
  };

  screenTrack.addEventListener('ended', screenTrackEndedHandler);
}

/**
 * @param {MediaStreamTrack|null} screenTrack
 */
function detachScreenTrackEndedListener(screenTrack) {
  if (screenTrack && screenTrackEndedHandler) {
    screenTrack.removeEventListener('ended', screenTrackEndedHandler);
  }
  screenTrackEndedHandler = null;
}

/**
 * Clean up screen sharing without restoring peer (call ending).
 */
export function cleanupScreenShare() {
  const state = getScreenState();

  detachScreenTrackEndedListener(state.activeVideoTrack);
  releaseScreenStream(state.screenStream);
  resetScreenState();
}

export { isScreenSharing, getScreenState };
