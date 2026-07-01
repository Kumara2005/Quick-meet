/**
 * QuickMeet — Presentation layout (UI only)
 * Swaps which stream is shown in the primary vs PiP video elements.
 */

import { AppEvents, on as onAppEvent } from '../core/appEvents.js';
import * as media from '../webrtc/media/media.js';
import * as screenManager from '../webrtc/screen/screenManager.js';
import { getRemoteStream } from '../webrtc/peer/remoteStream.js';
import {
  displayStreamFromTrack,
  isScreenShareStream,
  pickRemoteVideoTrack,
} from '../utils/screenShareDetect.js';
import * as cameraOffUI from './cameraOffUI.js';

/** @type {HTMLVideoElement|null} */
let localVideo = null;

/** @type {HTMLVideoElement|null} */
let remoteVideo = null;

/** @type {HTMLElement|null} */
let videoPreview = null;

/** @type {MediaStream|null} */
let watchedRemoteStream = null;

/** @type {number|null} */
let trackPollInterval = null;

/** @type {boolean} */
let handlersRegistered = false;

/** @type {Function|null} */
let onRemoteStreamTrackChange = null;

/**
 * @param {{
 *   localVideo: HTMLVideoElement|null,
 *   remoteVideo: HTMLVideoElement|null,
 *   videoPreview: HTMLElement|null,
 * }} options
 */
export function init(options) {
  localVideo = options.localVideo;
  remoteVideo = options.remoteVideo;
  videoPreview = options.videoPreview;

  if (handlersRegistered) {
    refresh();
    return;
  }

  handlersRegistered = true;

  onAppEvent(AppEvents.MEDIA_READY, refresh);
  onAppEvent(AppEvents.REMOTE_STREAM_READY, handleRemoteStreamReady);
  onAppEvent(AppEvents.SCREEN_SHARE_STARTED, refresh);
  onAppEvent(AppEvents.SCREEN_SHARE_STOPPED, refresh);
  onAppEvent(AppEvents.USER_LEFT, handleRemoteStreamCleared);
  onAppEvent(AppEvents.PEER_DISCONNECTED, handleRemoteStreamCleared);
  onAppEvent(AppEvents.CALL_ENDED, handleRemoteStreamCleared);
  onAppEvent(AppEvents.CAMERA_CHANGED, refresh);

  startTrackPolling();
  refresh();
}

/**
 * Called when screen manager updates the local preview stream.
 * @param {MediaStream|null} _stream
 */
export function onPreviewStreamUpdate(_stream) {
  refresh();
}

/**
 * Re-apply primary / PiP stream assignment.
 */
export function refresh() {
  if (!localVideo || !remoteVideo || !videoPreview) return;

  const inCall = videoPreview.classList.contains('video-preview--in-call');
  const localSharing = screenManager.isScreenSharing();
  const remoteStream = getRemoteStream();
  const remoteSharing = Boolean(inCall && remoteStream && isScreenShareStream(remoteStream));
  const presentationActive = inCall && (localSharing || remoteSharing);

  const localCamera = media.getLocalStream();
  const localScreen = screenManager.getScreenState().screenStream;

  videoPreview.classList.toggle('video-preview--presentation', presentationActive);
  videoPreview.classList.toggle('video-preview--local-presenting', presentationActive && localSharing);
  videoPreview.classList.toggle('video-preview--remote-presenting', presentationActive && remoteSharing);

  if (presentationActive) {
    applyPresentationLayout({
      localSharing,
      remoteSharing,
      localCamera,
      localScreen,
      remoteStream,
    });
    return;
  }

  applyNormalLayout({
    localSharing,
    inCall,
    localCamera,
    localScreen,
    remoteStream,
  });
}

/**
 * @param {Object} options
 */
function applyPresentationLayout(options) {
  const { localSharing, remoteSharing, localCamera, localScreen, remoteStream } = options;

  videoPreview?.classList.remove('video-preview--screen-sharing');

  const primaryTrack = localSharing
    ? localScreen?.getVideoTracks()[0] || null
    : pickRemoteVideoTrack(remoteStream, 'screen');

  const primaryStream = displayStreamFromTrack(primaryTrack)
    || (localSharing ? localScreen : remoteStream);

  assignVideo(remoteVideo, primaryStream, {
    muted: localSharing,
    screen: true,
    mirror: false,
  });

  assignVideo(localVideo, localCamera, {
    muted: true,
    screen: false,
    mirror: true,
  });

  remoteVideo?.classList.toggle(
    'video-preview__remote--screen',
    localSharing || remoteSharing
  );
  localVideo?.classList.remove('video-preview__local--screen');
  cameraOffUI.refresh();
}

/**
 * @param {Object} options
 */
function applyNormalLayout(options) {
  const { localSharing, inCall, localCamera, localScreen, remoteStream } = options;

  videoPreview?.classList.toggle('video-preview--screen-sharing', localSharing && !inCall);
  videoPreview?.classList.remove('video-preview--local-presenting');
  videoPreview?.classList.remove('video-preview--remote-presenting');
  remoteVideo?.classList.remove('video-preview__remote--screen');

  if (localSharing && !inCall) {
    assignVideo(localVideo, localScreen || localCamera, {
      muted: true,
      screen: true,
      mirror: false,
    });
    localVideo?.classList.add('video-preview__local--screen');
  } else if (localCamera) {
    assignVideo(localVideo, localCamera, {
      muted: true,
      screen: false,
      mirror: true,
    });
    localVideo?.classList.remove('video-preview__local--screen');
  }

  if (inCall && remoteStream) {
    const cameraTrack = pickRemoteVideoTrack(remoteStream, 'camera');
    const remoteDisplay = displayStreamFromTrack(cameraTrack) || remoteStream;
    assignVideo(remoteVideo, remoteDisplay, {
      muted: false,
      screen: false,
      mirror: false,
    });
  } else if (!inCall) {
    remoteVideo.srcObject = null;
  }

  cameraOffUI.refresh();
}

/**
 * @param {HTMLVideoElement|null} element
 * @param {MediaStream|null} stream
 * @param {{ muted: boolean, screen: boolean, mirror: boolean }} options
 */
function assignVideo(element, stream, options) {
  if (!element) return;

  if (!stream) {
    element.srcObject = null;
    return;
  }

  const currentStream = element.srcObject;
  const currentTrack = currentStream instanceof MediaStream
    ? currentStream.getVideoTracks()[0]
    : null;
  const nextTrack = stream.getVideoTracks()[0];

  if (!currentTrack || !nextTrack || currentTrack.id !== nextTrack.id) {
    element.srcObject = stream;
  }

  element.muted = options.muted;
  element.playsInline = true;
  element.play().catch(() => {});
}

function handleRemoteStreamReady() {
  watchRemoteStream(getRemoteStream());
  refresh();
}

function handleRemoteStreamCleared() {
  watchRemoteStream(null);
  refresh();
}

/**
 * @param {MediaStream|null} stream
 */
function watchRemoteStream(stream) {
  if (watchedRemoteStream === stream) {
    evaluateRemoteStream();
    return;
  }

  if (watchedRemoteStream) {
    watchedRemoteStream.removeEventListener('addtrack', onRemoteStreamTrackChange);
    watchedRemoteStream.removeEventListener('removetrack', onRemoteStreamTrackChange);
  }

  watchedRemoteStream = stream;

  if (!stream) return;

  onRemoteStreamTrackChange = () => {
    evaluateRemoteStream();
    refresh();
  };

  stream.addEventListener('addtrack', onRemoteStreamTrackChange);
  stream.addEventListener('removetrack', onRemoteStreamTrackChange);

  stream.getVideoTracks().forEach((track) => {
    track.addEventListener('ended', onRemoteStreamTrackChange);
    track.addEventListener('mute', onRemoteStreamTrackChange);
    track.addEventListener('unmute', onRemoteStreamTrackChange);
  });

  evaluateRemoteStream();
  refresh();
}

function evaluateRemoteStream() {
  refresh();
}

function startTrackPolling() {
  stopTrackPolling();
  trackPollInterval = window.setInterval(() => {
    if (!videoPreview?.classList.contains('video-preview--in-call')) return;
    refresh();
  }, 1200);
}

function stopTrackPolling() {
  if (trackPollInterval !== null) {
    clearInterval(trackPollInterval);
    trackPollInterval = null;
  }
}

export function destroy() {
  stopTrackPolling();
  watchRemoteStream(null);
  handlersRegistered = false;
}
