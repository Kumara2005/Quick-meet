/**
 * QuickMeet — Call Manager
 * Centralized call state and end-call lifecycle.
 */

import { ControlEvents, dispatch } from './controlEvents.js';

/** @type {{ isMuted: boolean, cameraEnabled: boolean, callActive: boolean }} */
const state = {
  isMuted: false,
  cameraEnabled: true,
  callActive: false,
};

/** @type {{ onEndCall?: () => Promise<void>|void }} */
let handlers = {};

/**
 * Register cleanup handlers invoked when the user ends a call.
 * @param {{ onEndCall?: () => Promise<void>|void }} callbacks
 */
export function init(callbacks = {}) {
  handlers = { ...callbacks };
}

/**
 * Get a snapshot of the current control state.
 * @returns {{ isMuted: boolean, cameraEnabled: boolean, callActive: boolean }}
 */
export function getState() {
  return { ...state };
}

/**
 * Mark whether an active peer call is in progress.
 * @param {boolean} active
 */
export function setCallActive(active) {
  state.callActive = active;
}

/**
 * Update mute state flag.
 * @param {boolean} muted
 */
export function setMuted(muted) {
  state.isMuted = muted;
}

/**
 * Update camera enabled state flag.
 * @param {boolean} enabled
 */
export function setCameraEnabled(enabled) {
  state.cameraEnabled = enabled;
}

/**
 * Reset all control state to defaults.
 */
export function resetState() {
  state.isMuted = false;
  state.cameraEnabled = true;
  state.callActive = false;
}

/**
 * End the call after user confirmation.
 * @returns {Promise<boolean>} True if the call was ended.
 */
export async function endCall() {
  const confirmed = window.confirm('End this call and return to the home page?');
  if (!confirmed) return false;

  try {
    dispatch(ControlEvents.CALL_ENDING);

    if (handlers.onEndCall) {
      await handlers.onEndCall();
    }

    dispatch(ControlEvents.CALL_ENDED);
    dispatch(ControlEvents.PEER_DISCONNECTED);
    resetState();
    return true;
  } catch (err) {
    console.error('[CallManager] End call failed:', err.message);
    return false;
  }
}

/**
 * Notify that the remote peer disconnected (no confirmation).
 */
export function notifyPeerDisconnected() {
  state.callActive = false;
  dispatch(ControlEvents.PEER_DISCONNECTED);
}
