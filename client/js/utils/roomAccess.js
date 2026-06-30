/**
 * QuickMeet — Room Access API
 * Validates and joins rooms via REST before WebSocket signaling.
 */

import { consumeRoomEntry } from './meetingLink.js';

/**
 * @typedef {'ok'|'not-found'|'full'|'error'} RoomAccessResult
 */

/**
 * @param {string} roomCode
 * @returns {Promise<RoomAccessResult>}
 */
export async function resolveRoomAccess(roomCode) {
  const entry = consumeRoomEntry();

  if (entry === 'home-join') {
    return validateRoomExists(roomCode);
  }

  if (entry === 'create') {
    return validateRoomExists(roomCode);
  }

  return joinRoomViaApi(roomCode);
}

/**
 * @param {string} roomCode
 * @returns {Promise<RoomAccessResult>}
 */
async function validateRoomExists(roomCode) {
  try {
    const res = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}`);

    if (res.status === 404) {
      return 'not-found';
    }

    if (!res.ok) {
      return 'error';
    }

    return 'ok';
  } catch {
    return 'error';
  }
}

/**
 * @param {string} roomCode
 * @returns {Promise<RoomAccessResult>}
 */
async function joinRoomViaApi(roomCode) {
  try {
    const res = await fetch('/api/rooms/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode }),
    });

    if (res.status === 404) {
      return 'not-found';
    }

    if (res.status === 403) {
      return 'full';
    }

    if (!res.ok) {
      return 'error';
    }

    return 'ok';
  } catch {
    return 'error';
  }
}
