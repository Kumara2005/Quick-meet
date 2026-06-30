/**
 * QuickMeet — Screen Share State
 * Centralized state for screen sharing session.
 */

/** @type {{
 *   isScreenSharing: boolean,
 *   screenStream: MediaStream|null,
 *   cameraStream: MediaStream|null,
 *   videoSender: RTCRtpSender|null,
 *   activeVideoTrack: MediaStreamTrack|null,
 *   cameraVideoTrack: MediaStreamTrack|null,
 * }} */
const state = {
  isScreenSharing: false,
  screenStream: null,
  cameraStream: null,
  videoSender: null,
  activeVideoTrack: null,
  cameraVideoTrack: null,
};

/**
 * @returns {typeof state}
 */
export function getScreenState() {
  return { ...state };
}

/**
 * @returns {boolean}
 */
export function isScreenSharing() {
  return state.isScreenSharing;
}

/**
 * @param {Partial<typeof state>} updates
 */
export function setScreenState(updates) {
  Object.assign(state, updates);
}

/**
 * Reset all screen share state to defaults.
 */
export function resetScreenState() {
  state.isScreenSharing = false;
  state.screenStream = null;
  state.cameraStream = null;
  state.videoSender = null;
  state.activeVideoTrack = null;
  state.cameraVideoTrack = null;
}
