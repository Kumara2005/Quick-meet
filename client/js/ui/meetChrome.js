/**
 * QuickMeet — Meet-style chrome (UI only)
 * Clock, meeting info popover, participant count display.
 */

/** @type {number|null} */
let clockInterval = null;

/** @type {Function|null} */
let outsideClickHandler = null;

/**
 * Initialize top bar chrome.
 */
export function initMeetChrome() {
  startClock();

  const infoBtn = document.getElementById('btn-meeting-info');
  const popover = document.getElementById('meeting-info-popover');

  infoBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleMeetingInfo();
  });

  outsideClickHandler = (event) => {
    if (!popover || popover.hidden) return;
    const target = event.target;
    if (target instanceof Node && (popover.contains(target) || infoBtn?.contains(target))) {
      return;
    }
    closeMeetingInfo();
  };
  document.addEventListener('click', outsideClickHandler);
}

/**
 * @param {number} count
 */
export function setParticipantCount(count) {
  const el = document.getElementById('participant-count');
  if (!el) return;
  el.textContent = String(Math.max(1, count));
}

function startClock() {
  const clock = document.getElementById('room-clock');
  if (!clock) return;

  const tick = () => {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    clock.setAttribute('datetime', now.toISOString());
  };

  tick();
  clockInterval = window.setInterval(tick, 30_000);
}

function toggleMeetingInfo() {
  const popover = document.getElementById('meeting-info-popover');
  const btn = document.getElementById('btn-meeting-info');
  if (!popover || !btn) return;

  const open = popover.hidden;
  popover.hidden = !open;
  btn.setAttribute('aria-expanded', String(open));
  btn.classList.toggle('room__info-btn--active', open);
}

function closeMeetingInfo() {
  const popover = document.getElementById('meeting-info-popover');
  const btn = document.getElementById('btn-meeting-info');
  if (!popover || !btn) return;

  popover.hidden = true;
  btn.setAttribute('aria-expanded', 'false');
  btn.classList.remove('room__info-btn--active');
}

export function destroyMeetChrome() {
  if (clockInterval !== null) {
    clearInterval(clockInterval);
    clockInterval = null;
  }
  if (outsideClickHandler) {
    document.removeEventListener('click', outsideClickHandler);
    outsideClickHandler = null;
  }
  closeMeetingInfo();
}
