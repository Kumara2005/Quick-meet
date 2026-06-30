/**
 * QuickMeet — Event Bridge
 * Maps domain-level event buses to the central application event bus.
 */

import { AppEvents, dispatch as dispatchApp } from './appEvents.js';
import { MediaEvents, on as onMedia, off as offMedia } from '../webrtc/media/mediaEvents.js';
import { PeerEvents, on as onPeer, off as offPeer } from '../webrtc/peer/peerEvents.js';
import { ControlEvents, on as onControl, off as offControl } from '../webrtc/controls/controlEvents.js';
import { ScreenEvents, on as onScreen, off as offScreen } from '../webrtc/screen/screenEvents.js';
import { StatsEvents, on as onStats, off as offStats } from '../webrtc/stats/statsEvents.js';
import { DeviceEvents, on as onDevice, off as offDevice } from '../media/deviceEvents.js';
import * as callManager from '../webrtc/controls/callManager.js';

/** @type {Array<() => void>} */
const teardowns = [];

/** @type {boolean} */
let isActive = false;

/**
 * @param {() => void} teardown
 */
function addTeardown(teardown) {
  teardowns.push(teardown);
}

/**
 * Start bridging domain events to application events.
 */
export function startBridge() {
  if (isActive) return;
  isActive = true;

  const onMediaReady = (detail) => dispatchApp(AppEvents.MEDIA_READY, detail);
  onMedia(MediaEvents.MEDIA_STARTED, onMediaReady);
  addTeardown(() => offMedia(MediaEvents.MEDIA_STARTED, onMediaReady));

  const onMediaStopped = (detail) => dispatchApp(AppEvents.MEDIA_STOPPED, detail);
  onMedia(MediaEvents.MEDIA_STOPPED, onMediaStopped);
  addTeardown(() => offMedia(MediaEvents.MEDIA_STOPPED, onMediaStopped));

  const onMediaDenied = (detail) => dispatchApp(AppEvents.MEDIA_PERMISSION_DENIED, detail);
  onMedia(MediaEvents.PERMISSION_DENIED, onMediaDenied);
  addTeardown(() => offMedia(MediaEvents.PERMISSION_DENIED, onMediaDenied));

  const onDeviceChanged = (detail) => dispatchApp(AppEvents.MEDIA_DEVICE_CHANGED, detail);
  onMedia(MediaEvents.DEVICE_CHANGED, onDeviceChanged);
  addTeardown(() => offMedia(MediaEvents.DEVICE_CHANGED, onDeviceChanged));

  const onNegotiationStarted = (detail) => dispatchApp(AppEvents.PEER_NEGOTIATION_STARTED, detail);
  onPeer(PeerEvents.NEGOTIATION_STARTED, onNegotiationStarted);
  addTeardown(() => offPeer(PeerEvents.NEGOTIATION_STARTED, onNegotiationStarted));

  const onNegotiationCompleted = (detail) => dispatchApp(AppEvents.PEER_NEGOTIATION_COMPLETED, detail);
  onPeer(PeerEvents.NEGOTIATION_COMPLETED, onNegotiationCompleted);
  addTeardown(() => offPeer(PeerEvents.NEGOTIATION_COMPLETED, onNegotiationCompleted));

  const onPeerConnected = (detail) => {
    callManager.setCallActive(true);
    dispatchApp(AppEvents.PEER_CONNECTED, detail);
    dispatchApp(AppEvents.CALL_STARTED, detail);
  };
  onPeer(PeerEvents.PEER_CONNECTED, onPeerConnected);
  addTeardown(() => offPeer(PeerEvents.PEER_CONNECTED, onPeerConnected));

  const onPeerDisconnected = (detail) => dispatchApp(AppEvents.PEER_DISCONNECTED, detail);
  onPeer(PeerEvents.PEER_DISCONNECTED, onPeerDisconnected);
  addTeardown(() => offPeer(PeerEvents.PEER_DISCONNECTED, onPeerDisconnected));

  const onRemoteStream = (detail) => dispatchApp(AppEvents.REMOTE_STREAM_READY, detail);
  onPeer(PeerEvents.REMOTE_STREAM_READY, onRemoteStream);
  addTeardown(() => offPeer(PeerEvents.REMOTE_STREAM_READY, onRemoteStream));

  const onIceConnected = (detail) => dispatchApp(AppEvents.ICE_CONNECTED, detail);
  onPeer(PeerEvents.ICE_CONNECTED, onIceConnected);
  addTeardown(() => offPeer(PeerEvents.ICE_CONNECTED, onIceConnected));

  const onIceFailed = (detail) => dispatchApp(AppEvents.ICE_FAILED, detail);
  onPeer(PeerEvents.ICE_FAILED, onIceFailed);
  addTeardown(() => offPeer(PeerEvents.ICE_FAILED, onIceFailed));

  const onCallEnding = (detail) => dispatchApp(AppEvents.CALL_ENDING, detail);
  onControl(ControlEvents.CALL_ENDING, onCallEnding);
  addTeardown(() => offControl(ControlEvents.CALL_ENDING, onCallEnding));

  const onCallEnded = (detail) => dispatchApp(AppEvents.CALL_ENDED, detail);
  onControl(ControlEvents.CALL_ENDED, onCallEnded);
  addTeardown(() => offControl(ControlEvents.CALL_ENDED, onCallEnded));

  const onAudioMuted = (detail) => dispatchApp(AppEvents.AUDIO_MUTED, detail);
  onControl(ControlEvents.AUDIO_MUTED, onAudioMuted);
  addTeardown(() => offControl(ControlEvents.AUDIO_MUTED, onAudioMuted));

  const onAudioUnmuted = (detail) => dispatchApp(AppEvents.AUDIO_UNMUTED, detail);
  onControl(ControlEvents.AUDIO_UNMUTED, onAudioUnmuted);
  addTeardown(() => offControl(ControlEvents.AUDIO_UNMUTED, onAudioUnmuted));

  const onVideoDisabled = (detail) => dispatchApp(AppEvents.VIDEO_DISABLED, detail);
  onControl(ControlEvents.VIDEO_DISABLED, onVideoDisabled);
  addTeardown(() => offControl(ControlEvents.VIDEO_DISABLED, onVideoDisabled));

  const onVideoEnabled = (detail) => dispatchApp(AppEvents.VIDEO_ENABLED, detail);
  onControl(ControlEvents.VIDEO_ENABLED, onVideoEnabled);
  addTeardown(() => offControl(ControlEvents.VIDEO_ENABLED, onVideoEnabled));

  const onScreenStarted = (detail) => dispatchApp(AppEvents.SCREEN_SHARE_STARTED, detail);
  onScreen(ScreenEvents.SCREEN_SHARE_STARTED, onScreenStarted);
  addTeardown(() => offScreen(ScreenEvents.SCREEN_SHARE_STARTED, onScreenStarted));

  const onScreenStopped = (detail) => dispatchApp(AppEvents.SCREEN_SHARE_STOPPED, detail);
  onScreen(ScreenEvents.SCREEN_SHARE_STOPPED, onScreenStopped);
  addTeardown(() => offScreen(ScreenEvents.SCREEN_SHARE_STOPPED, onScreenStopped));

  const onScreenFailed = (detail) => dispatchApp(AppEvents.SCREEN_SHARE_FAILED, detail);
  onScreen(ScreenEvents.SCREEN_SHARE_FAILED, onScreenFailed);
  addTeardown(() => offScreen(ScreenEvents.SCREEN_SHARE_FAILED, onScreenFailed));

  const onStatsUpdated = (detail) => dispatchApp(AppEvents.NETWORK_QUALITY_CHANGED, detail);
  onStats(StatsEvents.STATS_UPDATED, onStatsUpdated);
  addTeardown(() => offStats(StatsEvents.STATS_UPDATED, onStatsUpdated));

  const onNetworkRecovered = (detail) => dispatchApp(AppEvents.NETWORK_RECOVERED, detail);
  onStats(StatsEvents.NETWORK_RECOVERED, onNetworkRecovered);
  addTeardown(() => offStats(StatsEvents.NETWORK_RECOVERED, onNetworkRecovered));

  const onCameraChanged = (detail) => dispatchApp(AppEvents.CAMERA_CHANGED, detail);
  onDevice(DeviceEvents.CAMERA_CHANGED, onCameraChanged);
  addTeardown(() => offDevice(DeviceEvents.CAMERA_CHANGED, onCameraChanged));

  const onMicChanged = (detail) => dispatchApp(AppEvents.MIC_CHANGED, detail);
  onDevice(DeviceEvents.MIC_CHANGED, onMicChanged);
  addTeardown(() => offDevice(DeviceEvents.MIC_CHANGED, onMicChanged));

  const onDeviceConnected = (detail) => dispatchApp(AppEvents.DEVICE_CONNECTED, detail);
  onDevice(DeviceEvents.DEVICE_CONNECTED, onDeviceConnected);
  addTeardown(() => offDevice(DeviceEvents.DEVICE_CONNECTED, onDeviceConnected));

  const onDeviceDisconnected = (detail) => dispatchApp(AppEvents.DEVICE_DISCONNECTED, detail);
  onDevice(DeviceEvents.DEVICE_DISCONNECTED, onDeviceDisconnected);
  addTeardown(() => offDevice(DeviceEvents.DEVICE_DISCONNECTED, onDeviceDisconnected));

  const onPermissionChanged = (detail) => dispatchApp(AppEvents.PERMISSION_CHANGED, detail);
  onDevice(DeviceEvents.PERMISSION_CHANGED, onPermissionChanged);
  addTeardown(() => offDevice(DeviceEvents.PERMISSION_CHANGED, onPermissionChanged));

  const onSettingsApplied = (detail) => dispatchApp(AppEvents.SETTINGS_APPLIED, detail);
  onDevice(DeviceEvents.SETTINGS_APPLIED, onSettingsApplied);
  addTeardown(() => offDevice(DeviceEvents.SETTINGS_APPLIED, onSettingsApplied));

  const onDevicesUpdated = (detail) => dispatchApp(AppEvents.DEVICES_UPDATED, detail);
  onDevice(DeviceEvents.DEVICES_UPDATED, onDevicesUpdated);
  addTeardown(() => offDevice(DeviceEvents.DEVICES_UPDATED, onDevicesUpdated));
}

/**
 * Stop bridging and remove all domain listeners.
 */
export function stopBridge() {
  if (!isActive) return;

  for (const teardown of teardowns) {
    teardown();
  }

  teardowns.length = 0;
  isActive = false;
}
