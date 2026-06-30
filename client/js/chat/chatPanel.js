/**
 * QuickMeet — Chat Panel UI
 * Sliding side panel with messages, input, and unread badge.
 */

import * as chatController from './chatController.js';
import * as chatState from './chatState.js';
import { ChatEvents, on as onChatEvent, dispatch as dispatchChat } from './chatEvents.js';
import * as appState from '../core/appState.js';
import { renderMessageElement } from './messageRenderer.js';
import { AppConfig } from '../config/appConfig.js';
import * as socket from '../socket/socket.js';
import { SocketEvents } from '../config/appConfig.js';

/** @type {HTMLElement|null} */
let panel = null;

/** @type {HTMLElement|null} */
let messagesList = null;

/** @type {HTMLTextAreaElement|null} */
let input = null;

/** @type {HTMLButtonElement|null} */
let sendBtn = null;

/** @type {HTMLButtonElement|null} */
let toggleBtn = null;

/** @type {HTMLElement|null} */
let unreadBadge = null;

/** @type {HTMLElement|null} */
let layout = null;

/** @type {HTMLButtonElement|null} */
let closeBtn = null;

/** @type {Function|null} */
let onNotify = null;

/** @type {boolean} */
let handlersBound = false;

/** @type {Function|null} */
let globalKeydownHandler = null;

/**
 * @param {{ onNotify?: (message: string, type?: string) => void }} [options]
 */
export function init(options = {}) {
  onNotify = options.onNotify || null;

  panel = document.getElementById('chat-panel');
  messagesList = document.getElementById('chat-messages');
  input = document.getElementById('chat-input');
  sendBtn = document.getElementById('chat-send-btn');
  toggleBtn = document.getElementById('btn-chat');
  unreadBadge = document.getElementById('chat-unread-badge');
  layout = document.querySelector('.room__stage');
  closeBtn = document.getElementById('chat-close-btn');

  toggleBtn?.addEventListener('click', togglePanel);
  closeBtn?.addEventListener('click', closePanel);
  sendBtn?.addEventListener('click', handleSend);
  input?.addEventListener('keydown', handleInputKeydown);
  input?.addEventListener('input', handleInputChange);

  globalKeydownHandler = handleGlobalKeydown;
  document.addEventListener('keydown', globalKeydownHandler);

  if (!handlersBound) {
    handlersBound = true;

    onChatEvent(ChatEvents.MESSAGE_SENT, appendMessage);
    onChatEvent(ChatEvents.MESSAGE_RECEIVED, appendMessage);
    onChatEvent(ChatEvents.SEND_FAILED, handleSendFailed);
  }

  updateUnreadBadge();
}

function handleGlobalKeydown(event) {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
    return;
  }

  if (event.key.toLowerCase() === 'c' && !event.ctrlKey && !event.metaKey) {
    event.preventDefault();
    togglePanel();
  }
}

function togglePanel() {
  if (chatState.isChatOpen()) {
    closePanel();
  } else {
    openPanel();
  }
}

function openPanel() {
  chatState.setChatOpen(true);
  appState.resetUnreadCount();
  updateUnreadBadge();

  panel?.removeAttribute('hidden');
  layout?.classList.add('room__stage--chat-open');
  toggleBtn?.classList.add('btn--active');
  toggleBtn?.setAttribute('aria-expanded', 'true');

  dispatchChat(ChatEvents.PANEL_OPENED);

  if (socket.isConnected()) {
    socket.send(SocketEvents.CHAT_OPENED, {});
  }

  scrollToBottom();
  window.setTimeout(() => input?.focus(), 300);
}

function closePanel() {
  chatState.setChatOpen(false);

  panel?.setAttribute('hidden', '');
  layout?.classList.remove('room__stage--chat-open');
  toggleBtn?.classList.remove('btn--active');
  toggleBtn?.setAttribute('aria-expanded', 'false');

  dispatchChat(ChatEvents.PANEL_CLOSED);
}

/**
 * @param {{ id: string }} message
 */
function appendMessage(message) {
  if (!messagesList) return;

  const el = renderMessageElement(message);
  messagesList.appendChild(el);
  scrollToBottom();
}

function scrollToBottom() {
  if (!messagesList) return;
  messagesList.scrollTop = messagesList.scrollHeight;
}

function handleSend() {
  if (!input) return;

  const text = input.value;

  if (chatController.sendMessage(text)) {
    input.value = '';
    updateCharCount();
  }
}

function handleInputKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    handleSend();
  }

  if (event.key === 'Escape' && chatState.isChatOpen()) {
    event.preventDefault();
    closePanel();
    toggleBtn?.focus();
  }
}

function handleInputChange() {
  updateCharCount();
}

function updateCharCount() {
  const counter = document.getElementById('chat-char-count');
  if (!counter || !input) return;
  counter.textContent = `${input.value.length}/${AppConfig.CHAT_MAX_LENGTH}`;
}

function handleSendFailed({ reason }) {
  const messages = {
    empty: 'Message cannot be empty',
    'too-long': `Message must be ${AppConfig.CHAT_MAX_LENGTH} characters or less`,
    disconnected: 'Cannot send — not connected to server',
    'send-failed': 'Failed to send message',
  };
  onNotify?.(messages[reason] || 'Failed to send message', 'error');
}

function updateUnreadBadge() {
  if (!unreadBadge) return;

  const count = appState.getState().unreadCount;

  if (count > 0 && !chatState.isChatOpen()) {
    unreadBadge.hidden = false;
    unreadBadge.textContent = String(count);
    unreadBadge.setAttribute('aria-label', `${count} unread messages`);
  } else {
    unreadBadge.hidden = true;
    unreadBadge.textContent = '';
  }
}

/**
 * React to unread count changes from app bus.
 */
export function onUnreadCountChanged() {
  updateUnreadBadge();
}

export function destroy() {
  toggleBtn?.removeEventListener('click', togglePanel);
  closeBtn?.removeEventListener('click', closePanel);
  sendBtn?.removeEventListener('click', handleSend);
  input?.removeEventListener('keydown', handleInputKeydown);
  input?.removeEventListener('input', handleInputChange);

  if (globalKeydownHandler) {
    document.removeEventListener('keydown', globalKeydownHandler);
    globalKeydownHandler = null;
  }

  closePanel();
}
