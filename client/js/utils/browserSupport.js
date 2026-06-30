/**
 * QuickMeet — Browser Capability Checks
 * Graceful fallbacks for unsupported APIs (Phase 10).
 */

/**
 * @returns {{ supported: boolean, message: string|null }}
 */
export function checkWebRTCSupport() {
  if (typeof window === 'undefined') {
    return { supported: false, message: 'Browser environment required.' };
  }

  if (!window.RTCPeerConnection) {
    return {
      supported: false,
      message: 'WebRTC is not supported in this browser. Please use Chrome, Edge, Firefox, or Safari 11+.',
    };
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return {
      supported: false,
      message: 'Camera and microphone access is not supported in this browser.',
    };
  }

  return { supported: true, message: null };
}

/**
 * @returns {boolean}
 */
export function supportsReplaceTrack() {
  return typeof RTCRtpSender !== 'undefined' &&
    typeof RTCRtpSender.prototype.replaceTrack === 'function';
}

/**
 * @returns {boolean}
 */
export function supportsDisplayMedia() {
  return typeof navigator.mediaDevices?.getDisplayMedia === 'function';
}

/**
 * @returns {boolean}
 */
export function supportsPermissionsQuery() {
  return typeof navigator.permissions?.query === 'function';
}

/**
 * Log browser compatibility summary (development only).
 */
export function logCompatibility() {
  const { supported, message } = checkWebRTCSupport();
  if (!supported && message) {
    console.warn('[QuickMeet] Compatibility:', message);
  }
}
