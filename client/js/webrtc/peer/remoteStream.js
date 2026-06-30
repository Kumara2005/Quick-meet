/**
 * QuickMeet — Remote Media Stream Handler
 * Receives and displays the remote participant's video. No negotiation logic.
 */

/** @type {MediaStream|null} */
let remoteStream = null;

/**
 * Register ontrack handler to capture remote MediaStream.
 * @param {RTCPeerConnection} pc
 * @param {Function} onStreamReady - Called when remote stream is available
 */
export function setupRemoteTrackHandler(pc, onStreamReady) {
  pc.ontrack = (event) => {
    if (event.streams && event.streams[0]) {
      remoteStream = event.streams[0];
      onStreamReady(remoteStream);
      return;
    }

    if (!remoteStream) {
      remoteStream = new MediaStream();
    }

    remoteStream.addTrack(event.track);
    onStreamReady(remoteStream);
  };
}

/**
 * Attach remote MediaStream to a video element.
 * @param {HTMLVideoElement} videoElement
 * @param {MediaStream} stream
 */
export function attachRemoteStream(videoElement, stream) {
  if (!videoElement || !stream) return;

  videoElement.srcObject = stream;
  videoElement.autoplay = true;
  videoElement.playsInline = true;
  videoElement.muted = false;

  videoElement.play().catch(() => {
    // Autoplay may require user gesture for remote audio.
  });
}

/**
 * Get the current remote MediaStream.
 * @returns {MediaStream|null}
 */
export function getRemoteStream() {
  return remoteStream;
}

/**
 * Stop remote tracks and clear the video element.
 * @param {HTMLVideoElement|null} videoElement
 */
export function clearRemoteStream(videoElement = null) {
  remoteStream = null;

  if (videoElement) {
    videoElement.srcObject = null;
  }
}
