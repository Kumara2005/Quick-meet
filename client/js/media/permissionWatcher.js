/**
 * QuickMeet — Permission Watcher
 * Monitors camera and microphone permission state changes.
 */

import { DeviceEvents, dispatch } from './deviceEvents.js';

/** @type {PermissionStatus|null} */
let cameraPermission = null;

/** @type {PermissionStatus|null} */
let microphonePermission = null;

/** @type {Function|null} */
let cleanup = null;

/**
 * @typedef {{ camera: string, microphone: string }} PermissionState
 */

/**
 * Start watching permission changes.
 * @returns {Promise<PermissionState>}
 */
export async function startWatching() {
  stopWatching();

  const state = await queryPermissions();
  const handler = () => {
    const camera = cameraPermission?.state || 'unknown';
    const microphone = microphonePermission?.state || 'unknown';
    dispatch(DeviceEvents.PERMISSION_CHANGED, { camera, microphone });
  };

  cameraPermission?.addEventListener('change', handler);
  microphonePermission?.addEventListener('change', handler);

  cleanup = () => {
    cameraPermission?.removeEventListener('change', handler);
    microphonePermission?.removeEventListener('change', handler);
    cleanup = null;
  };

  return state;
}

/**
 * Stop permission watchers.
 */
export function stopWatching() {
  cleanup?.();
  cameraPermission = null;
  microphonePermission = null;
}

/**
 * Query current permission states.
 * @returns {Promise<PermissionState>}
 */
export async function queryPermissions() {
  if (!navigator.permissions?.query) {
    return { camera: 'unknown', microphone: 'unknown' };
  }

  try {
    const [camera, microphone] = await Promise.all([
      navigator.permissions.query({ name: 'camera' }).catch(() => null),
      navigator.permissions.query({ name: 'microphone' }).catch(() => null),
    ]);

    cameraPermission = camera;
    microphonePermission = microphone;

    return {
      camera: camera?.state || 'unknown',
      microphone: microphone?.state || 'unknown',
    };
  } catch {
    return { camera: 'unknown', microphone: 'unknown' };
  }
}

/**
 * User-friendly message for a permission state.
 * @param {string} state
 * @param {'camera'|'microphone'} kind
 * @returns {string|null}
 */
export function permissionMessage(state, kind) {
  const label = kind === 'camera' ? 'Camera' : 'Microphone';

  switch (state) {
    case 'granted':
      return `${label} permission granted`;
    case 'denied':
      return `${label} permission denied. Enable it in your browser settings.`;
    case 'prompt':
      return `${label} permission required`;
    default:
      return null;
  }
}
