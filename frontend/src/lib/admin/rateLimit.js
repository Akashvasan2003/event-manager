import { NextResponse } from 'next/server';
import { redisPipeline } from './store';

export const LIMITS = {
  login: { limit: 8, windowSec: 60, failClosed: true },
  readonly: { limit: 60, windowSec: 60, failClosed: false },
  mutation: { limit: 10, windowSec: 60, failClosed: true },
  deploy: { limit: 3, windowSec: 300, failClosed: true },
  tests: { limit: 3, windowSec: 300, failClosed: true },
  assistant: { limit: 20, windowSec: 60, failClosed: true },
};

function clientId(req) {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || req.headers.get('x-real-ip') || 'unknown';
}

export async function rateLimit(req, name, override = {}) {
  const policy = { ...(LIMITS[name] || LIMITS.mutation), ...override };
  const nowWindow = Math.floor(Date.now() / (policy.windowSec * 1000));
  const key = `gp:rl:${name}:${clientId(req)}:${nowWindow}`;

  try {
    const [count] = await redisPipeline([
      ['INCR', key],
      ['EXPIRE', key, String(policy.windowSec + 5)],
    ]);
    if (Number(count) > policy.limit) {
      return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 });
    }
    return null;
  } catch {
    if (policy.failClosed) {
      return NextResponse.json({ error: 'Rate limit service is unavailable. Try again later.' }, { status: 503 });
    }
    return null;
  }
}
