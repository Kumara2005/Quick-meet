/**
 * QuickMeet — Camera-off placeholders (UI only)
 * Hides frozen video frames and shows avatar placeholders when camera is disabled.
 */

import { AppEvents, on as onAppEvent } from '../core/appEvents.js';
import * as media from '../webrtc/media/media.js';
import * as screenManager from '../webrtc/screen/screenManager.js';
import { getRemoteStream } from '../webrtc/peer/remoteStream.js';
import * as videoControl from '../webrtc/controls/videoControl.js';
import { isScreenShareTrack } from '../utils/screenShareDetect.js';

/** @type {HTMLElement|null} */
let videoPreview = null;

/** @type {HTMLElement|null} */
let localPlaceholder = null;

/** @type {HTMLElement|null} */
let remotePlaceholder = null;

/** @type {HTMLElement|null} */
let localInitial = null;

/** @type {HTMLElement|null} */
let remoteInitial = null;

/** @type {MediaStream|null} */
let watchedRemoteStream = null;

/** @type {number|null} */
let pollInterval = null;

/** @type {boolean} */
let handlersRegistered = false;

/** @type {Function|null} */
let onRemoteTrackChange = null;

/**
 * @param {{ videoPreview: HTMLElement|null }} options
 */
export function init(options) {
  videoPreview = options.videoPreview;

  localPlaceholder = document.getElementById('camera-off-local');
  remotePlaceholder = document.getElementById('camera-off-remote');
  localInitial = document.getElementById('camera-off-local-initial');
  remoteInitial = document.getElementById('camera-off-remote-initial');

  localPlaceholder?.removeAttribute('hidden');
  remotePlaceholder?.removeAttribute('hidden');

  syncInitialsFromTileNames();

  if (handlersRegistered) {
    refresh();
    return;
  }

  handlersRegistered = true;

  onAppEvent(AppEvents.MEDIA_READY, refresh);
  onAppEvent(AppEvents.REMOTE_STREAM_READY, handleRemoteStreamReady);
  onAppEvent(AppEvents.VIDEO_DISABLED, refresh);
  onAppEvent(AppEvents.VIDEO_ENABLED, refresh);
  onAppEvent(AppEvents.SCREEN_SHARE_STARTED, refresh);
  onAppEvent(AppEvents.SCREEN_SHARE_STOPPED, refresh);
  onAppEvent(AppEvents.USER_LEFT, handleRemoteStreamCleared);
  onAppEvent(AppEvents.PEER_DISCONNECTED, handleRemoteStreamCleared);
  onAppEvent(AppEvents.CALL_ENDED, handleRemoteStreamCleared);

  startPolling();
  refresh();
}

/**
 * Re-evaluate camera-off UI after layout changes.
 */
export function refresh() {
  if (!videoPreview) return;

  const inCall = videoPreview.classList.contains('video-preview--in-call');
  const presentation = videoPreview.classList.contains('video-preview--presentation');
  const localSharing = screenManager.isScreenSharing();
  const remoteStream = getRemoteStream();

  const localCameraOff = isLocalCameraOff();
  const remoteCameraOff = isRemoteCameraOff(remoteStream, { inCall, presentation, localSharing });

  videoPreview.classList.toggle('video-preview--local-camera-off', localCameraOff);
  videoPreview.classList.toggle('video-preview--remote-camera-off', remoteCameraOff);

  localPlaceholder?.setAttribute('aria-hidden', String(!localCameraOff));
  remotePlaceholder?.setAttribute('aria-hidden', String(!remoteCameraOff));

  syncInitialsFromTileNames();
}

/**
 * @returns {boolean}
 */
function isLocalCameraOff() {
  if (!media.getLocalStream()) return false;
  if (screenManager.isScreenSharing()) return false;
  return !videoControl.isCameraEnabled();
}

/**
 * @param {MediaStream|null} remoteStream
 * @param {{ inCall: boolean, presentation: boolean, localSharing: boolean }} context
 * @returns {boolean}
 */
function isRemoteCameraOff(remoteStream, context) {
  if (!context.inCall || !remoteStream) return false;

  if (context.presentation && !context.localSharing) {
    return false;
  }

  const track = getRemoteCameraTrack(remoteStream);
  if (!track || isScreenShareTrack(track)) return false;

  return !track.enabled;
}

/**
 * @param {MediaStream|null} stream
 * @returns {MediaStreamTrack|null}
 */
function getRemoteCameraTrack(stream) {
  if (!stream) return null;

  const tracks = stream.getVideoTracks();
  const cameraTrack = tracks.find((track) => !isScreenShareTrack(track));
  return cameraTrack || tracks[0] || null;
}

function syncInitialsFromTileNames() {
  const localName = document.getElementById('tile-name-local')?.textContent?.trim() || 'You';
  const remoteName = document.getElementById('tile-name-remote')?.textContent?.trim() || '';

  if (localInitial) {
    localInitial.textContent = initialsFromName(localName) || 'Y';
  }

  if (remoteInitial) {
    remoteInitial.textContent = initialsFromName(remoteName) || 'P';
  }
}

/**
 * @param {string} name
 * @returns {string|null}
 */
function initialsFromName(name) {
  if (!name) return null;

  const normalized = name.trim();
  if (!normalized) return null;

  if (/^you$/i.test(normalized)) return 'Y';

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return parts[0].slice(0, 1).toUpperCase();
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
    refresh();
    return;
  }

  if (watchedRemoteStream && onRemoteTrackChange) {
    watchedRemoteStream.removeEventListener('addtrack', onRemoteTrackChange);
    watchedRemoteStream.removeEventListener('removetrack', onRemoteTrackChange);
  }

  watchedRemoteStream = stream;

  if (!stream) return;

  onRemoteTrackChange = () => refresh();

  stream.addEventListener('addtrack', onRemoteTrackChange);
  stream.addEventListener('removetrack', onRemoteTrackChange);

  stream.getVideoTracks().forEach((track) => {
    track.addEventListener('mute', onRemoteTrackChange);
    track.addEventListener('unmute', onRemoteTrackChange);
    track.addEventListener('ended', onRemoteTrackChange);
  });
}

function startPolling() {
  stopPolling();
  pollInterval = window.setInterval(refresh, 800);
}

function stopPolling() {
  if (pollInterval !== null) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

export function destroy() {
  stopPolling();
  watchRemoteStream(null);
  handlersRegistered = false;
  videoPreview?.classList.remove('video-preview--local-camera-off', 'video-preview--remote-camera-off');
  localPlaceholder?.setAttribute('aria-hidden', 'true');
  remotePlaceholder?.setAttribute('aria-hidden', 'true');
}
