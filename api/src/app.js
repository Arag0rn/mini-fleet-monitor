const express = require('express');
const cors = require('cors');
const config = require('./config');
const pool = require('./db/pool');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
});

app.use('/auth', authRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
