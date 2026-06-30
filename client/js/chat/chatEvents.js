/**
 * QuickMeet — Chat Domain Events
 */

import { createEventBus } from '../core/eventBus.js';

export const ChatEvents = {
  MESSAGE_SENT: 'MESSAGE_SENT',
  MESSAGE_RECEIVED: 'MESSAGE_RECEIVED',
  PANEL_OPENED: 'PANEL_OPENED',
  PANEL_CLOSED: 'PANEL_CLOSED',
  SEND_FAILED: 'SEND_FAILED',
  // TODO: CHAT_TYPING — typing indicator (future)
};

const bus = createEventBus();

export const on = bus.on;
export const off = bus.off;
export const dispatch = bus.dispatch;
