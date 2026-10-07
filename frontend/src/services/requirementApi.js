// Thin service layer around the backend REST API.
// All fetch() calls live here — UI components never call fetch directly.
// Base URL comes from NEXT_PUBLIC_API_URL (set in .env.local).
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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
    const error = new Error(data?.message || `Request failed with status ${res.status}`);
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
