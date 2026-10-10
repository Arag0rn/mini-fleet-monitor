const robotService = require('./robotService');

const TICK_MS = 2000;
const MOVE_PROBABILITY = 0.5;

let timer = null;
let tickInProgress = false;

async function tick() {
  if (tickInProgress) return;
  tickInProgress = true;
  try {
    const ids = await robotService.listRobotIds();
    const movingIds = ids.filter(() => Math.random() < MOVE_PROBABILITY);
    const results = await Promise.allSettled(movingIds.map((id) => robotService.moveRobot(id)));
    const moved = [];
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') moved.push(result.value);
      else console.error(`Simulation move of robot ${movingIds[i]} failed:`, result.reason?.message ?? result.reason);
    });
    const idled = await robotService.markIdleExcept(movingIds);
    return { moved, idled };
  } catch (err) {
    console.error('Simulation tick failed:', err.code ? `${err.code} ${err.message}` : err);
  } finally {
    tickInProgress = false;
  }
}

function start() {
  if (timer) return;
  timer = setInterval(tick, TICK_MS);
}

function stop() {
  clearInterval(timer);
  timer = null;
}

module.exports = { start, stop };
