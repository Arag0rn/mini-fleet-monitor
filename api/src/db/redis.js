const { createClient } = require('redis');
const config = require('../config');

function createRedisClient(name) {
  let wasReady = false;
  const client = createClient({
    url: config.redisUrl,
    disableOfflineQueue: true,
    socket: {
      connectTimeout: 5000,
      reconnectStrategy: (retries, cause) => (wasReady ? Math.min(retries * 200, 3000) : cause),
    },
  });
  client.on('ready', () => {
    wasReady = true;
  });
  client.on('error', (err) => {
    console.error(`Redis ${name} error:`, err.code || err.message);
  });
  return client;
}

const redis = createRedisClient('client');
const subscriber = createRedisClient('subscriber');

async function connectRedis() {
  await Promise.all([redis.connect(), subscriber.connect()]);
}

module.exports = { redis, subscriber, connectRedis };
