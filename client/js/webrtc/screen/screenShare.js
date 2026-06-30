/**
 * QuickMeet — Screen Capture
 * Requests display media from the browser. No UI or track replacement logic.
 */

/**
 * Check if screen sharing is supported.
 * @returns {boolean}
 */
export function isScreenShareSupported() {
  return Boolean(navigator.mediaDevices?.getDisplayMedia);
}

/**
 * Map getDisplayMedia errors to readable messages.
 * @param {Error|DOMException} error
 * @returns {string}
 */
export function getScreenShareErrorMessage(error) {
  const name = error?.name || '';

  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Screen sharing permission was denied.';
    case 'NotFoundError':
      return 'No screen or window was selected.';
    case 'AbortError':
      return 'Screen sharing was cancelled.';
    case 'NotReadableError':
      return 'Unable to capture the selected screen.';
    default:
      return error?.message || 'Failed to start screen sharing.';
  }
}

/**
 * Request a screen capture MediaStream from the browser.
 * @returns {Promise<MediaStream>}
 */
export async function requestScreenStream() {
  if (!isScreenShareSupported()) {
    throw new Error('Screen sharing is not supported in this browser.');
  }

  return navigator.mediaDevices.getDisplayMedia({
    video: {
      cursor: 'always',
    },
    audio: false,
  });
}

/**
 * Stop all tracks on a screen MediaStream.
 * @param {MediaStream|null} stream
 */
export function releaseScreenStream(stream) {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
}
