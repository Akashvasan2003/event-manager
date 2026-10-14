import { NextResponse } from 'next/server';
import { auditAvailable } from '../../../../../lib/admin/audit';
import { getAtlasOverview } from '../../../../../lib/admin/atlas';
import { getGithubOverview } from '../../../../../lib/admin/github';
import { getRenderOverview } from '../../../../../lib/admin/render';
import { rateLimit } from '../../../../../lib/admin/rateLimit';
import { requireAdmin } from '../../../../../lib/admin/security';

export async function POST(req) {
  const auth = requireAdmin(req, { mutate: true });
  if (!auth.ok) return auth.response;
  const limited = await rateLimit(req, 'assistant');
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const [render, atlas, github] = await Promise.all([getRenderOverview(), getAtlasOverview(), getGithubOverview()]);
  const notes = [];

  if (render.status === 'missing_credentials') notes.push('Render API access is not configured in Vercel, so the dashboard cannot inspect or deploy the backend yet.');
  if (render.env && !render.env.MONGODB_URI) notes.push('Render is missing MONGODB_URI; the backend will fail to start or report a disconnected database.');
  if (render.env && !render.env.CLIENT_URL) notes.push('Render is missing CLIENT_URL; browser CORS checks may fail for the Vercel frontend.');
  if (render.env?.PORT) notes.push('PORT is manually configured on Render. Remove it because Render provides PORT at runtime.');
  if (atlas.status !== 'ok') notes.push(`Atlas is not fully healthy from the dashboard viewpoint: ${atlas.message || atlas.cluster?.error || atlas.status}.`);
  if (github.status !== 'ok') notes.push(github.message || 'GitHub commit status needs review.');
  if (!notes.length) notes.push('No obvious infrastructure issue was detected from the sanitized status snapshot.');

  const answer = {
    prompt: String(body.message || '').slice(0, 1000),
    generatedAt: new Date().toISOString(),
    diagnosis: notes,
    safePlan: [
      'Inspect Render, Atlas, GitHub, and backend health status.',
      'Fix missing secrets in Vercel or Render outside the browser response body.',
      'Generate a dry-run plan and review every production-impacting change.',
      'Trigger Render deploy only after explicit administrator confirmation.',
      'Run production tests and keep the created record IDs for audit.',
    ],
    restrictions: [
      'Secrets are never returned to the browser.',
      'The assistant cannot run arbitrary shell commands.',
      'Production changes require dedicated confirmation strings.',
    ],
  };

  const recorded = await auditAvailable('assistant.diagnosed', {
    actor: auth.session.actor,
    result: 'success',
    resourceId: 'deployment-assistant',
    details: { promptLength: answer.prompt.length, notes: notes.length },
  });
  if (!recorded.ok) return NextResponse.json({ error: recorded.error }, { status: 503 });
  return NextResponse.json({ answer, context: { render, atlas, github } });
}
