const { verifyToken } = require('../services/authService');
const HttpError = require('../utils/httpError');

function requireAuth(req, res, next) {
  const [, token] = /^Bearer +(\S+)$/i.exec(req.get('Authorization') ?? '') ?? [];
  if (!token) throw new HttpError(401, 'Missing token');
  req.user = verifyToken(token);
  next();
}

module.exports = requireAuth;
