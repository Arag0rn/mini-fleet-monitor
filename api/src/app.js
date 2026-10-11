const express = require('express');
const cors = require('cors');
const config = require('./config');
const pool = require('./db/pool');
const { redis } = require('./db/redis');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const robotRoutes = require('./routes/robots');
const simulationRoutes = require('./routes/simulation');

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    await Promise.all([pool.query('SELECT 1'), redis.ping()]);
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
});

app.use('/auth', authRoutes);
app.use('/robots', robotRoutes);
app.use('/simulation', simulationRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
