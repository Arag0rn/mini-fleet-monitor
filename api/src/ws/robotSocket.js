const { WebSocketServer, WebSocket } = require('ws');
const { verifyToken } = require('../services/authService');
const { subscriber } = require('../db/redis');
const { FLEET_EVENTS_CHANNEL } = require('../services/eventService');

const WS_PATH = '/ws';
const HEARTBEAT_MS = 30000;

function rejectUpgrade(socket, status) {
  socket.write(`HTTP/1.1 ${status}\r\n\r\n`);
  socket.destroy();
}

function onSocketError(err) {
  console.error('WebSocket upgrade socket error:', err.message);
}

async function attachRobotSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    socket.on('error', onSocketError);
    let url;
    try {
      url = new URL(request.url, 'http://localhost');
    } catch {
      return rejectUpgrade(socket, '400 Bad Request');
    }
    if (url.pathname !== WS_PATH) return rejectUpgrade(socket, '404 Not Found');

    try {
      verifyToken(url.searchParams.get('token') ?? '');
    } catch {
      return rejectUpgrade(socket, '401 Unauthorized');
    }

    socket.removeListener('error', onSocketError);
    wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request));
  });

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    ws.on('error', (err) => console.error('WebSocket client error:', err.message));
  });

  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, HEARTBEAT_MS);
  wss.on('close', () => clearInterval(heartbeat));

  await subscriber.subscribe(FLEET_EVENTS_CHANNEL, (message) => {
    for (const ws of wss.clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(message);
    }
  });

  return wss;
}

module.exports = { attachRobotSocket };
