const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const pool = require('../db/pool');
const HttpError = require('../utils/httpError');

const DUMMY_HASH = bcrypt.hashSync('timing-equalizer', 10);

async function login(email, password) {
  const { rows } = await pool.query(
    'SELECT id, email, password_hash FROM users WHERE email = lower($1)',
    [email.trim()],
  );
  const user = rows[0];
  const valid = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !valid) throw new HttpError(401, 'Invalid credentials');

  const token = jwt.sign({ sub: String(user.id), email: user.email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
  return { token, user: { id: user.id, email: user.email } };
}

module.exports = { login };
