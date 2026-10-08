const JWT_SECRET_PLACEHOLDER = 'change-me-to-a-long-random-string';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

function jwtSecret() {
  const value = required('JWT_SECRET');
  if (value === JWT_SECRET_PLACEHOLDER || value.length < 32) {
    throw new Error('JWT_SECRET must be a random string of at least 32 characters');
  }
  return value;
}

module.exports = {
  port: Number(process.env.PORT) || 4000,
  databaseUrl: required('DATABASE_URL'),
  redisUrl: required('REDIS_URL'),
  jwtSecret: jwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  corsOrigin: required('CORS_ORIGIN'),
};
