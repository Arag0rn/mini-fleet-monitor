const { JsonWebTokenError, TokenExpiredError } = require('jsonwebtoken');
const HttpError = require('../utils/httpError');

const PG_ERRORS = {
  '23514': [400, 'Invalid data'],
  '22P02': [400, 'Invalid input'],
};

const BODY_PARSER_ERRORS = {
  'entity.parse.failed': [400, 'Invalid JSON'],
  'entity.too.large': [413, 'Payload too large'],
};

function toResponse(err) {
  if (err instanceof HttpError && err.status < 500) return [err.status, err.message];
  if (BODY_PARSER_ERRORS[err.type]) return BODY_PARSER_ERRORS[err.type];
  if (PG_ERRORS[err.code]) return PG_ERRORS[err.code];
  if (err instanceof TokenExpiredError) return [401, 'Token expired'];
  if (err instanceof JsonWebTokenError) return [401, 'Invalid token'];
  if (err.expose && err.status < 500) return [err.status, err.message];
  return [500, 'Internal server error'];
}

function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const [status, message] = toResponse(err);
  if (status >= 500) console.error(err);
  res.status(status).json({ error: message });
}

module.exports = { notFound, errorHandler };
