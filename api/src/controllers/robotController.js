const robotService = require('../services/robotService');
const HttpError = require('../utils/httpError');

const MAX_PG_INTEGER = 2147483647;

function parseRobotId(raw) {
  const id = Number(raw);
  if (!/^[1-9]\d*$/.test(raw) || id > MAX_PG_INTEGER) throw new HttpError(400, 'Invalid robot id');
  return id;
}

async function list(req, res) {
  const { robots, fromCache } = await robotService.listRobots();
  res.set('X-Cache', fromCache ? 'HIT' : 'MISS').json(robots);
}

async function move(req, res) {
  res.json(await robotService.moveRobot(parseRobotId(req.params.id)));
}

module.exports = { list, move };
