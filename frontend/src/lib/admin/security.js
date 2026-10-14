import crypto from 'node:crypto';
import { NextResponse } from 'next/server';

const SESSION_COOKIE = 'gp_admin_session';
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 8;

function secret() {
  return process.env.ADMIN_SESSION_SECRET || null;
}

function isPlaceholder(value) {
  return !value || /^replace-with-|dev-only|change-me/i.test(value);
}

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(payload) {
  const sessionSecret = secret();
  if (!sessionSecret) throw new Error('ADMIN_SESSION_SECRET is not configured.');
  return crypto.createHmac('sha256', sessionSecret).update(payload).digest('base64url');
}

function constantEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function createSession() {
  if (isPlaceholder(process.env.ADMIN_SESSION_SECRET)) {
    throw new Error('ADMIN_SESSION_SECRET must be configured with a strong random value.');
  }
  const payload = {
    role: 'admin',
    actor: process.env.ADMIN_DASHBOARD_USER || 'admin',
    csrf: crypto.randomBytes(24).toString('base64url'),
    exp: Date.now() + DEFAULT_TTL_MS,
  };
  const body = b64url(JSON.stringify(payload));
  return { token: `${body}.${sign(body)}`, csrf: payload.csrf, expiresAt: payload.exp };
}

export function readSession(req) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token || !token.includes('.')) return null;
  const [body, mac] = token.split('.');
  let expectedMac;
  try {
    expectedMac = sign(body);
  } catch {
    return null;
  }
  if (!constantEqual(expectedMac, mac)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp < Date.now() || payload.role !== 'admin') return null;
    return payload;
  } catch {
    return null;
  }
}

export function setSessionCookie(res, token) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
}

export function clearSessionCookie(res) {
  res.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
}

export function authenticatePassword(password) {
  const expected = process.env.ADMIN_DASHBOARD_PASSWORD;
  if (isPlaceholder(expected)) return { ok: false, reason: 'ADMIN_DASHBOARD_PASSWORD is not configured with a production value.' };
  if (isPlaceholder(process.env.ADMIN_SESSION_SECRET)) {
    return { ok: false, reason: 'ADMIN_SESSION_SECRET is not configured with a production value.' };
  }
  return { ok: constantEqual(password || '', expected) };
}

export function requireAdmin(req, { mutate = false } = {}) {
  const session = readSession(req);
  if (!session) return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (mutate && req.headers.get('x-csrf-token') !== session.csrf) {
    return { ok: false, response: NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 }) };
  }
  return { ok: true, session };
}
