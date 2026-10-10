const { redis } = require('../db/redis');

const ROBOT_UPDATES_CHANNEL = 'robots:updates';

async function publishRobotUpdates(robots) {
  if (robots.length === 0) return;
  try {
    await Promise.all(
      robots.map((robot) =>
        redis.publish(ROBOT_UPDATES_CHANNEL, JSON.stringify({ type: 'robot.updated', robot })),
      ),
    );
  } catch (err) {
    console.error('Publishing robot updates failed:', err.message);
  }
}

module.exports = { ROBOT_UPDATES_CHANNEL, publishRobotUpdates };
