/**
 * QuickMeet — Reaction Overlay UI
 * Toolbar popup and floating animations above participant videos.
 */

import * as reactionController from './reactionController.js';
import { ReactionEvents, on as onReactionEvent } from './reactionEvents.js';
import { AppConfig } from '../config/appConfig.js';
import { animateReaction } from './reactionAnimator.js';

/** @type {HTMLButtonElement|null} */
let reactionBtn = null;

/** @type {HTMLElement|null} */
let popup = null;

/** @type {HTMLElement|null} */
let localLane = null;

/** @type {HTMLElement|null} */
let remoteLane = null;

/** @type {(() => string|null)|null} */
let getSelfPeerId = null;

/** @type {Function|null} */
let onNotify = null;

/** @type {boolean} */
let handlersBound = false;

/** @type {Function|null} */
let documentClickHandler = null;

/**
 * @param {{
 *   getSelfPeerId: () => string|null,
 *   localVideo: HTMLVideoElement|null,
 *   remoteVideo: HTMLVideoElement|null,
 *   onNotify?: (message: string, type?: string) => void,
 * }} options
 */
export function init(options) {
  getSelfPeerId = options.getSelfPeerId;
  onNotify = options.onNotify || null;

  reactionBtn = document.getElementById('btn-reactions');
  popup = document.getElementById('reaction-popup');
  localLane = document.getElementById('reaction-lane-local');
  remoteLane = document.getElementById('reaction-lane-remote');

  reactionBtn?.addEventListener('click', togglePopup);
  popup?.querySelectorAll('[data-reaction]').forEach((btn) => {
    btn.addEventListener('click', handleReactionPick);
  });

  documentClickHandler = handleDocumentClick;
  document.addEventListener('click', documentClickHandler);

  reactionController.init({
    getSelfPeerId: () => getSelfPeerId?.() || null,
    onReactionVisual: showReactionAnimation,
  });

  if (!handlersBound) {
    handlersBound = true;
    onReactionEvent(ReactionEvents.SEND_FAILED, handleSendFailed);
  }
}

function togglePopup(event) {
  event.stopPropagation();

  if (!popup || !reactionBtn) return;

  const isOpen = !popup.hidden;
  popup.hidden = isOpen;
  reactionBtn.setAttribute('aria-expanded', String(!isOpen));
  reactionBtn.classList.toggle('btn--active', !isOpen);

  if (!isOpen) {
    popup.querySelector('button')?.focus();
  }
}

function closePopup() {
  if (!popup || !reactionBtn) return;
  popup.hidden = true;
  reactionBtn.setAttribute('aria-expanded', 'false');
  reactionBtn.classList.remove('btn--active');
}

function handleDocumentClick(event) {
  if (!popup || popup.hidden) return;

  const target = event.target;
  if (target instanceof Node && (popup.contains(target) || reactionBtn?.contains(target))) {
    return;
  }

  closePopup();
}

/**
 * @param {Event} event
 */
function handleReactionPick(event) {
  const btn = event.currentTarget;
  if (!(btn instanceof HTMLButtonElement)) return;

  const emoji = btn.dataset.reaction;
  if (!emoji) return;

  if (reactionController.sendReaction(emoji)) {
    closePopup();
    reactionBtn?.focus();
  }
}

/**
 * @param {{ emoji: string, peerId: string, isOwn: boolean }} detail
 */
function showReactionAnimation(detail) {
  const lane = detail.isOwn ? localLane : remoteLane;
  animateReaction(lane, detail.emoji);
}

function handleSendFailed({ reason }) {
  const messages = {
    unknown: 'Unknown reaction',
    disconnected: 'Cannot send reaction — not connected',
    'send-failed': 'Failed to send reaction',
  };
  onNotify?.(messages[reason] || 'Failed to send reaction', 'error');
}

export function destroy() {
  reactionBtn?.removeEventListener('click', togglePopup);
  popup?.querySelectorAll('[data-reaction]').forEach((btn) => {
    btn.removeEventListener('click', handleReactionPick);
  });

  if (documentClickHandler) {
    document.removeEventListener('click', documentClickHandler);
    documentClickHandler = null;
  }

  closePopup();
  reactionController.destroy();
}
