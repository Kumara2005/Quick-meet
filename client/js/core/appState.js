/**
 * QuickMeet — Application State
 * Centralized read-only snapshots for UI and device management (Phase 9+).
 */

/** @type {Object} */
const state = {
  activeCameraId: null,
  activeMicrophoneId: null,
  preferredCameraId: null,
  preferredMicrophoneId: null,
  cameras: [],
  microphones: [],
  speakers: [],
  permissions: { camera: 'unknown', microphone: 'unknown' },
  isSwitchingDevice: false,
  // Collaboration state
  selfPeerId: null,
  messages: [],
  unreadCount: 0,
  chatOpen: false,
  lastReaction: null,
};

/**
 * @returns {typeof state}
 */
export function getState() {
  return {
    ...state,
    cameras: [...state.cameras],
    microphones: [...state.microphones],
    speakers: [...state.speakers],
    permissions: { ...state.permissions },
    messages: [...state.messages],
    lastReaction: state.lastReaction ? { ...state.lastReaction } : null,
  };
}

/**
 * @param {{ cameraId?: string|null, microphoneId?: string|null }} ids
 */
export function setActiveDevices({ cameraId, microphoneId }) {
  if (cameraId !== undefined) state.activeCameraId = cameraId;
  if (microphoneId !== undefined) state.activeMicrophoneId = microphoneId;
}

/**
 * @param {Object} payload
 */
export function setDevices(payload) {
  if (payload.cameras) state.cameras = payload.cameras;
  if (payload.microphones) state.microphones = payload.microphones;
  if (payload.speakers) state.speakers = payload.speakers;
  if (payload.preferredCameraId !== undefined) state.preferredCameraId = payload.preferredCameraId;
  if (payload.preferredMicrophoneId !== undefined) state.preferredMicrophoneId = payload.preferredMicrophoneId;
}

/**
 * @param {{ camera: string, microphone: string }} permissions
 */
export function setPermissions(permissions) {
  state.permissions = { ...permissions };
}

/**
 * @param {boolean} switching
 */
export function setSwitchingDevice(switching) {
  state.isSwitchingDevice = switching;
}

/**
 * @param {string|null} peerId
 */
export function setSelfPeerId(peerId) {
  state.selfPeerId = peerId;
}

/**
 * @returns {string|null}
 */
export function getSelfPeerId() {
  return state.selfPeerId;
}

/**
 * @param {Object} message
 */
export function addChatMessage(message) {
  state.messages.push({ ...message });
}

/**
 * @param {boolean} open
 */
export function setChatOpen(open) {
  state.chatOpen = open;
}

export function incrementUnreadCount() {
  state.unreadCount += 1;
}

export function resetUnreadCount() {
  state.unreadCount = 0;
}

/**
 * @param {Object|null} reaction
 */
export function setLastReaction(reaction) {
  state.lastReaction = reaction ? { ...reaction } : null;
}

/**
 * Reset device-related state.
 */
export function reset() {
  state.activeCameraId = null;
  state.activeMicrophoneId = null;
  state.preferredCameraId = null;
  state.preferredMicrophoneId = null;
  state.cameras = [];
  state.microphones = [];
  state.speakers = [];
  state.permissions = { camera: 'unknown', microphone: 'unknown' };
  state.isSwitchingDevice = false;
  resetCollaboration();
}

/**
 * Reset collaboration state only.
 */
export function resetCollaboration() {
  state.selfPeerId = null;
  state.messages = [];
  state.unreadCount = 0;
  state.chatOpen = false;
  state.lastReaction = null;
}

// TODO Phase 10: Recording state, TURN diagnostics flags.
