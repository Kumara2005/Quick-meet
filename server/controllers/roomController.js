/**
 * QuickMeet — Room Controller
 * Validates input, delegates to services, and formats HTTP responses.
 */

const roomService = require('../services/roomService');
const {
  ROOM_CODE_PATTERN,
  MESSAGES,
  HTTP_STATUS,
} = require('../config/constants');

const POST_ONLY_PATHS = ['create', 'join', 'leave'];

/**
 * Normalize and validate a room code string.
 * @param {string} rawCode
 * @returns {string|null} Normalized code or null if invalid/missing
 */
function parseRoomCode(rawCode) {
  if (!rawCode || typeof rawCode !== 'string') {
    return null;
  }

  const normalized = rawCode.trim().toUpperCase();

  if (!ROOM_CODE_PATTERN.test(normalized)) {
    return null;
  }

  return normalized;
}

/**
 * POST /api/rooms/create
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function createRoom(req, res, next) {
  try {
    const result = roomService.createRoom();
    res.status(HTTP_STATUS.OK).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/rooms/join
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function joinRoom(req, res, next) {
  try {
    const { roomCode: rawCode } = req.body || {};

    if (!rawCode) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.MISSING_ROOM_CODE,
      });
    }

    const roomCode = parseRoomCode(rawCode);

    if (!roomCode) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.INVALID_ROOM_CODE,
      });
    }

    const result = roomService.joinRoom(roomCode);
    res.status(HTTP_STATUS.OK).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/rooms/leave
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function leaveRoom(req, res, next) {
  try {
    const { roomCode: rawCode } = req.body || {};

    if (!rawCode) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.MISSING_ROOM_CODE,
      });
    }

    const roomCode = parseRoomCode(rawCode);

    if (!roomCode) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.INVALID_ROOM_CODE,
      });
    }

    const result = roomService.leaveRoom(roomCode);
    res.status(HTTP_STATUS.OK).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/rooms/:code
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function getRoom(req, res, next) {
  try {
    const rawCode = req.params.code;

    if (POST_ONLY_PATHS.includes(rawCode?.toLowerCase())) {
      return res.status(405).json({
        success: false,
        message: `This endpoint requires POST. Use: POST /api/rooms/${rawCode.toLowerCase()}`,
      });
    }

    const roomCode = parseRoomCode(rawCode);

    if (!roomCode) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.INVALID_ROOM_CODE,
      });
    }

    const result = roomService.getRoomInfo(roomCode);
    res.status(HTTP_STATUS.OK).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoom,
};
