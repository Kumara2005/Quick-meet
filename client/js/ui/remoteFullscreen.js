/**
 * QuickMeet — Remote Screen Fullscreen
 * Fullscreen control for the remote participant's shared screen only.
 */

import { AppEvents, on as onAppEvent } from '../core/appEvents.js';

/** @type {HTMLVideoElement|null} */
let remoteVideo = null;

/** @type {HTMLButtonElement|null} */
let fullscreenBtn = null;

/** @type {Function|null} */
let onNotify = null;

/** @type {boolean} */
let remoteScreenSharing = false;

/** @type {MediaStream|null} */
let watchedStream = null;

/** @type {number|null} */
let trackCheckInterval = null;

/** @type {boolean} */
let handlersRegistered = false;

/** @type {(() => void)|null} */
let clickHandler = null;

const ICONS = {
  enter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M8 3H5a2 2 0 0 0-2 2v3"></path>
    <path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>
    <path d="M3 16v3a2 2 0 0 0 2 2h3"></path>
    <path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>
  </svg>`,
  exit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M8 3v3a2 2 0 0 1-2 2H3"></path>
    <path d="M21 8h-3a2 2 0 0 1-2-2V3"></path>
    <path d="M3 16h3a2 2 0 0 1 2 2v3"></path>
    <path d="M16 21v-3a2 2 0 0 1 2-2h3"></path>
  </svg>`,
};

/**
 * @param {MediaStreamTrack|null} track
 * @returns {boolean}
 */
function isScreenShareTrack(track) {
  if (!track || track.kind !== 'video') return false;

  const settings = typeof track.getSettings === 'function' ? track.getSettings() : {};
  if (settings.displaySurface) return true;

  if (track.contentHint === 'detail' || track.contentHint === 'text') return true;

  const label = track.label || '';
  return /screen|window|display|monitor|share/i.test(label);
}

/**
 * @returns {boolean}
 */
function isFullscreenSupported() {
  const el = remoteVideo;
  if (!el) return false;
  return Boolean(
    el.requestFullscreen
    || el.webkitRequestFullscreen
    || el.mozRequestFullScreen
    || el.msRequestFullscreen
  );
}

/**
 * @returns {boolean}
 */
function isDocumentFullscreen() {
  const el = document.fullscreenElement
    || document.webkitFullscreenElement
    || document.mozFullScreenElement
    || document.msFullscreenElement;
  return Boolean(el);
}

/**
 * @returns {Element|null}
 */
function getFullscreenElement() {
  return document.fullscreenElement
    || document.webkitFullscreenElement
    || document.mozFullScreenElement
    || document.msFullscreenElement
    || null;
}

/**
 * @param {MediaStream|null} stream
 */
function evaluateRemoteScreenShare(stream) {
  const track = stream?.getVideoTracks()[0] || null;
  const sharing = Boolean(track && isScreenShareTrack(track));
  setRemoteScreenSharing(sharing);
}

/**
 * @param {boolean} sharing
 */
function setRemoteScreenSharing(sharing) {
  remoteScreenSharing = sharing;

  if (!fullscreenBtn) return;

  if (!sharing || !isFullscreenSupported()) {
    fullscreenBtn.hidden = true;
    fullscreenBtn.setAttribute('aria-hidden', 'true');
    if (isDocumentFullscreen() && getFullscreenElement() === remoteVideo) {
      exitFullscreen().catch(() => {});
    }
    return;
  }

  fullscreenBtn.hidden = false;
  fullscreenBtn.setAttribute('aria-hidden', 'false');
  updateFullscreenButton();
}

/**
 * @param {MediaStream|null} stream
 */
function watchStream(stream) {
  if (watchedStream === stream) {
    evaluateRemoteScreenShare(stream);
    return;
  }

  if (watchedStream) {
    watchedStream.removeEventListener('addtrack', handleStreamTrackChange);
    watchedStream.removeEventListener('removetrack', handleStreamTrackChange);
  }

  watchedStream = stream;

  if (!stream) {
    setRemoteScreenSharing(false);
    return;
  }

  stream.addEventListener('addtrack', handleStreamTrackChange);
  stream.removeEventListener('removetrack', handleStreamTrackChange);

  const track = stream.getVideoTracks()[0];
  if (track) {
    track.addEventListener('ended', handleStreamTrackChange);
    track.addEventListener('mute', handleStreamTrackChange);
    track.addEventListener('unmute', handleStreamTrackChange);
  }

  evaluateRemoteScreenShare(stream);
}

function handleStreamTrackChange() {
  evaluateRemoteScreenShare(watchedStream);
}

function updateFullscreenButton() {
  if (!fullscreenBtn) return;

  const active = isDocumentFullscreen() && getFullscreenElement() === remoteVideo;
  fullscreenBtn.innerHTML = active ? ICONS.exit : ICONS.enter;
  fullscreenBtn.setAttribute(
    'aria-label',
    active ? 'Exit fullscreen' : 'View shared screen in fullscreen'
  );
  fullscreenBtn.title = active ? 'Exit Fullscreen (Esc)' : 'Fullscreen';
  fullscreenBtn.classList.toggle('remote-fullscreen-btn--active', active);
}

async function enterFullscreen() {
  if (!remoteVideo) return;

  const request = remoteVideo.requestFullscreen
    || remoteVideo.webkitRequestFullscreen
    || remoteVideo.mozRequestFullScreen
    || remoteVideo.msRequestFullscreen;

  if (!request) {
    onNotify?.('Fullscreen is not supported in this browser', 'error');
    return;
  }

  try {
    await request.call(remoteVideo);
  } catch {
    onNotify?.('Could not enter fullscreen', 'error');
  }
}

async function exitFullscreen() {
  const exit = document.exitFullscreen
    || document.webkitExitFullscreen
    || document.mozCancelFullScreen
    || document.msExitFullscreen;

  if (exit) {
    await exit.call(document);
  }
}

async function toggleFullscreen() {
  if (isDocumentFullscreen() && getFullscreenElement() === remoteVideo) {
    await exitFullscreen();
  } else {
    await enterFullscreen();
  }
}

function handleFullscreenChange() {
  updateFullscreenButton();

  if (!isDocumentFullscreen() && remoteVideo) {
    remoteVideo.classList.remove('video-preview__remote--fullscreen');
  } else if (remoteVideo) {
    remoteVideo.classList.add('video-preview__remote--fullscreen');
  }
}

function startTrackPolling() {
  stopTrackPolling();
  trackCheckInterval = window.setInterval(() => {
    const stream = remoteVideo?.srcObject;
    if (stream instanceof MediaStream) {
      evaluateRemoteScreenShare(stream);
    }
  }, 1500);
}

function stopTrackPolling() {
  if (trackCheckInterval !== null) {
    clearInterval(trackCheckInterval);
    trackCheckInterval = null;
  }
}

/**
 * Initialize remote screen fullscreen controls.
 * @param {{ remoteVideo: HTMLVideoElement, fullscreenBtn: HTMLButtonElement, onNotify?: (message: string, type?: string) => void }} options
 */
export function init(options) {
  remoteVideo = options.remoteVideo;
  fullscreenBtn = options.fullscreenBtn;
  onNotify = options.onNotify || null;

  clickHandler = () => {
    toggleFullscreen().catch(() => {});
  };
  fullscreenBtn?.addEventListener('click', clickHandler);

  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

  if (!handlersRegistered) {
    handlersRegistered = true;

    onAppEvent(AppEvents.REMOTE_STREAM_READY, () => {
      const stream = remoteVideo?.srcObject;
      if (stream instanceof MediaStream) {
        watchStream(stream);
      }
    });

    onAppEvent(AppEvents.PEER_DISCONNECTED, () => {
      watchStream(null);
    });

    onAppEvent(AppEvents.USER_LEFT, () => {
      watchStream(null);
    });

    onAppEvent(AppEvents.CALL_ENDED, () => {
      watchStream(null);
    });
  }

  const stream = remoteVideo?.srcObject;
  if (stream instanceof MediaStream) {
    watchStream(stream);
  }

  startTrackPolling();
  setRemoteScreenSharing(false);
}

/**
 * Remove listeners and reset state.
 */
export function destroy() {
  stopTrackPolling();
  watchStream(null);

  if (fullscreenBtn && clickHandler) {
    fullscreenBtn.removeEventListener('click', clickHandler);
  }
  clickHandler = null;

  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
}
