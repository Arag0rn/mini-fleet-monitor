const http = require('node:http');
const app = require('./app');
const config = require('./config');
const pool = require('./db/pool');
const { connectRedis } = require('./db/redis');
const simulation = require('./services/simulationService');
const { attachRobotSocket } = require('./ws/robotSocket');

const server = http.createServer(app);

async function start() {
  await Promise.all([pool.query('SELECT 1'), connectRedis()]);
  await attachRobotSocket(server);
  server.listen(config.port, () => {
    console.log(`API listening on port ${config.port}`);
    simulation.start();
  });
}

start().catch((err) => {
  console.error('Failed to start API:', err);
  process.exit(1);
});
