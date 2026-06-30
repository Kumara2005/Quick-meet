/**
 * QuickMeet — Reaction Domain Events
 */

import { createEventBus } from '../core/eventBus.js';

export const ReactionEvents = {
  SENT: 'REACTION_SENT',
  RECEIVED: 'REACTION_RECEIVED',
  SEND_FAILED: 'REACTION_SEND_FAILED',
};

const bus = createEventBus();

export const on = bus.on;
export const off = bus.off;
export const dispatch = bus.dispatch;
