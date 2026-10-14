import { DEPLOYMENT_TARGETS } from './config';
import { jsonFetch } from './http';

const idPattern = /^[a-f0-9]{24}$/i;

function labeledBasics(category) {
  return {
    eventName: `AI deployment dashboard smoke test - ${category} - ${new Date().toISOString()}`,
    eventType: 'Production QA',
    dateMode: 'single',
    startDate: '2026-12-15',
    location: 'Mumbai',
    venue: 'GoPratle QA',
    category,
  };
}

const payloads = {
  planner: {
    eventBasics: labeledBasics('planner'),
    categoryDetails: {
      planningScope: 'full',
      guestCount: 120,
      budgetMin: 100000,
      budgetMax: 250000,
      servicesRequired: ['vendor-coordination', 'decor'],
      planningTimeline: '1-3-months',
      coordinatorsNeeded: 2,
      vendorCoordination: true,
      onSiteCoordination: true,
    },
    additionalNotes: 'Created by /admin/deployment production test. Do not delete automatically.',
  },
  performer: {
    eventBasics: labeledBasics('performer'),
    categoryDetails: {
      performanceType: 'dj',
      genre: 'Bollywood',
      performerCount: 1,
      durationMins: 90,
      budgetMin: 30000,
      budgetMax: 70000,
      soundSystemRequired: true,
      lightingRequired: true,
      stageRequired: false,
    },
    additionalNotes: 'Created by /admin/deployment production test. Do not delete automatically.',
  },
  crew: {
    eventBasics: labeledBasics('crew'),
    categoryDetails: {
      crewRole: ['stage-setup', 'security'],
      crewCount: 4,
      experienceLevel: 'mid',
      workingHours: 8,
      hourlyRate: 800,
      equipmentRequired: ['pa-system'],
      setupRequired: true,
      breakdownRequired: true,
      travelRequired: false,
    },
    additionalNotes: 'Created by /admin/deployment production test. Do not delete automatically.',
  },
};

async function api(path, options = {}) {
  return jsonFetch(`${DEPLOYMENT_TARGETS.backendUrl}${path}`, options);
}

export async function runProductionTests() {
  const results = [];
  const add = (name, pass, detail = '') => results.push({ name, status: pass ? 'PASS' : 'FAIL', detail });

  const health = await api('/api/health');
  add('Health endpoint', health.ok && health.body?.status === 'ok', `HTTP ${health.status}; database=${health.body?.database || 'unknown'}`);

  const cors = await jsonFetch(`${DEPLOYMENT_TARGETS.backendUrl}/api/requirements`, {
    method: 'OPTIONS',
    headers: {
      Origin: DEPLOYMENT_TARGETS.frontendUrl,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
  });
  add('CORS preflight', cors.ok && cors.headers['access-control-allow-origin'] === DEPLOYMENT_TARGETS.frontendUrl, `HTTP ${cors.status}`);

  const created = [];
  for (const category of ['planner', 'performer', 'crew']) {
    const res = await api('/api/requirements', { method: 'POST', body: JSON.stringify(payloads[category]) });
    const id = res.body?.data?._id;
    add(`${category[0].toUpperCase()}${category.slice(1)} submission`, res.status === 201 && idPattern.test(id), id || `HTTP ${res.status}`);
    if (idPattern.test(id)) created.push(id);
  }

  const all = await api('/api/requirements');
  add('GET all requirements', all.ok && Array.isArray(all.body?.data), `HTTP ${all.status}; count=${all.body?.count ?? 'unknown'}`);

  if (created[0]) {
    const byId = await api(`/api/requirements/${created[0]}`);
    add('GET requirement by ID', byId.ok && byId.body?.data?._id === created[0], `HTTP ${byId.status}`);
    add('MongoDB persistence', Boolean(all.body?.data?.some((item) => item._id === created[0])), 'Created test record appears in list response.');
  } else {
    add('GET requirement by ID', false, 'Skipped because no valid record ID was created.');
    add('MongoDB persistence', false, 'Skipped because no valid record ID was created.');
  }

  const invalid = await api('/api/requirements', {
    method: 'POST',
    body: JSON.stringify({ eventBasics: { category: 'planner' }, categoryDetails: {} }),
  });
  add('Invalid request returns 400', invalid.status === 400, `HTTP ${invalid.status}`);

  const missing = await api('/api/requirements/000000000000000000000000');
  add('Missing record returns 404', missing.status === 404, `HTTP ${missing.status}`);

  const badCategory = await api('/api/requirements', {
    method: 'POST',
    body: JSON.stringify({
      eventBasics: { ...labeledBasics('planner'), category: 'invalid' },
      categoryDetails: {},
    }),
  });
  add('Invalid category rejected', badCategory.status === 400, `HTTP ${badCategory.status}`);

  const crossCategory = await api('/api/requirements', {
    method: 'POST',
    body: JSON.stringify({
      eventBasics: labeledBasics('performer'),
      categoryDetails: { crewCount: 2 },
    }),
  });
  add('Cross-category fields rejected', crossCategory.status === 400, `HTTP ${crossCategory.status}`);

  const malformed = await api('/api/requirements/not-a-valid-object-id');
  add('Malformed ID handled safely', malformed.status === 400, `HTTP ${malformed.status}`);

  return { ranAt: new Date().toISOString(), backendUrl: DEPLOYMENT_TARGETS.backendUrl, createdIds: created, results };
}
