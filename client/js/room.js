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
import { AppConfig } from './config/appConfig.js';
import { checkWebRTCSupport } from './utils/browserSupport.js';

/** @type {string|null} */
let currentRoomCode = null;

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const videoPreview = document.getElementById('video-preview');
const mediaLoading = document.getElementById('media-loading');
const videoPlaceholder = document.getElementById('video-placeholder');
const placeholderLabel = document.getElementById('video-placeholder-label');
const placeholderHint = document.getElementById('video-placeholder-hint');

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
  const copyBtn = document.getElementById('copy-room-code-btn');

  if (!currentRoomCode || !AppConfig.ROOM_CODE_PATTERN.test(currentRoomCode)) {
    showNotification('No valid room code provided. Redirecting…', 'error');
    setTimeout(() => { window.location.href = '/'; }, AppConfig.ROOM_REDIRECT_DELAY_MS);
    return;
  }

  if (roomCodeDisplay) {
    roomCodeDisplay.textContent = currentRoomCode;
  }

  copyBtn?.addEventListener('click', copyRoomCode);

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

  bootstrapSession();
}

async function bootstrapSession() {
  try {
    await callController.initializeMedia((loading) => {
      roomView.showMediaLoading(loading);
    });
  } catch {
    // MEDIA_PERMISSION_DENIED is bridged to the app bus and handled by roomView.
  }

  try {
    await callController.connectSignaling();
  } catch {
    // SOCKET_DISCONNECTED is dispatched by callController.connectSignaling.
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

function copyRoomCode() {
  if (!currentRoomCode) return;

  navigator.clipboard.writeText(currentRoomCode).then(() => {
    showNotification('Room code copied');
  }).catch(() => {
    showNotification('Failed to copy room code', 'error');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initializeToolbar();
  initializeRoom();
  updateWaitingStatus();
});

window.addEventListener('beforeunload', () => {
  healthIndicator.stop();
  screenManager.cleanupScreenShare();
  callController.destroySession();
  toolbarController.destroyToolbar();
  deviceMenu.destroy();
  settingsModal.destroy();
  stopBridge();
});
