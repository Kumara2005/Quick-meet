/**
 * QuickMeet — WebSocket Server
 * Attaches a WebSocket server to the existing HTTP server.
 */

const WebSocket = require('ws');
const connectionManager = require('./connectionManager');
const messageHandler = require('./messageHandler');
const { EVENTS } = require('./eventTypes');
const { WS_TIMING } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * Initialize the WebSocket server on the given HTTP server.
 * @param {import('http').Server} httpServer
 * @returns {import('ws').WebSocketServer}
 */
function initWebSocketServer(httpServer) {
  const wss = new WebSocket.Server({ server: httpServer });

  wss.on('connection', (ws) => {
    const socketId = connectionManager.addConnection(ws);

    logger.info(`Socket Connected: ${socketId.slice(0, 8)}… (total: ${connectionManager.getConnectionCount()})`);

    ws.on('message', (raw) => {
      messageHandler.handleMessage(socketId, raw.toString());
    });

    ws.on('close', () => {
      messageHandler.handleDisconnect(socketId);
      logger.info(`Socket Disconnected: ${socketId.slice(0, 8)}… (total: ${connectionManager.getConnectionCount()})`);
    });

    ws.on('error', (err) => {
      logger.error(`Socket Error (${socketId.slice(0, 8)}…):`, err.message);
    });
  });

  startHeartbeat(wss);

  logger.info('WebSocket server initialized');
  return wss;
}

/**
 * Start periodic heartbeat to detect dead connections.
 * @param {import('ws').WebSocketServer} wss
 */
function startHeartbeat(wss) {
  setInterval(() => {
    const connections = connectionManager.getAllConnections();

    for (const [socketId, conn] of connections) {
      if (!conn.isAlive) {
        logger.warn(`Heartbeat Timeout: ${socketId.slice(0, 8)}…`);
        conn.ws.terminate();
        messageHandler.handleDisconnect(socketId);
        continue;
      }

      connectionManager.markAwaitingPong(socketId);

      if (conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.send(JSON.stringify({ type: EVENTS.PING, payload: {} }));
      }
    }
  }, WS_TIMING.HEARTBEAT_INTERVAL_MS);
}

module.exports = { initWebSocketServer, WS_TIMING };
