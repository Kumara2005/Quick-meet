/**
 * QuickMeet — Screen share track detection (display layout only)
 */

/**
 * @param {MediaStreamTrack|null} track
 * @returns {boolean}
 */
export function isScreenShareTrack(track) {
  if (!track || track.kind !== 'video') return false;

  const settings = typeof track.getSettings === 'function' ? track.getSettings() : {};
  if (settings.displaySurface) return true;

  if (track.contentHint === 'detail' || track.contentHint === 'text') return true;

  const label = track.label || '';
  return /screen|window|display|monitor|share/i.test(label);
}

/**
 * @param {MediaStream|null} stream
 * @returns {boolean}
 */
export function isScreenShareStream(stream) {
  if (!stream) return false;
  return stream.getVideoTracks().some(isScreenShareTrack);
}

/**
 * Pick the best video track from a remote stream for the current layout mode.
 * @param {MediaStream|null} stream
 * @param {'camera'|'screen'} preference
 * @returns {MediaStreamTrack|null}
 */
export function pickRemoteVideoTrack(stream, preference) {
  if (!stream) return null;

  const tracks = stream.getVideoTracks();
  if (tracks.length === 0) return null;
  if (tracks.length === 1) return tracks[0];

  if (preference === 'screen') {
    return tracks.find(isScreenShareTrack) || tracks[tracks.length - 1];
  }

  return tracks.find((track) => !isScreenShareTrack(track)) || tracks[0];
}

/**
 * @param {MediaStreamTrack|null} track
 * @returns {MediaStream|null}
 */
export function displayStreamFromTrack(track) {
  if (!track) return null;
  return new MediaStream([track]);
}
