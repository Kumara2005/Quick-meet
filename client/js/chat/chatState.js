/**
 * QuickMeet — Chat State Helpers
 * Collaboration state lives in appState; these are typed helpers.
 */

import * as appState from '../core/appState.js';

/**
 * @typedef {{ id: string, peerId: string, text: string, timestamp: number, isOwn: boolean }} ChatMessage
 */

/**
 * @param {ChatMessage} message
 */
export function addMessage(message) {
  appState.addChatMessage(message);
}

/**
 * @returns {ChatMessage[]}
 */
export function getMessages() {
  return appState.getState().messages;
}

/**
 * @param {boolean} open
 */
export function setChatOpen(open) {
  appState.setChatOpen(open);
}

/**
 * @returns {boolean}
 */
export function isChatOpen() {
  return appState.getState().chatOpen;
}

/**
 * @returns {number}
 */
export function getUnreadCount() {
  return appState.getState().unreadCount;
}
