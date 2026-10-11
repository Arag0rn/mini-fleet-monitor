const { redis } = require('../db/redis');

const ROBOTS_KEY = 'robots:all';
const TTL_SECONDS = 10;

async function readRobots() {
  try {
    const cached = await redis.get(ROBOTS_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (err) {
    console.error('Robot cache read failed:', err.message);
    return null;
  }
}

async function writeRobots(robots) {
  try {
    await redis.set(ROBOTS_KEY, JSON.stringify(robots), { EX: TTL_SECONDS });
  } catch (err) {
    console.error('Robot cache write failed:', err.message);
  }
}

async function invalidateRobots() {
  try {
    await redis.del(ROBOTS_KEY);
  } catch (err) {
    console.error('Robot cache invalidation failed:', err.message);
  }
}

module.exports = { readRobots, writeRobots, invalidateRobots };
