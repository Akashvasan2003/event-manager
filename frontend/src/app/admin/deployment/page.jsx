'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';

const statusTone = {
  ok: styles.good,
  configured: styles.good,
  PASS: styles.good,
  failed: styles.bad,
  FAIL: styles.bad,
  error: styles.bad,
  auth_failed: styles.bad,
  missing_credentials: styles.warn,
  cluster_unavailable: styles.warn,
  mismatch: styles.warn,
  partial: styles.warn,
  not_found: styles.warn,
};

function tone(value) {
  return statusTone[value] || styles.neutral;
}

async function api(path, options = {}, csrfToken = '') {
  const res = await fetch(path, {
    cache: 'no-store',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed with HTTP ${res.status}`);
  return data;
}

export default function DeploymentDashboardPage() {
  const [session, setSession] = useState({ loading: true, authenticated: false, csrfToken: '' });
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState(null);
  const [plan, setPlan] = useState(null);
  const [tests, setTests] = useState(null);
  const [assistantText, setAssistantText] = useState('');
  const [assistant, setAssistant] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function loadSession() {
    const data = await api('/api/admin/auth');
    setSession({ loading: false, ...data });
    if (data.authenticated) loadStatus(data.csrfToken);
  }

  async function loadStatus(csrf = session.csrfToken) {
    setBusy('status');
    setError('');
    try {
      const data = await api('/api/admin/deployment/status', {}, csrf);
      setStatus(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  useEffect(() => {
    loadSession().catch((err) => {
      setError(err.message);
      setSession({ loading: false, authenticated: false, csrfToken: '' });
    });
  }, []);

  async function login(event) {
    event.preventDefault();
    setBusy('login');
    setError('');
    try {
      const data = await api('/api/admin/auth', { method: 'POST', body: JSON.stringify({ password }) });
      setSession({ loading: false, ...data });
      setPassword('');
      await loadStatus(data.csrfToken);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function logout() {
    await api('/api/admin/auth', { method: 'DELETE' }, session.csrfToken).catch(() => {});
    setSession({ loading: false, authenticated: false, csrfToken: '' });
    setStatus(null);
  }

  async function generatePlan() {
    setBusy('plan');
    setError('');
    try {
      setPlan(await api('/api/admin/deployment/plan', { method: 'POST', body: JSON.stringify({ dryRun: true }) }, session.csrfToken));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function triggerDeploy() {
    const confirm = window.prompt('Type TRIGGER_RENDER_DEPLOY to trigger a production Render deploy.');
    if (confirm !== 'TRIGGER_RENDER_DEPLOY') return;
    setBusy('deploy');
    setError('');
    try {
      await api('/api/admin/deployment/deploy', { method: 'POST', body: JSON.stringify({ confirm }) }, session.csrfToken);
      await loadStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function runTests() {
    const confirm = window.prompt('Production API tests create labeled records. Type CREATE_PRODUCTION_TEST_RECORDS to continue.');
    if (confirm !== 'CREATE_PRODUCTION_TEST_RECORDS') return;
    setBusy('tests');
    setError('');
    try {
      setTests(await api('/api/admin/deployment/tests', { method: 'POST', body: JSON.stringify({ confirm }) }, session.csrfToken));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function askAssistant(event) {
    event.preventDefault();
    setBusy('assistant');
    setError('');
    try {
      setAssistant(await api('/api/admin/deployment/assistant', { method: 'POST', body: JSON.stringify({ message: assistantText }) }, session.csrfToken));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  if (session.loading) return <main className={styles.shell}><div className={styles.panel}>Loading admin session...</div></main>;

  if (!session.authenticated) {
    return (
      <main className={styles.loginShell}>
        <form className={styles.loginPanel} onSubmit={login}>
          <p className={styles.eyebrow}>GoPratle Cloud</p>
          <h1>Deployment Dashboard</h1>
          <label>
            Administrator password
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
          </label>
          {error && <div className={styles.error}>{error}</div>}
          <button type="submit" disabled={busy === 'login'}>{busy === 'login' ? 'Signing in...' : 'Sign in'}</button>
        </form>
      </main>
    );
  }

  const checks = tests?.report?.results || [];

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <div>
          <p className={styles.eyebrow}>GoPratle Cloud</p>
          <h1>Deployment Dashboard</h1>
        </div>
        <div className={styles.actions}>
          <button type="button" onClick={() => loadStatus()} disabled={busy === 'status'}>Refresh</button>
          <button type="button" onClick={logout} className={styles.secondary}>Sign out</button>
        </div>
      </header>

      {error && <div className={styles.error}>{error}</div>}

      <section className={styles.grid}>
        <StatusCard title="Vercel Frontend" value={status?.frontend?.status || 'pending'} detail={status?.targets?.frontendUrl} />
        <StatusCard title="Render Backend" value={status?.render?.status || 'pending'} detail={status?.render?.name || status?.targets?.backendUrl} />
        <StatusCard title="MongoDB Atlas" value={status?.atlas?.status || 'pending'} detail={status?.atlas?.cluster?.name || status?.atlas?.message} />
        <StatusCard title="Health Check" value={status?.backend?.health?.status || 'pending'} detail={status?.backend?.health ? `HTTP ${status.backend.health.httpStatus} in ${status.backend.health.responseMs}ms` : ''} />
      </section>

      <div className={styles.layout}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>Infrastructure Overview</h2>
            <span>{status?.checkedAt ? new Date(status.checkedAt).toLocaleString() : 'Not checked'}</span>
          </div>
          <dl className={styles.kv}>
            <dt>GitHub</dt><dd>{status?.github?.repository || 'Unavailable'} / {status?.github?.branch || 'master'}</dd>
            <dt>Latest commit</dt><dd><Badge value={status?.github?.status} /> {status?.github?.latestCommit || 'unknown'}</dd>
            <dt>Latest deployment</dt><dd><Badge value={status?.render?.latestDeploy?.status || 'unknown'} /> {status?.render?.latestDeploy?.id || 'No deployment data'}</dd>
            <dt>Database</dt><dd>{status?.backend?.health?.body?.database || 'unknown'}</dd>
          </dl>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>MongoDB Management</h2>
            <Badge value={status?.atlas?.status || 'pending'} />
          </div>
          <dl className={styles.kv}>
            <dt>Project</dt><dd>{status?.atlas?.project?.name || status?.atlas?.project?.id || 'Not connected'}</dd>
            <dt>Cluster</dt><dd>{status?.atlas?.cluster?.name || 'Unknown'}</dd>
            <dt>Cluster state</dt><dd>{status?.atlas?.cluster?.stateName || status?.atlas?.cluster?.error || 'Unknown'}</dd>
            <dt>Region</dt><dd>{status?.atlas?.cluster?.region || 'Unknown'}</dd>
            <dt>Database</dt><dd>{status?.atlas?.databaseName || 'gopratle'}</dd>
            <dt>Users</dt><dd>{status?.atlas?.databaseUsers?.map((user) => user.username).join(', ') || 'Unavailable'}</dd>
          </dl>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>Render Management</h2>
            <Badge value={status?.render?.status || 'pending'} />
          </div>
          <dl className={styles.kv}>
            <dt>Service ID</dt><dd>{status?.render?.serviceId || 'Not configured'}</dd>
            <dt>Root directory</dt><dd>{status?.render?.rootDir || 'backend'}</dd>
            <dt>Build</dt><dd>{status?.render?.buildCommand || 'npm install'}</dd>
            <dt>Start</dt><dd>{status?.render?.startCommand || 'npm start'}</dd>
            <dt>Health path</dt><dd>{status?.render?.healthCheckPath || '/api/health'}</dd>
            <dt>Environment</dt><dd><EnvChecks env={status?.render?.env} /></dd>
          </dl>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>Deployment Workflow</h2>
            <span>Dry-run first</span>
          </div>
          <div className={styles.buttonRow}>
            <button type="button" onClick={generatePlan} disabled={busy === 'plan'}>Prepare Plan</button>
            <button type="button" onClick={triggerDeploy} disabled={busy === 'deploy'} className={styles.danger}>Trigger Deploy</button>
            <button type="button" onClick={runTests} disabled={busy === 'tests'} className={styles.secondary}>Run Tests</button>
          </div>
          {plan?.plan && (
            <div className={styles.plan}>
              <strong>{plan.plan.summary}</strong>
              <List items={plan.plan.blockers} empty="No blockers." />
              <List items={plan.plan.changes} empty="No recommended changes." />
            </div>
          )}
        </section>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>Production Tests</h2>
          <span>{tests?.report?.ranAt ? new Date(tests.report.ranAt).toLocaleString() : 'Not run'}</span>
        </div>
        <div className={styles.testGrid}>
          {checks.length ? checks.map((item) => (
            <div key={item.name} className={styles.testItem}>
              <Badge value={item.status} />
              <strong>{item.name}</strong>
              <span>{item.detail}</span>
            </div>
          )) : <p className={styles.muted}>Run tests after the backend is live. Test submissions are labeled and preserved.</p>}
        </div>
      </section>

      <section className={styles.assistantPanel}>
        <div className={styles.panelHead}>
          <h2>AI Deployment Assistant</h2>
          <span>Sanitized infrastructure context</span>
        </div>
        <form onSubmit={askAssistant} className={styles.assistantForm}>
          <textarea value={assistantText} onChange={(event) => setAssistantText(event.target.value)} placeholder="Ask what is blocking production deployment..." />
          <button type="submit" disabled={busy === 'assistant'}>Analyze</button>
        </form>
        {assistant?.answer && (
          <div className={styles.assistantAnswer}>
            <h3>Diagnosis</h3>
            <List items={assistant.answer.diagnosis} />
            <h3>Safe Plan</h3>
            <List items={assistant.answer.safePlan} />
          </div>
        )}
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>Audit Log</h2>
          <span>{status?.audit?.length || 0} recent events</span>
        </div>
        <div className={styles.logList}>
          {(status?.audit || []).map((event) => (
            <div key={event.id}>
              <strong>{event.action}</strong>
              <span>{event.result || 'unknown'} / {event.actor || 'unknown'} / {event.resourceId || 'n/a'} / {new Date(event.at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function StatusCard({ title, value, detail }) {
  return (
    <article className={styles.statusCard}>
      <span>{title}</span>
      <strong className={tone(value)}>{value}</strong>
      <p>{detail || 'Awaiting status'}</p>
    </article>
  );
}

function Badge({ value = 'unknown' }) {
  return <span className={`${styles.badge} ${tone(value)}`}>{value}</span>;
}

function EnvChecks({ env }) {
  if (!env) return 'Unavailable';
  return (
    <span className={styles.envChecks}>
      {Object.entries(env).map(([key, value]) => <span key={key} className={value ? styles.good : styles.bad}>{key}</span>)}
    </span>
  );
}

function List({ items = [], empty = 'No items.' }) {
  const visible = items.filter(Boolean);
  if (!visible.length) return <p className={styles.muted}>{empty}</p>;
  return <ul>{visible.map((item) => <li key={item}>{item}</li>)}</ul>;
}
