import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const root = process.cwd();

function nextServerMock() {
  class MockResponse {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.cookies = { set: () => {} };
    }
  }
  return {
    NextResponse: {
      json(body, init) {
        return new MockResponse(body, init);
      },
    },
  };
}

async function loadModule(relativePath, mocks = {}) {
  const filename = path.join(root, relativePath);
  const source = await readFile(filename, 'utf8');
  const context = vm.createContext({
    Buffer,
    Date,
    Math,
    URL,
    console,
    process,
    fetch: mocks.fetch || globalThis.fetch,
    crypto: globalThis.crypto,
  });
  const mod = new vm.SourceTextModule(source, {
    context,
    identifier: filename,
    initializeImportMeta(meta) {
      meta.url = `file://${filename}`;
    },
  });
  await mod.link(async (specifier) => {
    if (specifier === 'next/server') return synthetic(specifier, nextServerMock(), context);
    if (specifier === 'node:crypto') return synthetic(specifier, await import('node:crypto'), context);
    if (mocks[specifier]) return synthetic(specifier, mocks[specifier], context);
    const resolved = path.join(path.dirname(filename), specifier.endsWith('.js') ? specifier : `${specifier}.js`);
    return loadModule(path.relative(root, resolved), mocks);
  });
  await mod.evaluate();
  return mod.namespace;
}

function synthetic(identifier, exports, context) {
  const names = Object.keys(exports);
  const mod = new vm.SyntheticModule(names, function init() {
    for (const name of names) this.setExport(name, exports[name]);
  }, { context, identifier });
  return mod;
}

function req(ip = '10.0.0.1', csrf = '') {
  return {
    headers: {
      get(name) {
        const values = {
          'x-forwarded-for': ip,
          'x-real-ip': ip,
          'x-csrf-token': csrf,
        };
        return values[name.toLowerCase()] || '';
      },
    },
    cookies: {
      get(name) {
        return this[name] ? { value: this[name] } : null;
      },
    },
  };
}

test('rate limiting is shared across requests and fails closed for mutations', async () => {
  const counts = new Map();
  const rate = await loadModule('src/lib/admin/rateLimit.js', {
    './store': {
      async redisPipeline(commands) {
        const key = commands[0][1];
        const next = (counts.get(key) || 0) + 1;
        counts.set(key, next);
        return [next, 1];
      },
    },
  });

  assert.equal(await rate.rateLimit(req(), 'deploy', { limit: 2, windowSec: 60 }), null);
  assert.equal(await rate.rateLimit(req(), 'deploy', { limit: 2, windowSec: 60 }), null);
  const blocked = await rate.rateLimit(req(), 'deploy', { limit: 2, windowSec: 60 });
  assert.equal(blocked.status, 429);

  const failing = await loadModule('src/lib/admin/rateLimit.js', {
    './store': {
      async redisPipeline() {
        throw new Error('redis down');
      },
    },
  });
  assert.equal((await failing.rateLimit(req(), 'deploy')).status, 503);
  assert.equal(await failing.rateLimit(req(), 'readonly'), null);
});

test('audit records persist sanitized entries and redacts secrets', async () => {
  const written = [];
  const audit = await loadModule('src/lib/admin/audit.js', {
    './store': {
      async redisPipeline(commands) {
        written.push(commands);
        return [1, 'OK'];
      },
      async redisCommand() {
        return written.map((commands) => commands[0][2]);
      },
    },
  });

  await audit.audit('render.deploy.triggered', {
    actor: 'admin',
    result: 'success',
    resourceId: 'gopratle-api',
    details: { token: 'secret-token', nested: { MONGODB_URI: 'not-a-real-connection-string' } },
  });
  const events = await audit.auditEvents();
  assert.equal(events[0].actor, 'admin');
  assert.equal(events[0].details.token, '[redacted]');
  assert.equal(events[0].details.nested.MONGODB_URI, '[redacted]');
});

test('authentication requires strong env values and CSRF for mutations', async () => {
  process.env.ADMIN_DASHBOARD_PASSWORD = 'correct-password';
  process.env.ADMIN_SESSION_SECRET = 'a-long-random-session-secret-for-tests';
  process.env.ADMIN_DASHBOARD_USER = 'ops-admin';
  const security = await loadModule('src/lib/admin/security.js');
  const session = security.createSession();
  const request = req('10.0.0.2', session.csrf);
  request.cookies.gp_admin_session = session.token;

  assert.equal(security.authenticatePassword('wrong').ok, false);
  assert.equal(security.authenticatePassword('correct-password').ok, true);
  assert.equal(security.requireAdmin(request, { mutate: true }).ok, true);
  const badCsrf = req('10.0.0.2', 'bad');
  badCsrf.cookies.gp_admin_session = session.token;
  assert.equal(security.requireAdmin(badCsrf, { mutate: true }).response.status, 403);
});

test('store rejects missing credentials and placeholders', async () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  const store = await loadModule('src/lib/admin/store.js');
  await assert.rejects(() => store.redisCommand(['PING']));
  process.env.UPSTASH_REDIS_REST_URL = 'replace-with-url';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'replace-with-token';
  assert.equal(store.storeConfigured(), false);
});

test('Render service mismatch and duplicate deployment are rejected before deploy POST', async () => {
  process.env.RENDER_API_KEY = 'render-token';
  process.env.RENDER_SERVICE_ID = 'srv-real';
  let deployPostCount = 0;
  const render = await loadModule('src/lib/admin/render.js', {
    './config': { DEPLOYMENT_TARGETS: { renderServiceName: 'gopratle-api' } },
    './http': {
      async jsonFetch(url, options = {}) {
        if (url.endsWith('/deploys') && options.method === 'POST') deployPostCount += 1;
        if (url.includes('/deploys?')) return { ok: true, body: [{ id: 'dep-1', status: 'deploying' }] };
        if (url.includes('/env-vars')) return { ok: true, body: [] };
        return { ok: true, body: { id: 'srv-real', name: 'gopratle-api' } };
      },
    },
  });
  const result = await render.triggerRenderDeploy();
  assert.equal(result.status, 'deploy_in_progress');
  assert.equal(deployPostCount, 0);
});

test('Atlas and GitHub API failures return safe error states', async () => {
  process.env.ATLAS_CLIENT_ID = 'atlas-client';
  process.env.ATLAS_CLIENT_SECRET = 'atlas-secret';
  const atlas = await loadModule('src/lib/admin/atlas.js', {
    './config': { DEPLOYMENT_TARGETS: { atlasClusterName: 'Cluster0', atlasDatabaseName: 'gopratle' } },
    './http': {
      async jsonFetch() {
        return { ok: false, status: 401, body: { detail: 'unauthorized' } };
      },
    },
  });
  assert.equal((await atlas.getAtlasOverview()).status, 'auth_failed');

  const github = await loadModule('src/lib/admin/github.js', {
    './config': { DEPLOYMENT_TARGETS: { githubOwner: 'Akashvasan2003', githubRepo: 'event-manager', githubBranch: 'master', expectedCommit: 'f9c91fd' } },
    './http': {
      async jsonFetch() {
        return { ok: false, status: 403 };
      },
    },
  });
  assert.equal((await github.getGithubOverview()).status, 'error');
});
