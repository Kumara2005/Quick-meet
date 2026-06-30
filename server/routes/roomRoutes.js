/**
 * QuickMeet — Room Routes
 * Defines REST endpoints for room management.
 */

const express = require('express');
const roomController = require('../controllers/roomController');

const router = express.Router();

/** Browsers use GET; create/join/leave require POST. */
function methodNotAllowed(action) {
  return (_req, res) => {
    res.status(405).json({
      success: false,
      message: `This endpoint requires POST. Use: POST /api/rooms/${action}`,
      hint: action === 'create'
        ? 'In PowerShell: Invoke-RestMethod -Method POST -Uri "http://localhost:PORT/api/rooms/create"'
        : `Send a JSON body with roomCode to POST /api/rooms/${action}`,
    });
  };
}

/** GET /api/rooms — API info (browser-friendly) */
router.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'QuickMeet Room API',
    hint: 'Open http://localhost:3001 in your browser for the app UI.',
    endpoints: {
      create: { method: 'POST', path: '/api/rooms/create' },
      join: { method: 'POST', path: '/api/rooms/join', body: { roomCode: 'ABX-392' } },
      leave: { method: 'POST', path: '/api/rooms/leave', body: { roomCode: 'ABX-392' } },
      getRoom: { method: 'GET', path: '/api/rooms/:code', example: '/api/rooms/ABX-392' },
    },
  });
});

router.get('/create', methodNotAllowed('create'));
router.get('/join', methodNotAllowed('join'));
router.get('/leave', methodNotAllowed('leave'));

router.post('/create', roomController.createRoom);
router.post('/join', roomController.joinRoom);
router.post('/leave', roomController.leaveRoom);
router.get('/:code', roomController.getRoom);

module.exports = router;
