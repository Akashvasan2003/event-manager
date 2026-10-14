import { NextResponse } from 'next/server';
import { auditAvailable } from '../../../../lib/admin/audit';
import { rateLimit } from '../../../../lib/admin/rateLimit';
import { authenticatePassword, clearSessionCookie, createSession, readSession, requireAdmin, setSessionCookie } from '../../../../lib/admin/security';

export async function GET(req) {
  const session = readSession(req);
  if (!session) return NextResponse.json({ authenticated: false });
  return NextResponse.json({ authenticated: true, role: session.role, actor: session.actor, csrfToken: session.csrf, expiresAt: session.exp });
}

export async function POST(req) {
  const limited = await rateLimit(req, 'login');
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const auth = authenticatePassword(body.password);
  if (!auth.ok) {
    const recorded = await auditAvailable('admin.login.failed', {
      actor: 'anonymous',
      result: 'failure',
      resourceId: 'admin-session',
      details: { reason: auth.reason || 'bad_password' },
    });
    if (!recorded.ok) return NextResponse.json({ error: recorded.error }, { status: 503 });
    return NextResponse.json({ error: auth.reason || 'Invalid administrator password.' }, { status: 401 });
  }

  const session = createSession();
  const res = NextResponse.json({ authenticated: true, role: 'admin', actor: process.env.ADMIN_DASHBOARD_USER || 'admin', csrfToken: session.csrf, expiresAt: session.expiresAt });
  setSessionCookie(res, session.token);
  const recorded = await auditAvailable('admin.login.succeeded', {
    actor: process.env.ADMIN_DASHBOARD_USER || 'admin',
    result: 'success',
    resourceId: 'admin-session',
  });
  if (!recorded.ok) return NextResponse.json({ error: recorded.error }, { status: 503 });
  return res;
}

export async function DELETE(req) {
  const auth = requireAdmin(req, { mutate: true });
  if (!auth.ok) return auth.response;
  const limited = await rateLimit(req, 'mutation');
  if (limited) return limited;

  const res = NextResponse.json({ authenticated: false });
  clearSessionCookie(res);
  const recorded = await auditAvailable('admin.logout', {
    actor: auth.session.actor,
    result: 'success',
    resourceId: 'admin-session',
  });
  if (!recorded.ok) return NextResponse.json({ error: recorded.error }, { status: 503 });
  return res;
}
