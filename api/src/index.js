const http = require('node:http');
const app = require('./app');
const config = require('./config');
const pool = require('./db/pool');
const { redis, subscriber, connectRedis } = require('./db/redis');
const simulation = require('./services/simulationService');
const { attachRobotSocket } = require('./ws/robotSocket');

const server = http.createServer(app);
let wss;

async function start() {
  await Promise.all([pool.query('SELECT 1'), connectRedis()]);
  wss = await attachRobotSocket(server);
  server.listen(config.port, () => {
    console.log(`API listening on port ${config.port}`);
    simulation.start();
  });
}

async function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  await simulation.stop();
  for (const client of wss?.clients ?? []) client.terminate();
  wss?.close();
  server.close();
  server.closeAllConnections();
  await Promise.allSettled([pool.end(), redis.close(), subscriber.close()]);
  process.exit(0);
}

process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);

start().catch((err) => {
  console.error('Failed to start API:', err);
  process.exit(1);
});
