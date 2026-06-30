/**
 * QuickMeet — Chat Message Renderer
 * Safe HTML rendering with XSS prevention.
 */

/**
 * Escape HTML special characters.
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format timestamp for display.
 * @param {number} timestamp
 * @returns {string}
 */
export function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Build a chat message element.
 * @param {{ id: string, peerId: string, text: string, timestamp: number, isOwn: boolean }} message
 * @returns {HTMLElement}
 */
export function renderMessageElement(message) {
  const el = document.createElement('div');
  el.className = `chat-message${message.isOwn ? ' chat-message--own' : ' chat-message--remote'}`;
  el.dataset.messageId = message.id;
  el.setAttribute('role', 'listitem');

  const sender = message.isOwn ? 'You' : 'Participant';
  const time = formatTimestamp(message.timestamp);

  el.innerHTML = `
    <div class="chat-message__meta">
      <span class="chat-message__sender">${escapeHtml(sender)}</span>
      <time class="chat-message__time" datetime="${new Date(message.timestamp).toISOString()}">${escapeHtml(time)}</time>
    </div>
    <p class="chat-message__text">${escapeHtml(message.text)}</p>
  `;

  return el;
}
