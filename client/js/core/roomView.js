/**
 * QuickMeet — Room View
 * UI reactions to application events. No WebRTC or signaling logic.
 */

import { AppEvents, on as onAppEvent } from './appEvents.js';
import * as media from '../webrtc/media/media.js';
import * as screenManager from '../webrtc/screen/screenManager.js';
import * as callManager from '../webrtc/controls/callManager.js';
import * as toolbarController from '../webrtc/controls/toolbarController.js';
import * as meetChrome from '../ui/meetChrome.js';

/** @type {boolean} */
let isMediaActive = false;

/** DOM refs */
let localVideo = null;
let videoPreview = null;
let mediaLoading = null;
let videoPlaceholder = null;
let placeholderLabel = null;
let placeholderHint = null;

/** @type {((message: string, type?: string) => void)|null} */
let notify = null;

/** @type {((message?: string) => void)|null} */
let setStatus = null;

/** @type {((state: string, label: string) => void)|null} */
let setWaitingBadge = null;

/**
 * Bind DOM elements and notification helpers.
 * @param {Object} options
 */
export function bind(options) {
  localVideo = options.localVideo;
  videoPreview = options.videoPreview;
  mediaLoading = options.mediaLoading;
  videoPlaceholder = options.videoPlaceholder;
  placeholderLabel = options.placeholderLabel;
  placeholderHint = options.placeholderHint;
  notify = options.notify;
  setStatus = options.setStatus;
  setWaitingBadge = options.setWaitingBadge;
}

/**
 * Subscribe to all application events that drive room UI.
 */
export function registerHandlers() {
  onAppEvent(AppEvents.MEDIA_READY, () => {
    isMediaActive = true;
    showMediaLoading(false);
    showMediaPreview(true);
    toolbarController.setMediaControlsEnabled(true);
  });

  onAppEvent(AppEvents.MEDIA_PERMISSION_DENIED, ({ message }) => {
    showMediaLoading(false);
    showMediaPreview(false, message);
    notify?.(message, 'error');
  });

  onAppEvent(AppEvents.MEDIA_STOPPED, () => {
    isMediaActive = false;
    showMediaLoading(false);
    showMediaPreview(false);
    toolbarController.setMediaControlsEnabled(false);
  });

  onAppEvent(AppEvents.MEDIA_DEVICE_CHANGED, () => {
    // Device list updates are handled via DEVICES_UPDATED / DEVICE_CONNECTED events.
  });

  onAppEvent(AppEvents.ROOM_WAITING, () => {
    setStatus?.('Waiting for another participant…');
    setWaitingBadge?.('waiting', 'Waiting');
  });

  onAppEvent(AppEvents.ROOM_READY, () => {
    setStatus?.('Participant connected — preparing call…');
    setWaitingBadge?.('ready', 'Ready');
  });

  onAppEvent(AppEvents.USER_JOINED, () => {
    meetChrome.setParticipantCount(2);
    notify?.('Another participant joined the room');
  });

  onAppEvent(AppEvents.USER_LEFT, () => {
    meetChrome.setParticipantCount(1);
    notify?.('Participant left the room');
    setStatus?.('Waiting for another participant…');
    setWaitingBadge?.('waiting', 'Waiting');
    videoPreview?.classList.remove('video-preview--in-call', 'video-preview--screen-sharing');
    localVideo?.classList.remove('video-preview__local--screen');
    toolbarController.setScreenShareEnabled(false);
    showRemoteTileName(false);
  });

  onAppEvent(AppEvents.SOCKET_ERROR, ({ message }) => {
    if (message) notify?.(message, 'error');
  });

  onAppEvent(AppEvents.SOCKET_DISCONNECTED, ({ reason }) => {
    if (reason === 'connect-failed') {
      notify?.('Failed to connect to server', 'error');
      setStatus?.('Connection failed. Please refresh.');
    } else {
      notify?.('Disconnected from server', 'error');
      setStatus?.('Connection lost. Please refresh.');
    }
  });

  onAppEvent(AppEvents.PEER_NEGOTIATION_STARTED, () => {
    setStatus?.('Connecting to participant…');
  });

  onAppEvent(AppEvents.PEER_NEGOTIATION_COMPLETED, () => {
    setStatus?.('Negotiation complete — establishing connection…');
  });

  onAppEvent(AppEvents.CALL_STARTED, () => {
    toolbarController.setScreenShareEnabled(true);
    setStatus?.('Connected — video call active');
    setWaitingBadge?.('ready', 'Connected');
    notify?.('Peer connected');
  });

  onAppEvent(AppEvents.REMOTE_STREAM_READY, () => {
    videoPreview?.classList.add('video-preview--in-call');
    showRemoteTileName(true);
  });

  onAppEvent(AppEvents.ICE_CONNECTED, () => {
    setStatus?.('Connected — video call active');
  });

  onAppEvent(AppEvents.ICE_FAILED, () => {
    notify?.('Connection failed. ICE negotiation error.', 'error');
    setStatus?.('Connection failed');
  });

  onAppEvent(AppEvents.PEER_DISCONNECTED, () => {
    setStatus?.('Participant disconnected');
    setWaitingBadge?.('waiting', 'Waiting');
    meetChrome.setParticipantCount(1);
    videoPreview?.classList.remove('video-preview--in-call');
    videoPreview?.classList.remove('video-preview--screen-sharing');
    localVideo?.classList.remove('video-preview__local--screen');
    toolbarController.setScreenShareEnabled(false);
    showRemoteTileName(false);
  });

  onAppEvent(AppEvents.VIDEO_DISABLED, () => {
    videoPreview?.classList.add('video-preview--camera-off');
    showCameraOffAvatar(true);
  });

  onAppEvent(AppEvents.VIDEO_ENABLED, () => {
    videoPreview?.classList.remove('video-preview--camera-off');
    showCameraOffAvatar(false);
    if (isMediaActive) {
      videoPreview?.classList.add('video-preview--live');
    }
  });

  onAppEvent(AppEvents.CALL_ENDED, () => {
    videoPreview?.classList.remove('video-preview--in-call', 'video-preview--camera-off', 'video-preview--live');
  });

  onAppEvent(AppEvents.SCREEN_SHARE_STARTED, () => {
    notify?.('Screen sharing started');
    toolbarController.setScreenShareEnabled(true);
  });

  onAppEvent(AppEvents.SCREEN_SHARE_STOPPED, () => {
    notify?.('Screen sharing stopped');
    const cameraStream = media.getLocalStream();
    if (cameraStream) {
      updateLocalPreviewStream(cameraStream);
    }
    if (callManager.getState().callActive) {
      toolbarController.setScreenShareEnabled(true);
    }
  });

  onAppEvent(AppEvents.SCREEN_SHARE_FAILED, ({ message }) => {
    if (message) notify?.(message, 'error');
  });

  onAppEvent(AppEvents.CAMERA_CHANGED, () => {
    const stream = media.getLocalStream();
    if (stream && !screenManager.isScreenSharing()) {
      updateLocalPreviewStream(stream);
    }
    notify?.('Camera switched');
  });

  onAppEvent(AppEvents.MIC_CHANGED, () => {
    notify?.('Microphone switched');
  });

  onAppEvent(AppEvents.DEVICE_CONNECTED, ({ device }) => {
    const label = device?.label || 'A device';
    notify?.(`${label} connected`);
  });

  onAppEvent(AppEvents.DEVICE_DISCONNECTED, () => {
    notify?.('A media device was disconnected', 'error');
  });

  onAppEvent(AppEvents.PERMISSION_CHANGED, ({ camera, microphone }) => {
    if (camera === 'denied') {
      notify?.('Camera permission was revoked', 'error');
    }
    if (microphone === 'denied') {
      notify?.('Microphone permission was revoked', 'error');
    }
  });

  onAppEvent(AppEvents.SETTINGS_APPLIED, () => {
    notify?.('Device settings applied');
  });
}

/**
 * Update local video preview for camera or screen stream.
 * @param {MediaStream|null} stream
 */
export function updateLocalPreviewStream(stream) {
  if (!localVideo) return;

  if (stream) {
    localVideo.srcObject = stream;
    localVideo.muted = true;
    localVideo.classList.toggle('video-preview__local--screen', screenManager.isScreenSharing());
    videoPreview?.classList.add('video-preview--live');
    videoPreview?.classList.toggle('video-preview--screen-sharing', screenManager.isScreenSharing());
    localVideo.play().catch(() => {});
  } else {
    localVideo.srcObject = null;
    videoPreview?.classList.remove('video-preview--screen-sharing');
    localVideo.classList.remove('video-preview__local--screen');
  }
}

/**
 * @param {boolean} visible
 */
export function showMediaLoading(visible) {
  if (mediaLoading) {
    mediaLoading.hidden = !visible;
  }
}

/**
 * @param {boolean} active
 * @param {string} [errorMessage]
 */
function showMediaPreview(active, errorMessage = '') {
  if (videoPreview) {
    videoPreview.classList.toggle('video-preview--live', active);
  }

  if (videoPlaceholder) {
    videoPlaceholder.hidden = active;

    if (!active && errorMessage) {
      if (placeholderLabel) placeholderLabel.textContent = 'Camera unavailable';
      if (placeholderHint) placeholderHint.textContent = errorMessage;
    } else if (!active) {
      if (placeholderLabel) placeholderLabel.textContent = 'Camera Preview';
      if (placeholderHint) placeholderHint.textContent = 'Your camera will appear here';
    }
  }
}

/**
 * @returns {boolean}
 */
export function getMediaActive() {
  return isMediaActive;
}

/**
 * @param {boolean} visible
 */
function showRemoteTileName(visible) {
  const remoteName = document.getElementById('tile-name-remote');
  const localName = document.getElementById('tile-name-local');
  if (remoteName) remoteName.hidden = !visible;
  if (localName) localName.hidden = visible;
}

/**
 * @param {boolean} visible
 */
function showCameraOffAvatar(visible) {
  if (!videoPlaceholder || !isMediaActive) return;

  videoPlaceholder.hidden = !visible;
  if (placeholderLabel) placeholderLabel.hidden = visible;
  if (placeholderHint) placeholderHint.hidden = visible;
}
