// One-shot patcher for D:\GoPratle-Assignment (run from this workspace).
// Applies the backend-connectivity / deployment-configuration fixes with
// exact UTF-8 (no BOM) writes.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'D:\\GoPratle-Assignment';
const files = {
  'frontend/src/services/requirementApi.js': `// Thin service layer around the backend REST API.
// All fetch() calls live here — UI components never call fetch directly.
// Base URL comes from NEXT_PUBLIC_API_URL (set in .env.local for dev, and in
// Vercel project env vars for production).
const BASE_URL = sanitizeBaseUrl(process.env.NEXT_PUBLIC_API_URL);

function sanitizeBaseUrl(raw) {
  let url = (raw ?? '').trim().replace(/^\\uFEFF/, ''); // strip BOM (env files sometimes carry one)
  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      // Loud, greppable warning: a production build must never fall back to localhost.
      console.warn('[requirementApi] NEXT_PUBLIC_API_URL is not set — falling back to http://localhost:5000');
    }
    url = 'http://localhost:5000';
  }
  return url.replace(/\\/+$/, ''); // no trailing slash, so /api/... never doubles up
}

/**
 * Classifies failures so the UI can react appropriately:
 *  - kind: 'network'    -> backend unreachable / offline / CORS preflight refused
 *  - kind: 'validation' -> HTTP 400, backend sent field-level messages
 *  - kind: 'notfound'   -> HTTP 404
 *  - kind: 'server'     -> HTTP 5xx
 *  - kind: 'http'       -> any other non-OK status
 * Backend validation messages (err.response.data.errors) are always preserved.
 */
function classify(status) {
  if (status === 400) return 'validation';
  if (status === 404) return 'notfound';
  if (status >= 500) return 'server';
  return 'http';
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(\`\${BASE_URL}\${path}\`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    // fetch only throws on network failure (backend down, DNS, CORS preflight)
    const error = new Error('Cannot reach the server. Please check your connection and try again.');
    error.kind = 'network';
    error.network = true;
    throw error;
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON response body — leave data as null
  }
  if (!res.ok) {
    const message =
      data?.message ||
      (res.status === 404
        ? 'The requested item was not found.'
        : res.status >= 500
          ? 'The server had a problem. Please try again in a moment.'
          : \`Request failed with status \${res.status}\`);
    const error = new Error(message);
    error.kind = classify(res.status);
    error.response = { status: res.status, data };
    throw error;
  }
  return data;
}

export function createRequirement(payload) {
  return request('/api/requirements', { method: 'POST', body: JSON.stringify(payload) });
}
export function getRequirements(category) {
  const qs = category ? \`?category=\${encodeURIComponent(category)}\` : '';
  return request(\`/api/requirements\${qs}\`);
}
export function getRequirement(id) {
  return request(\`/api/requirements/\${id}\`);
}
export function getHealth() {
  return request('/api/health');
}
`,
  'backend/src/app.js': `const express = require('express');
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
      return callback(new Error(\`CORS blocked for origin: \${origin}\`));
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
`,
  'backend/.env.example': `# MongoDB connection string (local or Atlas). Never commit the real .env
# Production: paste your MongoDB Atlas SRV string here / in the host's env vars
MONGODB_URI=mongodb://127.0.0.1:27017/gopratle
# Port for the Express API (Render/Railway inject their own PORT — the app
# uses process.env.PORT automatically, so do NOT hardcode a port in prod)
PORT=5000
# Frontend origins allowed by CORS (CLIENT_URL). Comma-separated.
# Production: https://event-manager-three-kohl.vercel.app
CLIENT_URL=http://localhost:3000
`,
  'backend/render.yaml': `# Render blueprint — creates the backend web service from this repo.
# Deploy with:  Render dashboard -> New -> Blueprint -> point at this repo,
# or "render blueprint launch". Set MONGODB_URI in the Render dashboard
# (render.yaml cannot hold secrets). Render injects PORT automatically.
services:
  - type: web
    name: gopratle-api
    runtime: node
    plan: free
    rootDir: backend
    buildCommand: npm install
    startCommand: npm start
    healthCheckPath: /api/health
    envVars:
      - key: CLIENT_URL
        value: https://event-manager-three-kohl.vercel.app
      - key: MONGODB_URI
        sync: false
`,
};

files['frontend/.vercelignore'] = `# Never upload local env files to Vercel — production values come from the
# Vercel project settings (dashboard env vars), not from this machine.
.env
.env.local
.env.*.local
`;

for (const [rel, content] of Object.entries(files)) {
  const abs = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf8'); // utf8, no BOM
  console.log('wrote', rel, fs.statSync(abs).size, 'bytes');
}
