const authService = require('../services/authService');
const HttpError = require('../utils/httpError');

async function login(req, res) {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
    throw new HttpError(400, 'Email and password are required');
  }
  res.json(await authService.login(email, password));
}

module.exports = { login };
