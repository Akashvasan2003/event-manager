import { NextResponse } from 'next/server';
import { getAtlasOverview } from '../../../../../lib/admin/atlas';
import { auditEvents } from '../../../../../lib/admin/audit';
import { DEPLOYMENT_TARGETS, envPresence } from '../../../../../lib/admin/config';
import { getGithubOverview } from '../../../../../lib/admin/github';
import { jsonFetch } from '../../../../../lib/admin/http';
import { getRenderOverview } from '../../../../../lib/admin/render';
import { rateLimit } from '../../../../../lib/admin/rateLimit';
import { requireAdmin } from '../../../../../lib/admin/security';

export async function GET(req) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  const limited = await rateLimit(req, 'readonly');
  if (limited) return limited;

  const health = await jsonFetch(`${DEPLOYMENT_TARGETS.backendUrl}/api/health`);
  const [render, atlas, github] = await Promise.all([getRenderOverview(), getAtlasOverview(), getGithubOverview()]);

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    targets: DEPLOYMENT_TARGETS,
    env: envPresence(),
    frontend: {
      status: 'configured',
      url: DEPLOYMENT_TARGETS.frontendUrl,
    },
    backend: {
      url: DEPLOYMENT_TARGETS.backendUrl,
      health: {
        status: health.ok ? 'ok' : 'failed',
        httpStatus: health.status,
        body: health.body,
        responseMs: health.ms,
      },
    },
    render,
    atlas,
    github,
    audit: await auditEvents(),
  });
}
