export async function jsonFetch(url, options = {}) {
  const startedAt = Date.now();
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
    });
    const text = await res.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { raw: text.slice(0, 2000) };
    }
    return { ok: res.ok, status: res.status, headers: Object.fromEntries(res.headers), body, ms: Date.now() - startedAt };
  } catch (error) {
    return { ok: false, status: 0, error: error.message, ms: Date.now() - startedAt };
  }
}

export function maskValue(value) {
  if (!value) return '';
  const str = String(value);
  if (str.length <= 8) return 'configured';
  return `${str.slice(0, 4)}...${str.slice(-4)}`;
}
