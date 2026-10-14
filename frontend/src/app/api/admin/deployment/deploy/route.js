import { NextResponse } from 'next/server';
import { auditAvailable } from '../../../../../lib/admin/audit';
import { triggerRenderDeploy } from '../../../../../lib/admin/render';
import { rateLimit } from '../../../../../lib/admin/rateLimit';
import { requireAdmin } from '../../../../../lib/admin/security';

export async function POST(req) {
  const auth = requireAdmin(req, { mutate: true });
  if (!auth.ok) return auth.response;
  const limited = await rateLimit(req, 'deploy');
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  if (body.confirm !== 'TRIGGER_RENDER_DEPLOY') {
    const recorded = await auditAvailable('render.deploy.rejected', {
      actor: auth.session.actor,
      result: 'failure',
      resourceId: 'gopratle-api',
      details: { reason: 'missing_confirmation' },
    });
    if (!recorded.ok) return NextResponse.json({ error: recorded.error }, { status: 503 });
    return NextResponse.json({ error: 'Explicit confirmation TRIGGER_RENDER_DEPLOY is required.' }, { status: 400 });
  }

  const requested = await auditAvailable('render.deploy.requested', {
    actor: auth.session.actor,
    result: 'requested',
    resourceId: 'gopratle-api',
  });
  if (!requested.ok) return NextResponse.json({ error: requested.error }, { status: 503 });
  const result = await triggerRenderDeploy();
  const recorded = await auditAvailable('render.deploy.triggered', {
    actor: auth.session.actor,
    result: result.ok ? 'success' : 'failure',
    resourceId: 'gopratle-api',
    details: { status: result.status, message: result.message },
  });
  if (!recorded.ok) return NextResponse.json({ error: recorded.error, result }, { status: 503 });
  return NextResponse.json({ result }, { status: result.ok ? 200 : 502 });
}
