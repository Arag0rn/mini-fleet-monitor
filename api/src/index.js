const http = require('node:http');
const app = require('./app');
const config = require('./config');

const server = http.createServer(app);

server.listen(config.port, () => {
  console.log(`API listening on port ${config.port}`);
});
