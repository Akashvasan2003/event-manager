import { NextResponse } from 'next/server';
import { auditAvailable } from '../../../../../lib/admin/audit';
import { DEPLOYMENT_TARGETS, envPresence } from '../../../../../lib/admin/config';
import { getAtlasOverview } from '../../../../../lib/admin/atlas';
import { getGithubOverview } from '../../../../../lib/admin/github';
import { getRenderOverview } from '../../../../../lib/admin/render';
import { rateLimit } from '../../../../../lib/admin/rateLimit';
import { requireAdmin } from '../../../../../lib/admin/security';

export async function POST(req) {
  const auth = requireAdmin(req, { mutate: true });
  if (!auth.ok) return auth.response;
  const limited = await rateLimit(req, 'mutation');
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const [render, atlas, github] = await Promise.all([getRenderOverview(), getAtlasOverview(), getGithubOverview()]);
  const env = envPresence();
  const changes = [];
  const blockers = [];

  if (!env.RENDER_API_KEY) blockers.push('Configure RENDER_API_KEY in Vercel before Render can be managed.');
  if (!env.RENDER_SERVICE_ID && render.status !== 'ok') blockers.push('Configure RENDER_SERVICE_ID to avoid creating or targeting the wrong service.');
  if (!env.ATLAS_CLIENT_ID || !env.ATLAS_CLIENT_SECRET) blockers.push('Configure Atlas service account credentials before Atlas can be inspected.');
  if (github.status !== 'ok') changes.push(`Review GitHub branch ${DEPLOYMENT_TARGETS.githubBranch}; latest commit is ${github.latestCommit || 'unknown'}.`);
  if (render.env && !render.env.MONGODB_URI) changes.push('Add MONGODB_URI to Render service environment variables.');
  if (render.env && !render.env.CLIENT_URL) changes.push(`Add CLIENT_URL=${DEPLOYMENT_TARGETS.frontendUrl} to Render service environment variables.`);
  if (render.env?.PORT) changes.push('Remove manually configured PORT from Render; Render injects PORT automatically.');
  if (atlas.status !== 'ok') changes.push('Inspect Atlas cluster status before deploying.');

  const plan = {
    dryRun: body.dryRun !== false,
    generatedAt: new Date().toISOString(),
    summary: blockers.length ? 'Blocked until required credentials are configured.' : 'Ready for administrator review.',
    blockers,
    changes: changes.length ? changes : ['No production configuration changes are recommended before deploy.'],
    approvalRequiredFor: ['Render deployment trigger', 'Render environment variable updates', 'Atlas access changes', 'Atlas cluster creation'],
    nextSafeAction: blockers.length ? 'Configure missing Vercel environment variables.' : 'Approve a Render deployment trigger, then monitor health and run production tests.',
  };

  const recorded = await auditAvailable('deployment.plan.generated', {
    actor: auth.session.actor,
    result: blockers.length ? 'blocked' : 'success',
    resourceId: 'deployment-plan',
    details: { dryRun: plan.dryRun, blockers: blockers.length, changes: changes.length },
  });
  if (!recorded.ok) return NextResponse.json({ error: recorded.error }, { status: 503 });
  return NextResponse.json({ plan, render, atlas, github });
}
