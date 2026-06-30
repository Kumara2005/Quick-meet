/**
 * QuickMeet — Express Application
 * Configures middleware, routes, and error handling.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const roomRoutes = require('./routes/roomRoutes');
const { RoomError } = require('./services/roomService');
const { MESSAGES, HTTP_STATUS } = require('./config/constants');
const logger = require('./utils/logger');

const app = express();
const CLIENT_DIR = path.join(__dirname, '../client');

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/api/rooms', roomRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.status(HTTP_STATUS.OK).json({ success: true, status: 'ok' });
});

// Serve frontend static files (index.html, room.html, css, js)
app.use(express.static(CLIENT_DIR));

// 404 handler for unknown API routes only
app.use('/api', (_req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message: 'Route not found',
  });
});

// Global error handler — never crash the server
app.use((err, _req, res, _next) => {
  if (err instanceof RoomError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  logger.error('Unhandled error:', err.message);

  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: MESSAGES.INTERNAL_ERROR,
  });
});

module.exports = app;
