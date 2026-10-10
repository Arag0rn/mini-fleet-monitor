const robotService = require('../services/robotService');

async function list(req, res) {
  res.json(await robotService.listRobots());
}

module.exports = { list };
