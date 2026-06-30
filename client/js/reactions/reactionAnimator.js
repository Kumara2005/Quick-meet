/**
 * QuickMeet — Reaction Animator
 * Queues floating emoji animations with vertical stagger.
 */

const ANIMATION_DURATION_MS = 2800;
const STAGGER_OFFSET_PX = 36;

/** @type {Map<HTMLElement, number>} */
const laneCounts = new Map();

/**
 * Spawn a floating reaction emoji on a video lane.
 * @param {HTMLElement} lane
 * @param {string} emoji
 */
export function animateReaction(lane, emoji) {
  if (!lane) return;

  const count = laneCounts.get(lane) || 0;
  laneCounts.set(lane, count + 1);

  const bubble = document.createElement('span');
  bubble.className = 'reaction-float';
  bubble.textContent = emoji;
  bubble.setAttribute('role', 'img');
  bubble.setAttribute('aria-label', `Reaction ${emoji}`);
  bubble.style.setProperty('--reaction-offset', `${count * STAGGER_OFFSET_PX}px`);

  lane.appendChild(bubble);

  window.setTimeout(() => {
    bubble.remove();
    const remaining = (laneCounts.get(lane) || 1) - 1;
    if (remaining <= 0) {
      laneCounts.delete(lane);
    } else {
      laneCounts.set(lane, remaining);
    }
  }, ANIMATION_DURATION_MS);
}

/**
 * Clear animation state for a lane.
 * @param {HTMLElement|null} lane
 */
export function clearLane(lane) {
  if (lane) {
    laneCounts.delete(lane);
    lane.querySelectorAll('.reaction-float').forEach((el) => el.remove());
  }
}
