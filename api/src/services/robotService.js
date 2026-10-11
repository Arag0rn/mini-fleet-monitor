const pool = require('../db/pool');
const HttpError = require('../utils/httpError');
const { publishRobotUpdates, publishRobotMove } = require('./eventService');
const robotCache = require('./robotCache');
const patrolNetwork = require('./patrolNetwork');

const MIN_STEP_M = 10;
const MAX_STEP_M = 50;

const LOCK_SQL = 'SELECT lat, lon, edge_from, edge_to, edge_offset_m FROM robots WHERE id = $1 FOR UPDATE';

// clock_timestamp(), not now(): inside a transaction now() is the BEGIN time, which would not follow
// the order in which moves got the row lock
const MOVE_SQL = `
  WITH moved AS (
    UPDATE robots
       SET lat = $2, lon = $3, edge_from = $4, edge_to = $5, edge_offset_m = $6,
           status = 'moving',
           updated_at = clock_timestamp()
     WHERE id = $1
    RETURNING id, name, status, lat, lon, updated_at
  ), history AS (
    INSERT INTO robot_positions (robot_id, lat, lon, recorded_at)
    SELECT id, lat, lon, updated_at FROM moved
  )
  SELECT * FROM moved`;

const randomDistance = () => MIN_STEP_M + Math.random() * (MAX_STEP_M - MIN_STEP_M);

async function listRobots() {
  const cached = await robotCache.readRobots();
  if (cached) return { robots: cached, fromCache: true };

  const { rows } = await pool.query(
    'SELECT id, name, status, lat, lon, updated_at FROM robots ORDER BY id',
  );
  await robotCache.writeRobots(rows);
  return { robots: rows, fromCache: false };
}

// Read-modify-write in one transaction: the row lock keeps the timer and a manual move from
// walking the same robot from the same starting point.
async function moveRobot(id) {
  const client = await pool.connect();
  let moved;
  let via;
  let broken = false;
  try {
    await client.query('BEGIN');
    const { rows: [robot] } = await client.query(LOCK_SQL, [id]);
    if (!robot) throw new HttpError(404, 'Robot not found');
    const next = patrolNetwork.advance(robot, randomDistance());
    const { rows } = await client.query(MOVE_SQL, [id, next.lat, next.lon, next.from, next.to, next.offset]);
    await client.query('COMMIT');
    moved = rows[0];
    via = next.via;
  } catch (err) {
    // A failed ROLLBACK means a dead connection: release(true) discards it instead of pooling it
    await client.query('ROLLBACK').catch(() => {
      broken = true;
    });
    throw err;
  } finally {
    client.release(broken);
  }
  await robotCache.invalidateRobots();
  await publishRobotMove(moved, via);
  return moved;
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
