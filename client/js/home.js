/**
 * QuickMeet — Home Page
 * Creates/joins rooms via REST API and navigates to the waiting room.
 */

import { AppConfig } from './config/appConfig.js';
import { checkWebRTCSupport } from './utils/browserSupport.js';
import { buildMeetingUrl, setRoomEntry } from './utils/meetingLink.js';

const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const roomCodeInput = document.getElementById('room-code-input');

const { supported, message: compatMessage } = checkWebRTCSupport();
if (!supported && compatMessage) {
  createRoomBtn.disabled = true;
  joinRoomBtn.disabled = true;
  alert(compatMessage);
}

/**
 * Navigate to the waiting room page.
 * @param {string} roomCode
 */
function goToRoom(roomCode, entry) {
  setRoomEntry(entry, roomCode);
  window.location.href = buildMeetingUrl(roomCode);
}

/**
 * Create a new meeting room via REST API.
 */
export async function createRoom() {
  createRoomBtn.disabled = true;

  try {
    const res = await fetch('/api/rooms/create', { method: 'POST' });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to create room');
    }

    goToRoom(data.roomCode, 'create');
  } catch (err) {
    alert(err.message || 'Failed to create room');
    createRoomBtn.disabled = false;
  }
}

/**
 * Join an existing meeting room via REST API.
 */
export async function joinRoom() {
  const code = roomCodeInput.value.trim().toUpperCase();

  if (!code) {
    alert('Please enter a room code');
    roomCodeInput.focus();
    return;
  }

  if (!AppConfig.ROOM_CODE_PATTERN.test(code)) {
    alert('Invalid room code format. Use ABC-123.');
    roomCodeInput.focus();
    return;
  }

  joinRoomBtn.disabled = true;

  try {
    const res = await fetch('/api/rooms/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: code }),
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to join room');
    }

    goToRoom(code, 'home-join');
  } catch (err) {
    alert(err.message || 'Failed to join room');
    joinRoomBtn.disabled = false;
  }
}

createRoomBtn.addEventListener('click', createRoom);
joinRoomBtn.addEventListener('click', joinRoom);

roomCodeInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    joinRoom();
  }
});

roomCodeInput.addEventListener('input', (event) => {
  event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
});
