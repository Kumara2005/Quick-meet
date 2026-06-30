/**
 * QuickMeet — Toolbar Controller
 * UI-only toolbar: listeners, icons, labels, and active states.
 */

import * as audioControl from './audioControl.js';
import * as videoControl from './videoControl.js';
import * as callManager from './callManager.js';
import * as screenManager from '../screen/screenManager.js';
import { ControlEvents, on as onControlEvent } from './controlEvents.js';
import { ScreenEvents, on as onScreenEvent } from '../screen/screenEvents.js';

/** @type {HTMLButtonElement|null} */
let muteBtn = null;

/** @type {HTMLButtonElement|null} */
let cameraBtn = null;

/** @type {HTMLButtonElement|null} */
let screenShareBtn = null;

/** @type {HTMLButtonElement|null} */
let endCallBtn = null;

/** @type {Function|null} */
let onCameraVisualChange = null;

/** @type {boolean} */
let mediaControlsEnabled = false;

const ICONS = {
  micOn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" y1="19" x2="12" y2="23"></line>
    <line x1="8" y1="23" x2="16" y2="23"></line>
  </svg>`,
  micOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <line x1="1" y1="1" x2="23" y2="23"></line>
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
    <line x1="12" y1="19" x2="12" y2="23"></line>
    <line x1="8" y1="23" x2="16" y2="23"></line>
  </svg>`,
  cameraOn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M23 7l-7 5 7 5V7z"></path>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
  </svg>`,
  cameraOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <line x1="1" y1="1" x2="23" y2="23"></line>
    <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34"></path>
    <path d="M16 16l-5.1-5.1a3 3 0 0 0-4.24 0"></path>
  </svg>`,
  screenShare: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
    <line x1="8" y1="21" x2="16" y2="21"></line>
    <line x1="12" y1="17" x2="12" y2="21"></line>
  </svg>`,
  screenShareStop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
    <line x1="8" y1="21" x2="16" y2="21"></line>
    <line x1="12" y1="17" x2="12" y2="21"></line>
    <line x1="4" y1="4" x2="20" y2="16"></line>
  </svg>`,
};

/**
 * Initialize toolbar buttons and event listeners.
 * @param {{ onCameraVisualChange?: (enabled: boolean) => void }} [options]
 */
export function initToolbar(options = {}) {
  muteBtn = document.getElementById('btn-mute');
  cameraBtn = document.getElementById('btn-camera');
  screenShareBtn = document.getElementById('btn-screen-share');
  endCallBtn = document.getElementById('btn-end-call');
  onCameraVisualChange = options.onCameraVisualChange || null;

  muteBtn?.addEventListener('click', handleMuteClick);
  cameraBtn?.addEventListener('click', handleCameraClick);
  screenShareBtn?.addEventListener('click', handleScreenShareClick);
  endCallBtn?.addEventListener('click', handleEndCallClick);

  document.addEventListener('keydown', handleKeyboardShortcuts);

  onControlEvent(ControlEvents.AUDIO_MUTED, updateMuteButton);
  onControlEvent(ControlEvents.AUDIO_UNMUTED, updateMuteButton);
  onControlEvent(ControlEvents.VIDEO_DISABLED, updateCameraButton);
  onControlEvent(ControlEvents.VIDEO_ENABLED, updateCameraButton);
  onScreenEvent(ScreenEvents.SCREEN_SHARE_STARTED, updateScreenShareButton);
  onScreenEvent(ScreenEvents.SCREEN_SHARE_STOPPED, updateScreenShareButton);
  onScreenEvent(ScreenEvents.SCREEN_SHARE_FAILED, updateScreenShareButton);

  setMediaControlsEnabled(false);
  setScreenShareEnabled(false);
  syncAllButtons();
}

/**
 * Enable or disable the screen share button.
 * @param {boolean} enabled
 */
export function setScreenShareEnabled(enabled) {
  if (screenShareBtn) {
    screenShareBtn.disabled = !enabled;
  }
}

/**
 * Enable or disable mute/camera buttons.
 * @param {boolean} enabled
 */
export function setMediaControlsEnabled(enabled) {
  mediaControlsEnabled = enabled;
  if (muteBtn) muteBtn.disabled = !enabled;
  if (cameraBtn) cameraBtn.disabled = !enabled || screenManager.isScreenSharing();
}

/**
 * Remove toolbar listeners (cleanup).
 */
export function destroyToolbar() {
  muteBtn?.removeEventListener('click', handleMuteClick);
  cameraBtn?.removeEventListener('click', handleCameraClick);
  screenShareBtn?.removeEventListener('click', handleScreenShareClick);
  endCallBtn?.removeEventListener('click', handleEndCallClick);
  document.removeEventListener('keydown', handleKeyboardShortcuts);
}

function handleMuteClick() {
  audioControl.toggleMute();
}

function handleCameraClick() {
  videoControl.toggleCamera();
}

async function handleScreenShareClick() {
  try {
    await screenManager.toggleScreenShare();
  } catch {
    // Error surfaced via screen events / notifications.
  }
}

async function handleEndCallClick() {
  await callManager.endCall();
}

function handleKeyboardShortcuts(event) {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
    return;
  }

  const key = event.key.toLowerCase();

  if (key === 'm' && muteBtn && !muteBtn.disabled) {
    event.preventDefault();
    audioControl.toggleMute();
  }

  if (key === 'v' && cameraBtn && !cameraBtn.disabled) {
    event.preventDefault();
    videoControl.toggleCamera();
  }

  if (key === 's' && screenShareBtn && !screenShareBtn.disabled) {
    event.preventDefault();
    handleScreenShareClick();
  }
}

function updateMuteButton() {
  if (!muteBtn) return;

  const muted = audioControl.isMuted();

  muteBtn.innerHTML = muted ? ICONS.micOff : ICONS.micOn;
  muteBtn.classList.toggle('btn--active', !muted);
  muteBtn.classList.toggle('btn--muted', muted);
  muteBtn.setAttribute('aria-pressed', String(muted));
  muteBtn.setAttribute('aria-label', muted ? 'Unmute microphone' : 'Mute microphone');
  muteBtn.title = muted ? 'Unmute Microphone (M)' : 'Mute Microphone (M)';
}

function updateCameraButton() {
  if (!cameraBtn) return;

  const enabled = videoControl.isCameraEnabled();

  cameraBtn.innerHTML = enabled ? ICONS.cameraOn : ICONS.cameraOff;
  cameraBtn.classList.toggle('btn--active', enabled);
  cameraBtn.classList.toggle('btn--muted', !enabled);
  cameraBtn.setAttribute('aria-pressed', String(enabled));
  cameraBtn.setAttribute(
    'aria-label',
    enabled ? 'Turn camera off' : 'Turn camera on'
  );
  cameraBtn.title = enabled ? 'Turn Camera Off (V)' : 'Turn Camera On (V)';

  onCameraVisualChange?.(enabled);
}

function updateScreenShareButton() {
  if (!screenShareBtn) return;

  const sharing = screenManager.isScreenSharing();

  screenShareBtn.innerHTML = sharing ? ICONS.screenShareStop : ICONS.screenShare;
  screenShareBtn.classList.toggle('btn--active', sharing);
  screenShareBtn.classList.toggle('btn--screen-sharing', sharing);
  screenShareBtn.setAttribute('aria-pressed', String(sharing));
  screenShareBtn.setAttribute(
    'aria-label',
    sharing ? 'Stop sharing screen' : 'Share screen'
  );
  screenShareBtn.title = sharing ? 'Stop Sharing (S)' : 'Share Screen (S)';

  if (cameraBtn) {
    cameraBtn.disabled = sharing || !mediaControlsEnabled;
  }
}

function syncAllButtons() {
  updateMuteButton();
  updateCameraButton();
  updateScreenShareButton();

  if (endCallBtn) {
    endCallBtn.classList.add('btn--end-call');
    endCallBtn.title = 'End Call';
    endCallBtn.setAttribute('aria-label', 'End call');
  }
}
