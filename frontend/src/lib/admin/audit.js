import crypto from 'node:crypto';
import { redisCommand, redisPipeline } from './store';

const AUDIT_KEY = 'gp:audit:v1';
const AUDIT_LIMIT = 500;

export async function audit(action, details = {}) {
  const entry = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    actor: details.actor || 'unknown',
    action,
    result: details.result || 'unknown',
    resourceId: details.resourceId || null,
    details: sanitize(details.details || {}),
  };
  await redisPipeline([
    ['LPUSH', AUDIT_KEY, JSON.stringify(entry)],
    ['LTRIM', AUDIT_KEY, '0', String(AUDIT_LIMIT - 1)],
  ]);
  console.info('[admin-audit]', entry.id, entry.action, entry.result, entry.resourceId);
  return entry;
}

export async function auditEvents(limit = 50) {
  let raw;
  try {
    raw = await redisCommand(['LRANGE', AUDIT_KEY, '0', String(Math.max(0, Math.min(limit, AUDIT_LIMIT) - 1))]);
  } catch {
    return [
      {
        id: 'audit-unavailable',
        at: new Date().toISOString(),
        actor: 'system',
        action: 'audit.read.failed',
        result: 'failure',
        resourceId: AUDIT_KEY,
        details: { message: 'Audit store is unavailable or not configured.' },
      },
    ];
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      try {
        return JSON.parse(item);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

export async function auditAvailable(action, details = {}) {
  try {
    await audit(action, details);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Audit store is unavailable. Production management action was not performed.' };
  }
}

export function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      if (/secret|token|password|uri|key|authorization|cookie/i.test(key)) return [key, item ? '[redacted]' : item];
      return [key, sanitize(item)];
    })
  );
}
