import { DEPLOYMENT_TARGETS } from './config';
import { jsonFetch } from './http';

const API = 'https://api.render.com/v1';
const ACTIVE_DEPLOY_STATUSES = new Set([
  'created',
  'queued',
  'build_in_progress',
  'update_in_progress',
  'pre_deploy_in_progress',
  'deploying',
]);

function headers() {
  return {
    Authorization: `Bearer ${process.env.RENDER_API_KEY}`,
    Accept: 'application/json',
  };
}

export async function getRenderOverview() {
  if (!process.env.RENDER_API_KEY) {
    return { configured: false, status: 'missing_credentials', message: 'RENDER_API_KEY is not configured.' };
  }

  let serviceId = process.env.RENDER_SERVICE_ID;
  let service = null;
  const warnings = [];

  if (!serviceId) {
    const listed = await jsonFetch(`${API}/services?limit=100`, { headers: headers() });
    if (!listed.ok) return { configured: true, status: 'error', error: 'Unable to list Render services.', detail: listed };
    const services = Array.isArray(listed.body) ? listed.body : listed.body?.services || [];
    const match = services.find((item) => (item.service?.name || item.name) === DEPLOYMENT_TARGETS.renderServiceName);
    service = match?.service || match || null;
    serviceId = service?.id;
    if (!serviceId) return { configured: true, status: 'not_found', message: `Service ${DEPLOYMENT_TARGETS.renderServiceName} was not found.` };
  }

  const [serviceRes, deploysRes, envRes] = await Promise.all([
    jsonFetch(`${API}/services/${serviceId}`, { headers: headers() }),
    jsonFetch(`${API}/services/${serviceId}/deploys?limit=5`, { headers: headers() }),
    jsonFetch(`${API}/services/${serviceId}/env-vars`, { headers: headers() }),
  ]);

  if (serviceRes.ok) service = serviceRes.body?.service || serviceRes.body;
  else warnings.push('Could not read service details.');

  const deploys = deploysRes.ok ? deploysRes.body || [] : [];
  const envVars = envRes.ok ? envRes.body || [] : [];
  const envKeys = new Set(envVars.map((item) => item.envVar?.key || item.key).filter(Boolean));
  const latestDeploy = Array.isArray(deploys) ? deploys[0]?.deploy || deploys[0] : deploys?.deploys?.[0]?.deploy || deploys?.deploys?.[0];

  return {
    configured: true,
    status: service ? 'ok' : 'partial',
    serviceId,
    name: service?.name || DEPLOYMENT_TARGETS.renderServiceName,
    repo: service?.repo || service?.repoDetails?.repo || null,
    branch: service?.branch || service?.repoDetails?.branch || null,
    rootDir: service?.rootDir || service?.serviceDetails?.rootDir || null,
    buildCommand: service?.buildCommand || service?.serviceDetails?.buildCommand || null,
    startCommand: service?.startCommand || service?.serviceDetails?.startCommand || null,
    healthCheckPath: service?.healthCheckPath || service?.serviceDetails?.healthCheckPath || null,
    latestDeploy: latestDeploy
      ? {
          id: latestDeploy.id,
          status: latestDeploy.status,
          commit: latestDeploy.commit?.id || latestDeploy.commitId || null,
          createdAt: latestDeploy.createdAt,
          finishedAt: latestDeploy.finishedAt,
        }
      : null,
    env: {
      MONGODB_URI: envKeys.has('MONGODB_URI'),
      CLIENT_URL: envKeys.has('CLIENT_URL'),
      PORT: envKeys.has('PORT'),
    },
    logs: deploysRes.ok ? [] : ['Render deploy metadata is available, but logs could not be read from the public API response.'],
    warnings,
  };
}

export async function triggerRenderDeploy() {
  const serviceId = process.env.RENDER_SERVICE_ID;
  if (!process.env.RENDER_API_KEY || !serviceId) {
    return { ok: false, status: 'missing_credentials', message: 'RENDER_API_KEY and RENDER_SERVICE_ID are required.' };
  }

  const overview = await getRenderOverview();
  if (overview.serviceId !== serviceId || overview.name !== DEPLOYMENT_TARGETS.renderServiceName) {
    return { ok: false, status: 'service_mismatch', message: 'Render service identity did not match the configured GoPratle backend.' };
  }
  if (ACTIVE_DEPLOY_STATUSES.has(overview.latestDeploy?.status)) {
    return { ok: false, status: 'deploy_in_progress', message: `Render deploy ${overview.latestDeploy.id} is already ${overview.latestDeploy.status}.` };
  }

  const res = await jsonFetch(`${API}/services/${serviceId}/deploys`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ clearCache: 'do_not_clear' }),
  });
  return { ok: res.ok, status: res.status, body: res.body };
}
