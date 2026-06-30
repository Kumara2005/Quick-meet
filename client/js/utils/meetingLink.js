/**
 * QuickMeet — Meeting Link Utilities
 * Builds shareable URLs and copies text to the clipboard.
 */

/**
 * Build a full meeting URL for the current origin.
 * @param {string} roomCode
 * @returns {string}
 */
export function buildMeetingUrl(roomCode) {
  const url = new URL('/room.html', window.location.origin);
  url.searchParams.set('room', roomCode);
  return url.toString();
}

/**
 * Copy text to the clipboard.
 * @param {string} text
 * @returns {Promise<void>}
 */
export async function copyToClipboard(text) {
  await navigator.clipboard.writeText(text);
}

/**
 * Session storage key for how the user entered the room.
 * @type {'create'|'home-join'|null}
 */
export const ENTRY_STORAGE_KEY = 'quickmeet.entry';

/**
 * Record how the user is entering a room (cleared on room page load).
 * @param {'create'|'home-join'} entry
 * @param {string} roomCode
 */
export function setRoomEntry(entry, roomCode) {
  sessionStorage.setItem(ENTRY_STORAGE_KEY, entry);
  sessionStorage.setItem('quickmeet.roomCode', roomCode);
}

/**
 * Read and clear the stored room entry mode.
 * @returns {'create'|'home-join'|'link'}
 */
export function consumeRoomEntry() {
  const entry = sessionStorage.getItem(ENTRY_STORAGE_KEY);
  sessionStorage.removeItem(ENTRY_STORAGE_KEY);
  sessionStorage.removeItem('quickmeet.roomCode');

  if (entry === 'create' || entry === 'home-join') {
    return entry;
  }
  return 'link';
}
