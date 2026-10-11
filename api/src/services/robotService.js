const pool = require('../db/pool');
const HttpError = require('../utils/httpError');
const { publishRobotUpdates } = require('./eventService');
const robotCache = require('./robotCache');

const MIN_STEP_M = 10;
const MAX_STEP_M = 50;

const MOVE_SQL = `
  WITH moved AS (
    UPDATE robots
       SET lat = lat + $2 / 111320.0,
           lon = lon + $3 / (111320.0 * cos(radians(lat))),
           status = 'moving',
           updated_at = now()
     WHERE id = $1
    RETURNING id, name, status, lat, lon, updated_at
  ), history AS (
    INSERT INTO robot_positions (robot_id, lat, lon)
    SELECT id, lat, lon FROM moved
  )
  SELECT * FROM moved`;

function randomStep() {
  const distance = MIN_STEP_M + Math.random() * (MAX_STEP_M - MIN_STEP_M);
  const angle = Math.random() * 2 * Math.PI;
  return { north: distance * Math.cos(angle), east: distance * Math.sin(angle) };
}

async function listRobots() {
  const cached = await robotCache.readRobots();
  if (cached) return { robots: cached, fromCache: true };

  const { rows } = await pool.query(
    'SELECT id, name, status, lat, lon, updated_at FROM robots ORDER BY id',
  );
  await robotCache.writeRobots(rows);
  return { robots: rows, fromCache: false };
}

async function moveRobot(id) {
  const { north, east } = randomStep();
  const { rows } = await pool.query(MOVE_SQL, [id, north, east]);
  if (!rows[0]) throw new HttpError(404, 'Robot not found');
  await robotCache.invalidateRobots();
  await publishRobotUpdates(rows);
  return rows[0];
}

async function listRobotIds() {
  const { rows } = await pool.query('SELECT id FROM robots ORDER BY id');
  return rows.map((row) => row.id);
}

async function markIdleExcept(movedIds) {
  const { rows } = await pool.query(
    `UPDATE robots SET status = 'idle', updated_at = now()
      WHERE status = 'moving' AND NOT (id = ANY($1::int[]))
      RETURNING id, name, status, lat, lon, updated_at`,
    [movedIds],
  );
  if (rows.length > 0) await robotCache.invalidateRobots();
  await publishRobotUpdates(rows);
  return rows;
}

module.exports = { listRobots, moveRobot, listRobotIds, markIdleExcept };
