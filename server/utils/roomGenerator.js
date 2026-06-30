/**
 * QuickMeet — Room Code Generator
 * Generates unique codes in the format: ABC-123
 */

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Generate a random room code segment (letters or digits).
 * @param {string} charset - Character set to pick from
 * @param {number} length - Number of characters
 * @returns {string}
 */
function randomSegment(charset, length) {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset[Math.floor(Math.random() * charset.length)];
  }
  return result;
}

/**
 * Generate a single room code in ABC-123 format.
 * @returns {string}
 */
function generateCode() {
  const letters = randomSegment(LETTERS, 3);
  const digits = randomSegment('0123456789', 3);
  return `${letters}-${digits}`;
}

/**
 * Generate a unique room code that does not exist in the provided store.
 * @param {Object} existingRooms - In-memory rooms object keyed by room code
 * @param {number} [maxAttempts=100] - Maximum generation attempts before failing
 * @returns {string}
 */
function generateUniqueRoomCode(existingRooms, maxAttempts = 100) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateCode();
    if (!existingRooms[code]) {
      return code;
    }
  }

  throw new Error('Unable to generate a unique room code');
}

module.exports = {
  generateCode,
  generateUniqueRoomCode,
};
