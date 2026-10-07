/**
 * Dev-only smoke test. Boots an in-memory MongoDB, starts the Express app on a
 * random port, then exercises the requirement endpoints (valid + invalid posts,
 * fetch all, fetch by id). Run with: node scripts/test-endpoints.js
 */
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.CLIENT_ORIGIN = '';
process.env.PORT = '0'; // unused by app.listen below, kept for clarity

const mongoose = require('mongoose');
const http = require('http');

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri('gopratle');

  const connectDB = require('../src/config/db');
  await connectDB();

  const app = require('../src/app');
  const server = app.listen(0);
  const port = server.address().port;

  const post = (path, body) =>
    new Promise((resolve, reject) => {
      const payload = JSON.stringify(body);
      const req = http.request(
        { host: '127.0.0.1', port, path, method: 'POST', headers: { 'Content-Type': 'application/json' } },
        (res) => {
          let raw = '';
          res.on('data', (c) => (raw += c));
          res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw || '{}') }));
        }
      );
      req.on('error', reject);
      req.write(payload);
      req.end();
    });

  const get = (path) =>
    new Promise((resolve, reject) => {
      http.get({ host: '127.0.0.1', port, path }, (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw || '{}') }));
      }).on('error', reject);
    });

  const results = [];
  const check = (name, cond) => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}`);

  // 1. health
  const health = await get('/api/health');
  check('GET /api/health -> 200', health.status === 200 && health.body.status === 'ok');

  // 2. valid planner post (nested payload)
  const valid = await post('/api/requirements', {
    eventBasics: {
      eventName: 'Test Gala',
      eventType: 'Corporate',
      dateMode: 'range',
      startDate: '2026-11-01',
      endDate: '2026-11-02',
      location: 'Bengaluru',
      venue: 'Test Hall',
      category: 'planner',
    },
    categoryDetails: {
      planningScope: 'full',
      guestCount: '150',
      budgetMin: '100000',
      budgetMax: '500000',
      servicesRequired: ['catering', 'decor'],
      planningTimeline: '1-3-months',
      coordinatorsNeeded: '2',
      vendorCoordination: true,
      onSiteCoordination: false,
    },
    additionalNotes: 'smoke test',
  });
  check('POST planner (valid) -> 201 with _id', valid.status === 201 && !!valid.body.data?._id);
  check(
    'planner details nested + coerced',
    valid.body.data?.category === 'planner' &&
      valid.body.data?.plannerDetails?.guestCount === 150 &&
      valid.body.data?.plannerDetails?.budgetMin === 100000 && !valid.body.data?.performerDetails?.genre && !valid.body.data?.crewDetails?.numberOfCrew
  );

  // 3. invalid posts: bad basics and bad category details
  const invalid = await post('/api/requirements', {
    eventBasics: {
      eventName: 'Bad',
      eventType: 'X',
      dateMode: 'range',
      startDate: '2026-12-01',
      endDate: '2026-11-01',
      location: '',
      category: 'planner',
    },
    categoryDetails: { servicesRequired: [] },
  });
  check(
    'POST planner (invalid) -> 400 with messages',
    invalid.status === 400 && Array.isArray(invalid.body.errors) && invalid.body.errors.length >= 2
  );

  // 3b. performer payload must not accept planner-style details silently
  const crossCategory = await post('/api/requirements', {
    eventBasics: {
      eventName: 'Cross',
      eventType: 'Concert',
      dateMode: 'single',
      startDate: '2026-11-15',
      location: 'Pune',
      category: 'performer',
    },
    categoryDetails: { crewCount: 5 }, // crew field under performer -> dropped
  });
  check(
    'performer post drops crew fields, 400 on missing required',
    crossCategory.status === 400 &&
      crossCategory.body.errors.some((m) => m.includes('Performance type'))
  );

  // 3c. invalid category sent directly to the API
  const badCategory = await post('/api/requirements', {
    eventBasics: {
      eventName: 'Bad Cat',
      eventType: 'Wedding',
      dateMode: 'single',
      startDate: '2026-11-15',
      location: 'Delhi',
      category: 'hacker',
    },
    categoryDetails: {},
  });
  check(
    'invalid category -> 400 with message',
    badCategory.status === 400 &&
      badCategory.body.errors.some((m) => m.includes('Category must be one of'))
  );

  // 4. valid crew post
  const crew = await post('/api/requirements', {
    eventBasics: {
      eventName: 'Concert Crew',
      eventType: 'Concert',
      dateMode: 'single',
      startDate: '2026-11-15',
      location: 'Mumbai',
      category: 'crew',
    },
    categoryDetails: {
      crewRole: ['security', 'stage-setup'],
      crewCount: '6',
      experienceLevel: 'mid',
      workingHours: '8',
      equipmentRequired: ['pa-system'],
      setupRequired: true,
      breakdownRequired: true,
      travelRequired: false,
    },
  });
  check(
    'POST crew (valid) -> 201 with coerced details',
    crew.status === 201 && crew.body.data?.crewDetails?.numberOfCrew === 6 && crew.body.data?.crewDetails?.crewRoles?.includes('security')
  );

  // 5. list + filter
  const all = await get('/api/requirements');
  const planners = await get('/api/requirements?category=planner');
  check(
    'GET list returns all and filters by category',
    all.body.count === 2 && planners.body.count === 1
  );

  // 6. by id + 404 + malformed JSON paths
  const byId = await get(`/api/requirements/${valid.body.data._id}`);
  const missing = await get('/api/requirements/000000000000000000000000');
  check('GET by id -> 200', byId.status === 200 && byId.body.data?.eventName === 'Test Gala');
  check('GET unknown id -> 404', missing.status === 404);

  const malformed = await new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, path: '/api/requirements', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw || '{}') }));
      }
    );
    req.on('error', reject);
    req.write('{ not json');
    req.end();
  });
  check('malformed JSON -> 400', malformed.status === 400);

  server.close();
  await mongoose.disconnect();
  await mongod.stop();

  console.log(results.join('\n'));
  const failed = results.filter((r) => r.startsWith('FAIL')).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});



