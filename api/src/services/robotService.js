const pool = require('../db/pool');

async function listRobots() {
  const { rows } = await pool.query(
    'SELECT id, name, status, lat, lon, updated_at FROM robots ORDER BY id',
  );
  return rows;
}

module.exports = { listRobots };
