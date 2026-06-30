/**
 * QuickMeet — Audio Control
 * Mute/unmute via MediaStreamTrack.enabled (no SDP renegotiation).
 */

import * as media from '../media/media.js';
import { ControlEvents, dispatch } from './controlEvents.js';
import { setMuted } from './callManager.js';

/**
 * Get the local audio track.
 * @returns {MediaStreamTrack|null}
 */
export function getAudioTrack() {
  const stream = media.getLocalStream();
  if (!stream) return null;
  return stream.getAudioTracks()[0] || null;
}

/**
 * Check if microphone is muted.
 * @returns {boolean}
 */
export function isMuted() {
  const track = getAudioTrack();
  if (!track) return false;
  return !track.enabled;
}

/**
 * Mute the local microphone.
 * @returns {boolean}
 */
export function mute() {
  const track = getAudioTrack();
  if (!track) {
    console.warn('[AudioControl] No audio track available');
    return false;
  }

  track.enabled = false;
  setMuted(true);
  dispatch(ControlEvents.AUDIO_MUTED, { trackId: track.id });
  return true;
}

/**
 * Unmute the local microphone.
 * @returns {boolean}
 */
export function unmute() {
  const track = getAudioTrack();
  if (!track) {
    console.warn('[AudioControl] No audio track available');
    return false;
  }

  track.enabled = true;
  setMuted(false);
  dispatch(ControlEvents.AUDIO_UNMUTED, { trackId: track.id });
  return true;
}

/**
 * Toggle mute state.
 * @returns {'muted'|'unmuted'|null}
 */
export function toggleMute() {
  if (isMuted()) {
    return unmute() ? 'unmuted' : null;
  }
  return mute() ? 'muted' : null;
}
