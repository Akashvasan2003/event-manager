// Thin service layer around the backend REST API.
// All fetch() calls live here — UI components never call fetch directly.
// Base URL comes from NEXT_PUBLIC_API_URL (set in .env.local for dev, and in
// Vercel project env vars for production).
const BASE_URL = sanitizeBaseUrl(process.env.NEXT_PUBLIC_API_URL);

function sanitizeBaseUrl(raw) {
  let url = (raw ?? '').trim().replace(/^\uFEFF/, ''); // strip BOM (env files sometimes carry one)
  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      // Loud, greppable warning: a production build must never fall back to localhost.
      console.warn('[requirementApi] NEXT_PUBLIC_API_URL is not set — falling back to http://localhost:5000');
    }
    url = 'http://localhost:5000';
  }
  return url.replace(/\/+$/, ''); // no trailing slash, so /api/... never doubles up
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
    res = await fetch(`${BASE_URL}${path}`, {
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
          : `Request failed with status ${res.status}`);
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
  const qs = category ? `?category=${encodeURIComponent(category)}` : '';
  return request(`/api/requirements${qs}`);
}
export function getRequirement(id) {
  return request(`/api/requirements/${id}`);
}
export function getHealth() {
  return request('/api/health');
}
