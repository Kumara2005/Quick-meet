/**
 * QuickMeet — Media Permissions
 * Browser support checks and user-friendly permission error messages.
 */

import { AppConfig } from '../../config/appConfig.js';

/**
 * Check whether the browser supports getUserMedia.
 * @returns {boolean}
 */
export function isMediaSupported() {
  return Boolean(
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
}

/**
 * Default media constraints with ideal values and graceful fallback.
 * @returns {MediaStreamConstraints}
 */
export function getDefaultConstraints() {
  return {
    video: {
      width: { ideal: AppConfig.VIDEO.WIDTH_IDEAL },
      height: { ideal: AppConfig.VIDEO.HEIGHT_IDEAL },
      frameRate: { ideal: AppConfig.VIDEO.FRAME_RATE_IDEAL },
      facingMode: 'user',
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  };
}

/**
 * Map DOMException / media errors to readable messages.
 * @param {Error|DOMException} error
 * @returns {string}
 */
export function getErrorMessage(error) {
  const name = error?.name || '';

  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Camera and microphone access was denied. Please allow permissions in your browser settings and refresh.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No camera or microphone was found. Please connect a device and try again.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Your camera or microphone is already in use by another application.';
    case 'OverconstrainedError':
      return 'Your device does not support the requested media settings. Trying with default settings…';
    case 'SecurityError':
      return 'Media access is blocked. QuickMeet must be served over HTTPS or localhost.';
    case 'AbortError':
      return 'Media request was cancelled.';
    default:
      return error?.message || 'Unable to access camera or microphone.';
  }
}

/**
 * Request a MediaStream with the given constraints.
 * @param {MediaStreamConstraints} [constraints]
 * @returns {Promise<MediaStream>}
 */
export async function requestMediaStream(constraints = getDefaultConstraints()) {
  if (!isMediaSupported()) {
    throw new Error('Your browser does not support camera or microphone access.');
  }

  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    if (err.name === 'OverconstrainedError') {
      return navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    }
    throw err;
  }
}

/**
 * Listen for permission / device changes (e.g. user revokes access).
 * @param {Function} callback
 * @returns {Function} Cleanup function
 */
export function onPermissionChange(callback) {
  if (!navigator.permissions?.query) {
    return () => {};
  }

  const cleanups = [];

  Promise.all([
    navigator.permissions.query({ name: 'camera' }).catch(() => null),
    navigator.permissions.query({ name: 'microphone' }).catch(() => null),
  ]).then(([camera, microphone]) => {
    const handler = () => callback({ camera, microphone });
    camera?.addEventListener('change', handler);
    microphone?.addEventListener('change', handler);
    cleanups.push(() => {
      camera?.removeEventListener('change', handler);
      microphone?.removeEventListener('change', handler);
    });
  });

  return () => cleanups.forEach((fn) => fn());
}
