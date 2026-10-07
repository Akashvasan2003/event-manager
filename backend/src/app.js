const express = require('express');
const cors = require('cors');

const requirementRoutes = require('./routes/requirementRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// --- CORS ---------------------------------------------------------------
// Local dev uses CLIENT_URL (or CLIENT_ORIGIN), default http://localhost:3000.
// In production set CLIENT_URL to the deployed frontend URL.
const allowedOrigins = (
  process.env.CLIENT_URL || process.env.CLIENT_ORIGIN || 'http://localhost:3000'
)
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow tools that send no Origin header (curl, Postman, health checks)
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
  })
);

app.use(express.json({ limit: '100kb' }));

// --- Routes ---------------------------------------------------------------
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/requirements', requirementRoutes);

// --- Errors ---------------------------------------------------------------
app.use(notFound);
app.use(errorHandler);

module.exports = app;
