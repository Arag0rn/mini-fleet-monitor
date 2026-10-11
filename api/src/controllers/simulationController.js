const simulation = require('../services/simulationService');

function state(req, res) {
  res.json({ running: simulation.isRunning() });
}

async function start(req, res) {
  await simulation.setRunning(true);
  state(req, res);
}

async function stop(req, res) {
  await simulation.setRunning(false);
  state(req, res);
}

module.exports = { state, start, stop };
