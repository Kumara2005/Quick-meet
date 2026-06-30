/**
 * QuickMeet — Device Persistence
 * Stores preferred camera and microphone in localStorage.
 */

import { AppConfig } from '../config/appConfig.js';

const STORAGE_KEY = AppConfig.PREFERRED_DEVICES_KEY;

/**
 * @typedef {{ cameraId: string|null, microphoneId: string|null }} PreferredDevices
 */

/**
 * @returns {PreferredDevices}
 */
export function loadPreferredDevices() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { cameraId: null, microphoneId: null };
    const parsed = JSON.parse(raw);
    return {
      cameraId: parsed.cameraId || null,
      microphoneId: parsed.microphoneId || null,
    };
  } catch {
    return { cameraId: null, microphoneId: null };
  }
}

/**
 * @param {Partial<PreferredDevices>} devices
 */
export function savePreferredDevices(devices) {
  const current = loadPreferredDevices();
  const next = {
    cameraId: devices.cameraId !== undefined ? devices.cameraId : current.cameraId,
    microphoneId: devices.microphoneId !== undefined ? devices.microphoneId : current.microphoneId,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (err) {
    console.warn('[QuickMeet] Failed to save device preferences:', err.message);
  }
}

/**
 * @param {'camera'|'microphone'} type
 * @param {string|null} deviceId
 */
export function savePreferredDevice(type, deviceId) {
  if (type === 'camera') {
    savePreferredDevices({ cameraId: deviceId });
  } else {
    savePreferredDevices({ microphoneId: deviceId });
  }
}

/**
 * Clear stored preferences.
 */
export function clearPreferredDevices() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
}
