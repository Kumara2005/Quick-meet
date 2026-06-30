/**
 * QuickMeet — Waiting Room Page
 * Phase 8.5: Central app event bus + call controller orchestration.
 */

import { startBridge, stopBridge } from './core/eventBridge.js';
import * as callController from './core/callController.js';
import * as roomView from './core/roomView.js';
import * as callManager from './webrtc/controls/callManager.js';
import * as toolbarController from './webrtc/controls/toolbarController.js';
import * as screenManager from './webrtc/screen/screenManager.js';
import * as healthIndicator from './ui/healthIndicator.js';
import * as deviceMenu from './ui/deviceMenu.js';
import * as settingsModal from './ui/settingsModal.js';
import * as remoteFullscreen from './ui/remoteFullscreen.js';
import * as chatController from './chat/chatController.js';
import * as chatPanel from './chat/chatPanel.js';
import * as reactionOverlay from './reactions/reactionOverlay.js';
import { AppConfig } from './config/appConfig.js';
import { checkWebRTCSupport } from './utils/browserSupport.js';
import { buildMeetingUrl, copyToClipboard } from './utils/meetingLink.js';
import { resolveRoomAccess } from './utils/roomAccess.js';
import { AppEvents, on as onAppEvent } from './core/appEvents.js';
import * as meetChrome from './ui/meetChrome.js';

/** @type {string|null} */
let currentRoomCode = null;

/** @type {string|null} */
let currentMeetingUrl = null;

/** @type {boolean} */
let sessionAborted = false;

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const videoPreview = document.getElementById('video-preview');
const mediaLoading = document.getElementById('media-loading');
const videoPlaceholder = document.getElementById('video-placeholder');
const placeholderLabel = document.getElementById('video-placeholder-label');
const placeholderHint = document.getElementById('video-placeholder-hint');
const joiningOverlay = document.getElementById('room-joining-overlay');
const joiningMessage = document.getElementById('room-joining-message');
const joiningSpinner = document.getElementById('room-joining-spinner');

const COPY_FEEDBACK_MS = 2000;

function getRoomCodeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('room');
  return code ? code.trim().toUpperCase() : null;
}

export function initializeRoom() {
  const compat = checkWebRTCSupport();
  if (!compat.supported) {
    showNotification(compat.message || 'Browser not supported', 'error');
  }

  currentRoomCode = getRoomCodeFromUrl();
  const roomCodeDisplay = document.getElementById('room-code-display');
  const meetingLinkDisplay = document.getElementById('meeting-link-display');
  const copyMeetingLinkBtn = document.getElementById('copy-meeting-link-btn');

  if (!currentRoomCode || !AppConfig.ROOM_CODE_PATTERN.test(currentRoomCode)) {
    showMeetingNotFound('No valid room code provided.');
    return;
  }

  if (roomCodeDisplay) {
    roomCodeDisplay.textContent = currentRoomCode;
  }

  currentMeetingUrl = buildMeetingUrl(currentRoomCode);

  if (meetingLinkDisplay) {
    meetingLinkDisplay.textContent = currentMeetingUrl;
  }

  copyMeetingLinkBtn?.addEventListener('click', () => {
    copyMeetingLinkWithFeedback();
  });

  meetChrome.initMeetChrome();
  meetChrome.setParticipantCount(1);

  startBridge();

  roomView.bind({
    localVideo,
    videoPreview,
    mediaLoading,
    videoPlaceholder,
    placeholderLabel,
    placeholderHint,
    notify: showNotification,
    setStatus: updateWaitingStatus,
    setWaitingBadge: updateBadge,
  });
  roomView.registerHandlers();

  onAppEvent(AppEvents.SOCKET_ERROR, ({ message }) => {
    if (message && /not found/i.test(message)) {
      showMeetingNotFound('Meeting not found.');
    }
  });

  callController.init({
    roomCode: currentRoomCode,
    remoteVideo,
    localVideo,
  });

  callController.initDeviceManagement({
    onPreviewUpdate: roomView.updateLocalPreviewStream,
  });

  setupScreenManager();
  setupCallManager();
  healthIndicator.init();
  settingsModal.init();
  deviceMenu.init();

  remoteFullscreen.init({
    remoteVideo,
    fullscreenBtn: document.getElementById('btn-remote-fullscreen'),
    onNotify: showNotification,
  });

  chatController.init({
    getSelfPeerId: () => callController.getSelfPeerId(),
  });
  chatPanel.init({ onNotify: showNotification });

  reactionOverlay.init({
    getSelfPeerId: () => callController.getSelfPeerId(),
    localVideo,
    remoteVideo,
    onNotify: showNotification,
  });

  onAppEvent(AppEvents.UNREAD_COUNT_CHANGED, () => {
    chatPanel.onUnreadCountChanged();
  });

  void bootstrapSession();
}

async function bootstrapSession() {
  showJoiningOverlay(true, 'Joining meeting…');

  const access = await resolveRoomAccess(currentRoomCode);

  if (access === 'not-found') {
    showMeetingNotFound('Meeting not found.');
    return;
  }

  if (access === 'full') {
    showMeetingNotFound('This meeting is full.');
    return;
  }

  if (access === 'error') {
    showMeetingNotFound('Unable to join this meeting. Please try again.');
    return;
  }

  if (sessionAborted) return;

  showJoiningOverlay(true, 'Connecting…');

  try {
    await callController.initializeMedia((loading) => {
      roomView.showMediaLoading(loading);
    });
  } catch {
    // MEDIA_PERMISSION_DENIED is bridged to the app bus and handled by roomView.
  }

  if (sessionAborted) return;

  try {
    await callController.connectSignaling();
  } catch {
    // SOCKET_DISCONNECTED is dispatched by callController.connectSignaling.
  } finally {
    showJoiningOverlay(false);
  }
}

function setupScreenManager() {
  screenManager.init({
    getPeerConnection: () => callController.getPeerConnection(),
    onLocalPreviewUpdate: roomView.updateLocalPreviewStream,
    onError: (message) => showNotification(message, 'error'),
  });
}

function setupCallManager() {
  callManager.init({
    onEndCall: async () => {
      sessionAborted = true;
      remoteFullscreen.destroy();
      reactionOverlay.destroy();
      chatPanel.destroy();
      chatController.destroy();
      meetChrome.destroyMeetChrome();
      screenManager.cleanupScreenShare();
      callController.destroySession();
      toolbarController.destroyToolbar();
      deviceMenu.destroy();
      settingsModal.destroy();
      stopBridge();
      window.location.href = '/';
    },
  });
}

export function initializeToolbar() {
  toolbarController.initToolbar({
    onCameraVisualChange: (enabled) => {
      if (!enabled) {
        videoPreview?.classList.add('video-preview--camera-off');
      } else if (roomView.getMediaActive()) {
        videoPreview?.classList.remove('video-preview--camera-off');
        videoPreview?.classList.add('video-preview--live');
      }
      const placeholder = document.getElementById('video-placeholder');
      const label = document.getElementById('video-placeholder-label');
      const hint = document.getElementById('video-placeholder-hint');
      if (!placeholder || !roomView.getMediaActive()) return;
      placeholder.hidden = enabled;
      if (label) label.hidden = !enabled;
      if (hint) hint.hidden = !enabled;
    },
  });
}

export function updateWaitingStatus(message = 'Waiting for another participant…') {
  const statusText = document.getElementById('status-text');
  if (statusText) {
    statusText.textContent = message;
  }
}

function updateBadge(state, label) {
  const badge = document.getElementById('waiting-badge');
  if (!badge) return;

  badge.className = `badge badge--${state}`;
  badge.innerHTML = `<span class="badge__dot" aria-hidden="true"></span>${label}`;
}

function showNotification(message, type = 'info') {
  const area = document.getElementById('notification-area');
  if (!area) return;

  const toast = document.createElement('div');
  toast.className = `notification${type === 'error' ? ' notification--error' : ''}`;
  toast.textContent = message;
  area.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('notification--fade-out');
    setTimeout(() => toast.remove(), AppConfig.NOTIFICATION_FADE_MS);
  }, AppConfig.NOTIFICATION_DURATION_MS);
}

/**
 * Copy meeting URL with success animation.
 */
async function copyMeetingLinkWithFeedback() {
  const btn = document.getElementById('copy-meeting-link-btn');
  if (!btn || !currentMeetingUrl) return;

  try {
    await copyToClipboard(currentMeetingUrl);
    btn.classList.add('meeting-info-popover__copy-btn--copied');
    showNotification('Meeting link copied');

    window.setTimeout(() => {
      btn.classList.remove('meeting-info-popover__copy-btn--copied');
    }, COPY_FEEDBACK_MS);
  } catch {
    showNotification('Failed to copy', 'error');
  }
}

/**
 * @param {boolean} visible
 * @param {string} [message]
 */
function showJoiningOverlay(visible, message = 'Joining meeting…') {
  if (!joiningOverlay) return;

  joiningOverlay.hidden = !visible;

  if (joiningMessage) {
    joiningMessage.textContent = message;
  }

  if (joiningSpinner) {
    joiningSpinner.hidden = !visible;
  }
}

/**
 * @param {string} message
 */
function showMeetingNotFound(message) {
  sessionAborted = true;
  showJoiningOverlay(true, message);

  if (joiningSpinner) {
    joiningSpinner.hidden = true;
  }

  updateWaitingStatus(message);
  updateBadge('waiting', 'Unavailable');
  showNotification(message, 'error');

  window.setTimeout(() => {
    window.location.href = '/';
  }, AppConfig.ROOM_REDIRECT_DELAY_MS);
}

document.addEventListener('DOMContentLoaded', () => {
  initializeToolbar();
  initializeRoom();
  updateWaitingStatus();
});

window.addEventListener('beforeunload', () => {
  healthIndicator.stop();
  remoteFullscreen.destroy();
  reactionOverlay.destroy();
  chatPanel.destroy();
  chatController.destroy();
  meetChrome.destroyMeetChrome();
  screenManager.cleanupScreenShare();
  callController.destroySession();
  toolbarController.destroyToolbar();
  deviceMenu.destroy();
  settingsModal.destroy();
  stopBridge();
});
