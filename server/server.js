/**
 * QuickMeet — HTTP Server Entry Point
 * Creates HTTP server, attaches WebSocket signaling, and starts listening.
 */

require('dotenv').config();

const http = require('http');
const app = require('./app');
const { initWebSocketServer } = require('./websocket/websocketServer');
const { PORT, NODE_ENV } = require('./config/constants');
const logger = require('./utils/logger');

const server = http.createServer(app);

const wss = initWebSocketServer(server);

function handleServerError(err) {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use.`);
    logger.error('Another QuickMeet server may still be running.');
    logger.error('Fix (PowerShell): netstat -ano | findstr :' + PORT);
    logger.error('Then: taskkill /PID <pid> /F');
    process.exit(1);
  }

  logger.error('Server failed to start:', err.message);
  process.exit(1);
}

server.on('error', handleServerError);
wss.on('error', handleServerError);

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} (${NODE_ENV})`);
  logger.info(`App:       http://localhost:${PORT}`);
  logger.info(`Health:    http://localhost:${PORT}/health`);
  logger.info(`WebSocket: ws://localhost:${PORT}`);
});
