const http = require('node:http');
const app = require('./app');
const config = require('./config');
const pool = require('./db/pool');

const server = http.createServer(app);

async function start() {
  await pool.query('SELECT 1');
  server.listen(config.port, () => {
    console.log(`API listening on port ${config.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start API:', err);
  process.exit(1);
});
