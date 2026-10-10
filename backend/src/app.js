const express = require('express');
const cors = require('cors');
const requirementRoutes = require('./routes/requirementRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// --- CORS ---------------------------------------------------------------
// Allowed origins: CLIENT_URL (comma-separated) plus safe defaults.
//   local dev  : http://localhost:3000
//   production : the deployed Vercel frontend
// Set CLIENT_URL in the backend host's env vars (Render/Railway) to include
// the production origin; the defaults below keep local dev and the deployed
// frontend working without a config change.
const DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'https://event-manager-three-kohl.vercel.app',
];
const envOrigins = (process.env.CLIENT_URL || process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const allowedOrigins = [...new Set([...envOrigins, ...DEFAULT_ORIGINS])];

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
