/**
 * QuickMeet — Device Menu
 * Toolbar entry point for media device settings (Phase 9).
 */

import * as settingsModal from './settingsModal.js';
import { AppEvents, on as onAppEvent } from '../core/appEvents.js';

/** @type {HTMLButtonElement|null} */
let settingsBtn = null;

/** @type {((event: KeyboardEvent) => void)|null} */
let keyboardHandler = null;

/**
 * Initialize the device menu / settings button.
 */
export function init() {
  settingsBtn = document.getElementById('btn-settings');
  settingsBtn?.addEventListener('click', openSettings);

  keyboardHandler = (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }
    if (event.key === ',' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      openSettings();
    }
  };
  document.addEventListener('keydown', keyboardHandler);

  onAppEvent(AppEvents.MEDIA_READY, () => {
    if (settingsBtn) settingsBtn.disabled = false;
  });

  onAppEvent(AppEvents.MEDIA_STOPPED, () => {
    if (settingsBtn) settingsBtn.disabled = true;
  });
}

/**
 * Open device settings.
 */
export function openSettings() {
  if (settingsModal.isOpen()) {
    settingsModal.close();
  } else {
    settingsModal.open();
  }
}

/**
 * Enable or disable the settings button.
 * @param {boolean} enabled
 */
export function setEnabled(enabled) {
  if (settingsBtn) {
    settingsBtn.disabled = !enabled;
  }
}

/**
 * Tear down listeners.
 */
export function destroy() {
  settingsBtn?.removeEventListener('click', openSettings);
  if (keyboardHandler) {
    document.removeEventListener('keydown', keyboardHandler);
    keyboardHandler = null;
  }
  settingsBtn = null;
}
