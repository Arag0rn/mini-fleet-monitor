const robotService = require('./robotService');
const { publishSimulationState } = require('./eventService');

const TICK_MS = 2000;
const MOVE_PROBABILITY = 0.5;

let timer = null;
let currentTick = null;
let transition = Promise.resolve();

async function tick() {
  try {
    const ids = await robotService.listRobotIds();
    const movingIds = ids.filter(() => Math.random() < MOVE_PROBABILITY);
    const results = await Promise.allSettled(movingIds.map((id) => robotService.moveRobot(id)));
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.error(`Simulation move of robot ${movingIds[i]} failed:`, result.reason?.message ?? result.reason);
      }
    });
    await robotService.markIdleExcept(movingIds);
  } catch (err) {
    console.error('Simulation tick failed:', err.code ? `${err.code} ${err.message}` : err);
  }
}

function runTick() {
  if (currentTick) return;
  currentTick = tick().finally(() => {
    currentTick = null;
  });
}

function start() {
  if (timer) return;
  timer = setInterval(runTick, TICK_MS);
}

function stop() {
  clearInterval(timer);
  timer = null;
  return currentTick ?? Promise.resolve();
}

function isRunning() {
  return timer !== null;
}

// Start/stop requests run one after another, so concurrent clicks cannot interleave.
function setRunning(running) {
  const next = transition.then(async () => {
    if (running) start();
    else await stop();
    await publishSimulationState(running);
    if (!running) await robotService.markIdleExcept([]);
  });
  transition = next.catch(() => {});
  return next;
}

function settle() {
  return transition;
}

module.exports = { start, stop, isRunning, setRunning, settle };
