const JWT_SECRET_PLACEHOLDER = 'change-me-to-a-long-random-string';
// Fallback in docker-compose.yml so a clean checkout starts; it is public, so anyone can sign tokens with it.
// Keep in sync with docker-compose.yml.
const JWT_SECRET_DEMO = 'local-demo-only-secret-change-me-for-any-real-use-0001';

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
  if (value === JWT_SECRET_DEMO) console.warn('JWT_SECRET is the public demo value; set your own for anything beyond a local demo');
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
