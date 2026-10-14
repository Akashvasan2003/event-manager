import { NextResponse } from 'next/server';
import { auditAvailable } from '../../../../../lib/admin/audit';
import { runProductionTests } from '../../../../../lib/admin/prodTests';
import { rateLimit } from '../../../../../lib/admin/rateLimit';
import { requireAdmin } from '../../../../../lib/admin/security';

export async function POST(req) {
  const auth = requireAdmin(req, { mutate: true });
  if (!auth.ok) return auth.response;
  const limited = await rateLimit(req, 'tests');
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  if (body.confirm !== 'CREATE_PRODUCTION_TEST_RECORDS') {
    const recorded = await auditAvailable('production.tests.rejected', {
      actor: auth.session.actor,
      result: 'failure',
      resourceId: 'production-api',
      details: { reason: 'missing_confirmation' },
    });
    if (!recorded.ok) return NextResponse.json({ error: recorded.error }, { status: 503 });
    return NextResponse.json({ error: 'Explicit confirmation CREATE_PRODUCTION_TEST_RECORDS is required because tests create production records.' }, { status: 400 });
  }

  const requested = await auditAvailable('production.tests.requested', {
    actor: auth.session.actor,
    result: 'requested',
    resourceId: 'production-api',
  });
  if (!requested.ok) return NextResponse.json({ error: requested.error }, { status: 503 });
  const report = await runProductionTests();
  const recorded = await auditAvailable('production.tests.ran', {
    actor: auth.session.actor,
    result: report.results.some((item) => item.status === 'FAIL') ? 'failure' : 'success',
    resourceId: 'production-api',
    details: { createdIds: report.createdIds, failures: report.results.filter((item) => item.status === 'FAIL').length },
  });
  if (!recorded.ok) return NextResponse.json({ error: recorded.error, report }, { status: 503 });
  return NextResponse.json({ report });
}
