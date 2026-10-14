const USER_AGENT = 'gopratle-admin-dashboard';

function isPlaceholder(value) {
  return !value || /^replace-with-|dev-only|change-me/i.test(value);
}

function requiredConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (isPlaceholder(url) || isPlaceholder(token)) {
    throw new Error('Upstash Redis REST credentials are not configured.');
  }
  return { url: url.replace(/\/+$/, ''), token };
}

export async function redisCommand(command) {
  const { url, token } = requiredConfig();
  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
    },
    body: JSON.stringify([command]),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Upstash Redis command failed with HTTP ${res.status}.`);
  const data = await res.json();
  const item = Array.isArray(data) ? data[0] : data;
  if (item?.error) throw new Error('Upstash Redis command returned an error.');
  return item?.result;
}

export async function redisPipeline(commands) {
  const { url, token } = requiredConfig();
  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
    },
    body: JSON.stringify(commands),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Upstash Redis pipeline failed with HTTP ${res.status}.`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('Upstash Redis pipeline returned an invalid response.');
  const failed = data.find((item) => item?.error);
  if (failed) throw new Error('Upstash Redis pipeline returned an error.');
  return data.map((item) => item?.result);
}

export function storeConfigured() {
  try {
    requiredConfig();
    return true;
  } catch {
    return false;
  }
}
