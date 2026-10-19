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
  'https://event-manager-jdhkrh609-akash-s-project1.vercel.app',
];
const envOrigins = (process.env.CLIENT_URL || process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const allowedOrigins = [...new Set([...envOrigins, ...DEFAULT_ORIGINS])];

function isAllowedVercelPreview(origin) {
  let url;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }

  if (url.protocol !== 'https:' || url.origin !== origin) return false;

  const host = url.hostname.toLowerCase();
  if (!host.endsWith('.vercel.app')) return false;

  const deploymentName = host.slice(0, -'.vercel.app'.length);
  const scope = 'akash-s-project1';
  return (
    new RegExp(`^(?:[a-z0-9]{5,32}-)?event-manager-${scope}$`).test(deploymentName) ||
    new RegExp(`^event-manager-[a-z0-9]{5,32}-${scope}$`).test(deploymentName) ||
    new RegExp(`^event-manager-git-[a-z0-9-]{1,64}-${scope}$`).test(deploymentName)
  );
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow tools that send no Origin header (curl, Postman, health checks)
      if (!origin || allowedOrigins.includes(origin) || isAllowedVercelPreview(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 204,
  })
);

app.use(express.json({ limit: '100kb' }));

// --- Routes ---------------------------------------------------------------
app.get('/api/health', (req, res) => {
  // mongoose.connection.readyState: 0=disconnected 1=connected 2=connecting 3=disconnecting
  const dbState = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({
    status: 'ok',
    service: 'gopratle-api',
    database: dbState[require('mongoose').connection.readyState] || 'unknown',
    environment: process.env.NODE_ENV || 'development',
  });
});
app.use('/api/requirements', requirementRoutes);

// --- Errors ---------------------------------------------------------------
app.use(notFound);
app.use(errorHandler);

module.exports = app;
