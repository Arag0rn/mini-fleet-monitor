const { redis } = require('../db/redis');

const FLEET_EVENTS_CHANNEL = 'fleet:events';

async function publish(events) {
  if (events.length === 0) return;
  try {
    await Promise.all(events.map((event) => redis.publish(FLEET_EVENTS_CHANNEL, JSON.stringify(event))));
  } catch (err) {
    console.error('Publishing fleet events failed:', err.message);
  }
}

function publishRobotUpdates(robots) {
  return publish(robots.map((robot) => ({ type: 'robot.updated', robot })));
}

// `via` lists the junctions passed during a move, so clients can draw it along the road
function publishRobotMove(robot, via) {
  return publish([{ type: 'robot.updated', robot, via }]);
}

function publishSimulationState(running) {
  return publish([{ type: 'simulation.state', running }]);
}

module.exports = { FLEET_EVENTS_CHANNEL, publishRobotUpdates, publishRobotMove, publishSimulationState };
