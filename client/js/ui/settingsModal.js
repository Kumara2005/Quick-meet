/**
 * QuickMeet — Settings Modal
 * Camera/microphone selection with live preview (Phase 9).
 */

import * as deviceManager from '../media/deviceManager.js';
import * as mediaSwitcher from '../media/mediaSwitcher.js';
import * as appState from '../core/appState.js';
import { acquireCameraTrack } from '../media/cameraManager.js';
import { AppEvents, on as onAppEvent } from '../core/appEvents.js';
import { logger } from '../utils/logger.js';

/** @type {HTMLElement|null} */
let modalEl = null;

/** @type {HTMLSelectElement|null} */
let cameraSelect = null;

/** @type {HTMLSelectElement|null} */
let micSelect = null;

/** @type {HTMLVideoElement|null} */
let previewVideo = null;

/** @type {HTMLElement|null} */
let applyBtn = null;

/** @type {HTMLElement|null} */
let lastFocused = null;

/** @type {MediaStream|null} */
let previewStream = null;

/** @type {string|null} */
let initialCameraId = null;

/** @type {string|null} */
let initialMicId = null;

/** @type {boolean} */
let initialized = false;

/**
 * Initialize the settings modal.
 */
export function init() {
  if (initialized) return;
  initialized = true;

  modalEl = document.getElementById('settings-modal');
  cameraSelect = document.getElementById('settings-camera-select');
  micSelect = document.getElementById('settings-mic-select');
  previewVideo = document.getElementById('settings-preview-video');
  applyBtn = document.getElementById('settings-apply-btn');

  document.getElementById('settings-cancel-btn')?.addEventListener('click', close);
  document.getElementById('settings-close-btn')?.addEventListener('click', close);
  applyBtn?.addEventListener('click', handleApply);
  cameraSelect?.addEventListener('change', handleCameraPreviewChange);
  modalEl?.addEventListener('keydown', handleKeydown);
  modalEl?.querySelector('.settings-modal__backdrop')?.addEventListener('click', close);

  onAppEvent(AppEvents.DEVICES_UPDATED, refreshDropdowns);
}

/**
 * Open the settings modal.
 */
export async function open() {
  if (!modalEl) return;

  lastFocused = document.activeElement;
  await deviceManager.enumerateDevices();
  refreshDropdowns();

  const state = appState.getState();
  initialCameraId = state.activeCameraId;
  initialMicId = state.activeMicrophoneId;

  if (cameraSelect && state.activeCameraId) {
    cameraSelect.value = state.activeCameraId;
  }
  if (micSelect && state.activeMicrophoneId) {
    micSelect.value = state.activeMicrophoneId;
  }

  await startPreview(cameraSelect?.value || state.activeCameraId);

  modalEl.hidden = false;
  modalEl.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');

  cameraSelect?.focus();
}

/**
 * Close the settings modal without applying.
 */
export function close() {
  if (!modalEl) return;

  stopPreview();
  modalEl.hidden = true;
  modalEl.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');

  if (cameraSelect && initialCameraId) cameraSelect.value = initialCameraId;
  if (micSelect && initialMicId) micSelect.value = initialMicId;

  if (lastFocused instanceof HTMLElement) {
    lastFocused.focus();
  }
}

/**
 * @returns {boolean}
 */
export function isOpen() {
  return modalEl ? !modalEl.hidden : false;
}

function refreshDropdowns() {
  const { cameras, microphones } = deviceManager.getDeviceGroups();
  const state = appState.getState();

  if (cameraSelect) {
    cameraSelect.innerHTML = buildOptions(cameras, 'No cameras found');
    if (state.activeCameraId) {
      cameraSelect.value = state.activeCameraId;
    }
  }

  if (micSelect) {
    micSelect.innerHTML = buildOptions(microphones, 'No microphones found');
    if (state.activeMicrophoneId) {
      micSelect.value = state.activeMicrophoneId;
    }
  }

  if (applyBtn) {
    applyBtn.disabled = cameras.length === 0 && microphones.length === 0;
  }
}

/**
 * @param {Object[]} devices
 * @param {string} emptyLabel
 * @returns {string}
 */
function buildOptions(devices, emptyLabel) {
  if (!devices.length) {
    return `<option value="">${emptyLabel}</option>`;
  }

  return devices.map((d) => {
    const selected = d.isActive ? ' selected' : '';
    const label = escapeHtml(d.label);
    return `<option value="${escapeHtml(d.deviceId)}"${selected}>${label}</option>`;
  }).join('');
}

/**
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function handleCameraPreviewChange() {
  const deviceId = cameraSelect?.value;
  if (deviceId) {
    await startPreview(deviceId);
  }
}

async function startPreview(deviceId) {
  stopPreview();

  if (!deviceId || !previewVideo) return;

  try {
    const track = await acquireCameraTrack(deviceId);
    previewStream = new MediaStream([track]);
    previewVideo.srcObject = previewStream;
    previewVideo.muted = true;
    await previewVideo.play().catch(() => {});
  } catch {
    previewVideo.srcObject = null;
  }
}

function stopPreview() {
  if (previewStream) {
    previewStream.getTracks().forEach((t) => t.stop());
    previewStream = null;
  }
  if (previewVideo) {
    previewVideo.srcObject = null;
  }
}

async function handleApply() {
  if (!applyBtn) return;

  applyBtn.disabled = true;

  try {
    const cameraId = cameraSelect?.value || null;
    const microphoneId = micSelect?.value || null;

    await mediaSwitcher.applySettings({ cameraId, microphoneId });
    close();
  } catch (err) {
    logger.error('Settings apply failed:', err.message);
  } finally {
    applyBtn.disabled = false;
  }
}

/**
 * Focus trap and Escape to close.
 * @param {KeyboardEvent} event
 */
function handleKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault();
    close();
    return;
  }

  if (event.key !== 'Tab' || !modalEl) return;

  const focusable = modalEl.querySelectorAll(
    'button, select, [href], input, [tabindex]:not([tabindex="-1"])'
  );
  const list = Array.from(focusable).filter((el) => !el.disabled);

  if (list.length === 0) return;

  const first = list[0];
  const last = list[list.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

/**
 * Tear down modal state (preview tracks, open state).
 */
export function destroy() {
  close();
  stopPreview();
  initialized = false;
}
