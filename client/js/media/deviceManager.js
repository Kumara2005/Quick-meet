/**
 * QuickMeet — Device Manager
 * Enumerates, groups, and tracks media input devices.
 */

import { DeviceEvents, dispatch } from './deviceEvents.js';
import { loadPreferredDevices } from './devicePersistence.js';
import * as appState from '../core/appState.js';

/** @type {MediaDeviceInfo[]} */
let devices = [];

/** @type {Function|null} */
let deviceChangeCleanup = null;

/** @type {Set<string>} */
let previousDeviceIds = new Set();

/**
 * Format device label for display (fallback when label is empty).
 * @param {MediaDeviceInfo} device
 * @param {number} index
 * @returns {string}
 */
export function formatDeviceLabel(device, index) {
  if (device.label) return device.label;

  const kindLabel = device.kind === 'videoinput' ? 'Camera' : 'Microphone';
  return `${kindLabel} ${index + 1}`;
}

/**
 * Refresh device list from the browser.
 * @returns {Promise<MediaDeviceInfo[]>}
 */
export async function enumerateDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) {
    devices = [];
    updateAppState();
    return devices;
  }

  const prevIds = new Set(devices.map((d) => d.deviceId));
  devices = await navigator.mediaDevices.enumerateDevices();
  const nextIds = new Set(devices.map((d) => d.deviceId));

  detectHotPlug(prevIds, nextIds);
  previousDeviceIds = nextIds;

  updateAppState();
  dispatch(DeviceEvents.DEVICES_UPDATED, { devices: getDeviceGroups() });
  return devices;
}

/**
 * @returns {{ cameras: Object[], microphones: Object[], speakers: Object[] }}
 */
export function getDeviceGroups() {
  const cameras = getCameras().map((d, i) => toDeviceEntry(d, i));
  const microphones = getMicrophones().map((d, i) => toDeviceEntry(d, i));
  const speakers = getSpeakers().map((d, i) => toDeviceEntry(d, i));

  return { cameras, microphones, speakers };
}

/**
 * @param {MediaDeviceInfo} device
 * @param {number} index
 */
function toDeviceEntry(device, index) {
  const state = appState.getState();
  const activeCamera = state.activeCameraId;
  const activeMic = state.activeMicrophoneId;

  return {
    deviceId: device.deviceId,
    kind: device.kind,
    label: formatDeviceLabel(device, index),
    groupId: device.groupId,
    isActive:
      (device.kind === 'videoinput' && device.deviceId === activeCamera) ||
      (device.kind === 'audioinput' && device.deviceId === activeMic),
  };
}

/**
 * @param {Set<string>} prevIds
 * @param {Set<string>} nextIds
 */
function detectHotPlug(prevIds, nextIds) {
  if (prevIds.size === 0) return;

  for (const id of nextIds) {
    if (!prevIds.has(id) && id !== 'default' && id !== 'communications') {
      const device = devices.find((d) => d.deviceId === id);
      dispatch(DeviceEvents.DEVICE_CONNECTED, { deviceId: id, device });
    }
  }

  for (const id of prevIds) {
    if (!nextIds.has(id) && id !== 'default' && id !== 'communications') {
      dispatch(DeviceEvents.DEVICE_DISCONNECTED, { deviceId: id });
    }
  }
}

function updateAppState() {
  const preferred = loadPreferredDevices();
  appState.setDevices({
    cameras: getCameras(),
    microphones: getMicrophones(),
    speakers: getSpeakers(),
    preferredCameraId: preferred.cameraId,
    preferredMicrophoneId: preferred.microphoneId,
  });
}

/**
 * @returns {MediaDeviceInfo[]}
 */
export function getCameras() {
  return devices.filter((d) => d.kind === 'videoinput' && d.deviceId);
}

/**
 * @returns {MediaDeviceInfo[]}
 */
export function getMicrophones() {
  return devices.filter((d) => d.kind === 'audioinput' && d.deviceId);
}

/**
 * @returns {MediaDeviceInfo[]}
 */
export function getSpeakers() {
  return devices.filter((d) => d.kind === 'audiooutput' && d.deviceId);
}

/**
 * @returns {MediaDeviceInfo[]}
 */
export function getDevices() {
  return devices;
}

/**
 * @param {string} deviceId
 * @returns {MediaDeviceInfo|undefined}
 */
export function findDeviceById(deviceId) {
  return devices.find((d) => d.deviceId === deviceId);
}

/**
 * @param {'videoinput'|'audioinput'} kind
 * @returns {MediaDeviceInfo|null}
 */
export function getDefaultDevice(kind) {
  const list = kind === 'videoinput' ? getCameras() : getMicrophones();
  return list[0] || null;
}

/**
 * Sync active device IDs from a MediaStream.
 * @param {MediaStream|null} stream
 */
export function syncActiveFromStream(stream) {
  if (!stream) {
    appState.setActiveDevices({ cameraId: null, microphoneId: null });
    return;
  }

  const videoTrack = stream.getVideoTracks()[0];
  const audioTrack = stream.getAudioTracks()[0];

  appState.setActiveDevices({
    cameraId: videoTrack?.getSettings().deviceId || null,
    microphoneId: audioTrack?.getSettings().deviceId || null,
  });
}

/**
 * Start listening for hot-plug device changes.
 */
export function startDeviceChangeListener() {
  stopDeviceChangeListener();

  if (!navigator.mediaDevices) return;

  const handler = async () => {
    await enumerateDevices();
  };

  navigator.mediaDevices.addEventListener('devicechange', handler);
  deviceChangeCleanup = () => {
    navigator.mediaDevices.removeEventListener('devicechange', handler);
    deviceChangeCleanup = null;
  };
}

/**
 * Stop hot-plug listener.
 */
export function stopDeviceChangeListener() {
  deviceChangeCleanup?.();
}

/**
 * Initialize device manager (enumerate + hot-plug).
 */
export async function start() {
  await enumerateDevices();
  startDeviceChangeListener();
}

/**
 * Tear down device manager listeners.
 */
export function stop() {
  stopDeviceChangeListener();
  devices = [];
  previousDeviceIds = new Set();
}

// Backward compatibility for webrtc/media/media.js
export function getSelectedCameraId() {
  return appState.getState().activeCameraId;
}

export function getSelectedMicrophoneId() {
  return appState.getState().activeMicrophoneId;
}

export function syncSelectedFromStream(stream) {
  syncActiveFromStream(stream);
}

export function onDeviceChange(callback) {
  if (!navigator.mediaDevices) return () => {};
  navigator.mediaDevices.addEventListener('devicechange', callback);
  return () => navigator.mediaDevices.removeEventListener('devicechange', callback);
}

// TODO Phase 10: Speaker output selection (setSinkId).
