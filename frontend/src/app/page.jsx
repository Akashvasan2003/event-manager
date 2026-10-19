'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import EventRequirementWizard from '../components/EventRequirementWizard';
import { getRequirement, getRequirements } from '../services/requirementApi';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', mark: '⌂' },
  { id: 'requirements', label: 'Requirements', mark: '≡' },
  { id: 'events', label: 'Events', mark: '◷' },
  { id: 'analytics', label: 'Analytics', mark: '▥' },
];

const CATEGORY_LABELS = {
  planner: 'Planner',
  performer: 'Performer',
  crew: 'Crew',
};

const CATEGORY_COLORS = {
  planner: 'violet',
  performer: 'teal',
  crew: 'orange',
};

const TITLES = {
  overview: ['Overview', 'A clear view of your event requirements.'],
  requirements: ['Requirements', 'Search and organize submitted requests.'],
  events: ['Events', 'Events represented by your saved requirements.'],
  analytics: ['Analytics', 'A summary of the records returned by your workspace.'],
  create: ['Create requirement', 'Share the details and support your event needs.'],
};

function formatDate(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return 'Date not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date not set';
  return new Intl.DateTimeFormat('en-IN', options).format(date);
}

function matchesSearch(item, query) {
  if (!query.trim()) return true;
  const text = [item.eventName, item.eventType, item.location, item.category]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return text.includes(query.trim().toLowerCase());
}

export default function HomePage() {
  const [view, setView] = useState('overview');
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toast, setToast] = useState('');
  const searchInput = useRef(null);
  const [selectedRequirementId, setSelectedRequirementId] = useState(null);

  const loadRequirements = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setLoadError('');
    try {
      const result = await getRequirements();
      setRequirements(Array.isArray(result?.data) ? result.data : []);
    } catch (error) {
      setLoadError(error.message || 'Requirements could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRequirements();
  }, [loadRequirements]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(''), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    function handleSearchShortcut(event) {
      const target = event.target;
      const typing = target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if (event.key === '/' && !typing) {
        event.preventDefault();
        searchInput.current?.focus();
      } else if (event.key === 'Escape' && document.activeElement === searchInput.current) {
        searchInput.current?.blur();
      }
    }
    window.addEventListener('keydown', handleSearchShortcut);
    return () => window.removeEventListener('keydown', handleSearchShortcut);
  }, []);

  const filtered = useMemo(
    () => requirements.filter((item) => matchesSearch(item, search)),
    [requirements, search]
  );

  const title = TITLES[view] || TITLES.overview;
  const navClass = `workspace ${sidebarCollapsed ? 'workspace--collapsed' : ''}`;

  function openView(nextView) {
    setView(nextView);
    setMobileNavOpen(false);
  }

  function onRequirementCreated() {
    setView('overview');
    setToast('Requirement saved successfully.');
    loadRequirements(true);
  }

  return (
    <div className={navClass}>
      {mobileNavOpen && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar--open' : ''}`}>
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">G</span>
          <span className="brand-name">GoPratle<span>EVENT WORKSPACE</span></span>
          <button className="icon-button sidebar-collapse" title="Collapse sidebar" aria-label="Collapse sidebar" onClick={() => setSidebarCollapsed((value) => !value)}>
            <span aria-hidden="true">‹</span>
          </button>
        </div>

        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <button key={item.id} className={`nav-item ${view === item.id ? 'nav-item--active' : ''}`} onClick={() => openView(item.id)} title={sidebarCollapsed ? item.label : undefined}>
              <span className="nav-mark" aria-hidden="true">{item.mark}</span>
              <span className="nav-label">{item.label}</span>
              {item.id === 'requirements' && requirements.length > 0 && <span className="nav-count">{requirements.length}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />
        <button className="nav-item nav-create" onClick={() => openView('create')} title={sidebarCollapsed ? 'Create requirement' : undefined}>
          <span className="nav-mark nav-mark--plus" aria-hidden="true">+</span>
          <span className="nav-label">Create requirement</span>
        </button>
        <div className="sidebar-footer">
          <div className="workspace-avatar" aria-hidden="true">G</div>
          <div className="workspace-identity"><strong>GoPratle</strong><span>Event workspace</span></div>
          <span className="workspace-menu" aria-hidden="true">•••</span>
        </div>
      </aside>

      <div className="workspace-main">
        {toast && <div className="toast" role="status" aria-live="polite"><span className="toast__mark" aria-hidden="true">✓</span><span>{toast}</span><button type="button" aria-label="Dismiss notification" onClick={() => setToast('')}>×</button></div>}
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><span aria-hidden="true">☰</span></button>
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-separator">/</span><strong>{title[0]}</strong></div>
          <div className="topbar-tools">
            <label className="global-search">
              <span className="search-mark" aria-hidden="true">⌕</span>
              <input ref={searchInput} aria-label="Search requirements" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search requirements" />
              <kbd>/</kbd>
            </label>
            <button className="topbar-create" onClick={() => openView('create')}><span aria-hidden="true">+</span> New requirement</button>
          </div>
        </header>

        <main className="content-area">
          <div className="page-heading">
            <div>
              <div className="eyebrow">EVENT OPERATIONS</div>
              <h1>{title[0]}</h1>
              <p>{title[1]}</p>
            </div>
            {view !== 'create' && (
              <button className="icon-button refresh-button" onClick={() => loadRequirements(true)} disabled={loading || refreshing} title="Refresh requirements" aria-label="Refresh requirements">
                <span aria-hidden="true">↻</span>
              </button>
            )}
          </div>

          {loadError && <div className="notice notice--error" role="alert"><div><strong>Could not load requirements</strong><span>{loadError}</span></div><button className="btn btn--quiet" onClick={() => loadRequirements()}>Retry</button></div>}

          {view === 'create' ? (
            <EventRequirementWizard onComplete={onRequirementCreated} onCancel={() => openView('overview')} />
          ) : view === 'overview' ? (
            <Overview requirements={requirements} matchingRequirements={filtered} loading={loading} error={loadError} refreshing={refreshing} onCreate={() => openView('create')} onViewAll={() => openView('requirements')} onSelect={setSelectedRequirementId} />
          ) : view === 'requirements' ? (
            <RequirementsView requirements={filtered} loading={loading} loadError={loadError} search={search} onSelect={setSelectedRequirementId} />
          ) : view === 'events' ? (
            <EventsView requirements={filtered} loading={loading} loadError={loadError} onSelect={setSelectedRequirementId} />
          ) : (
            <AnalyticsView requirements={requirements} loading={loading} loadError={loadError} />
          )}
        </main>
        <RequirementDetailsDialog id={selectedRequirementId} onClose={() => setSelectedRequirementId(null)} />
      </div>
    </div>
  );
}

function Overview({ requirements, matchingRequirements, loading, error, refreshing, onCreate, onViewAll, onSelect }) {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const upcoming = requirements.filter((item) => item.startDate && new Date(item.startDate) >= new Date(today.toDateString())).length;
  const thisMonth = requirements.filter((item) => item.createdAt && new Date(item.createdAt) >= monthStart).length;
  const categories = new Set(requirements.map((item) => item.category).filter(Boolean)).size;
  const unavailable = !loading && !!error && requirements.length === 0;
  const stats = [
    { label: 'Requirements', value: requirements.length, hint: 'Records returned by the API', tone: 'violet', mark: '≡' },
    { label: 'Upcoming events', value: upcoming, hint: 'Based on event start dates', tone: 'teal', mark: '◷' },
    { label: 'Submitted this month', value: thisMonth, hint: 'Using saved submission dates', tone: 'orange', mark: '↗' },
    { label: 'Categories in use', value: categories, hint: 'Planner, performer, crew', tone: 'blue', mark: '◈' },
  ];
  const recent = [...matchingRequirements].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5);

  return (
    <>
      <section className="welcome-band">
        <div><div className="welcome-kicker"><span className="live-dot" /> WORKSPACE SNAPSHOT</div><h2>Make every event happen.</h2><p>Plan your next move from the requirements your team has collected.</p></div>
        <button className="btn btn--primary" onClick={onCreate}><span aria-hidden="true">+</span> Create requirement</button>
        <span className="welcome-watermark" aria-hidden="true">G</span>
      </section>

      <section className="stat-grid" aria-label="Requirement summary">
        {stats.map((stat) => <article className="stat-card" key={stat.label}>
          <div className={`stat-icon stat-icon--${stat.tone}`} aria-hidden="true">{stat.mark}</div>
          <div className="stat-label">{stat.label}</div><div className="stat-value">{loading ? <span className="skeleton skeleton--number" /> : unavailable ? '—' : stat.value}</div><div className="stat-hint">{unavailable ? 'Data unavailable' : stat.hint}</div>
        </article>)}
      </section>

      <div className="overview-columns">
        <section className="panel recent-panel">
          <div className="panel-heading"><div><h2>Recent requirements</h2><p>Your latest saved requests</p></div><button className="text-action" onClick={onViewAll}>View all <span aria-hidden="true">→</span></button></div>
          {loading && <LoadingRows />}
          {!loading && !error && recent.length === 0 && <EmptyState title="Your workspace is ready" text="Create a requirement to start organizing an event." action="Create requirement" onAction={onCreate} />}
          {!loading && recent.length > 0 && <div className="recent-list">{recent.map((item) => <RequirementRow key={item._id} item={item} onSelect={onSelect} />)}</div>}
          {refreshing && <div className="refresh-note" role="status">Refreshing records…</div>}
        </section>

        <CategorySummary requirements={requirements} loading={loading} error={unavailable} />
      </div>
    </>
  );
}

function CategorySummary({ requirements, loading, error }) {
  const counts = ['planner', 'performer', 'crew'].map((category) => ({ category, count: requirements.filter((item) => item.category === category).length }));
  const max = Math.max(1, ...counts.map((item) => item.count));
  return <section className="panel category-panel"><div className="panel-heading"><div><h2>By category</h2><p>Distribution of returned records</p></div><span className="panel-period">ALL TIME*</span></div>
    {loading ? <div className="category-loading"><span className="skeleton" /><span className="skeleton" /><span className="skeleton" /></div> : error ? <EmptyState title="Category data unavailable" text="Reconnect to load your saved requirements." /> : requirements.length === 0 ? <EmptyState title="No category data yet" text="Category totals appear after requirements are saved." /> : <div className="category-bars">{counts.map(({ category, count }) => <div className="category-bar-row" key={category}><div className="category-bar-label"><span>{CATEGORY_LABELS[category]}</span><strong>{count}</strong></div><div className="bar-track"><span className={`bar-fill bar-fill--${CATEGORY_COLORS[category]}`} style={{ width: `${Math.max(count ? 8 : 0, (count / max) * 100)}%` }} /></div></div>)}</div>}
    <p className="data-footnote">*Counts reflect records returned by the API (maximum 100).</p>
  </section>;
}

function RequirementsView({ requirements, loading, loadError, search, onSelect }) {
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('newest');
  const [layout, setLayout] = useState('list');
  const items = useMemo(() => requirements.filter((item) => category === 'all' || item.category === category).sort((a, b) => {
    const left = new Date(sort === 'event-date' ? a.startDate || 0 : a.createdAt || 0).getTime();
    const right = new Date(sort === 'event-date' ? b.startDate || 0 : b.createdAt || 0).getTime();
    return sort === 'oldest' ? left - right : right - left;
  }), [requirements, category, sort]);

  return <section className="panel list-panel">
    <div className="list-toolbar"><div className="filter-group" role="group" aria-label="Filter by category">{['all', 'planner', 'performer', 'crew'].map((value) => <button key={value} aria-pressed={category === value} className={`filter-chip ${category === value ? 'filter-chip--active' : ''}`} onClick={() => setCategory(value)}>{value === 'all' ? 'All' : CATEGORY_LABELS[value]}</button>)}</div><div className="list-tools"><label className="sort-control"><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Recently submitted</option><option value="oldest">Oldest submitted</option><option value="event-date">Event date</option></select></label><div className="view-toggle" role="group" aria-label="Results layout"><button aria-pressed={layout === 'list'} aria-label="List view" title="List view" className={layout === 'list' ? 'view-toggle__active' : ''} onClick={() => setLayout('list')}>≡</button><button aria-pressed={layout === 'grid'} aria-label="Grid view" title="Grid view" className={layout === 'grid' ? 'view-toggle__active' : ''} onClick={() => setLayout('grid')}>▦</button></div></div></div>
    {search && <div className="result-count">{items.length} result{items.length === 1 ? '' : 's'} for <strong>“{search}”</strong></div>}
    {loading ? <LoadingRows /> : items.length === 0 && loadError ? <EmptyState title="Requirements unavailable" text="Retry the connection to load saved records." /> : items.length === 0 ? <EmptyState title={search ? 'No matching requirements' : 'No requirements in this view'} text={search ? 'Try another search or clear the search field.' : 'Saved requirement records will appear here.'} /> : <div className={layout === 'grid' ? 'requirement-grid' : 'requirement-table-wrap'}>{layout === 'list' && <RequirementTable items={items} onSelect={onSelect} />}{layout === 'grid' && items.map((item) => <RequirementCard item={item} key={item._id} onSelect={onSelect} />)}</div>}
    <div className="list-footnote">Showing up to 100 records returned by the API.</div>
  </section>;
}

function EventsView({ requirements, loading, loadError, onSelect }) {
  const items = [...requirements].sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0));
  return <section className="panel list-panel"><div className="panel-heading panel-heading--spaced"><div><h2>Event schedule</h2><p>Event dates from saved requirement records</p></div><span className="record-count">{requirements.length} records</span></div>
    {loading ? <LoadingRows /> : items.length === 0 && loadError ? <EmptyState title="Event records unavailable" text="Retry the connection to load saved event requirements." /> : items.length === 0 ? <EmptyState title="No events to show" text="Create an event requirement to see its scheduled date here." /> : <div className="event-list">{items.map((item) => <article className="event-row" key={item._id}><div className="event-date"><strong>{formatDate(item.startDate, { day: '2-digit' })}</strong><span>{formatDate(item.startDate, { month: 'short', year: 'numeric' })}</span></div><div className="event-main"><h3>{item.eventName}</h3><p>{item.eventType} <span>·</span> {item.location}</p></div><CategoryTag category={item.category} /><div className="event-submitted">Submitted {formatDate(item.createdAt, { day: 'numeric', month: 'short' })}</div><button className="details-action" onClick={() => onSelect(item._id)} aria-label={`View ${item.eventName} details`} title="View details">↗</button></article>)}</div>}
    <div className="list-footnote">This view reflects event details stored with requirements; no separate event status is available.</div>
  </section>;
}

function AnalyticsView({ requirements, loading, loadError }) {
  const categories = ['planner', 'performer', 'crew'].map((category) => ({ category, count: requirements.filter((item) => item.category === category).length }));
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - (5 - index));
    return { key: `${date.getFullYear()}-${date.getMonth()}`, label: new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(date), year: date.getFullYear(), count: requirements.filter((item) => { const created = item.createdAt && new Date(item.createdAt); return created && created.getFullYear() === date.getFullYear() && created.getMonth() === date.getMonth(); }).length };
  });
  const maxMonth = Math.max(1, ...months.map((month) => month.count));
  const maxCategory = Math.max(1, ...categories.map((item) => item.count));
  return <>
    <div className="analytics-note"><span className="note-mark" aria-hidden="true">i</span><span>Charts use the records returned by the API (up to 100). No status or historical data is inferred.</span></div>
    {loading ? <div className="analytics-grid"><div className="panel"><span className="skeleton skeleton--chart" /></div><div className="panel"><span className="skeleton skeleton--chart" /></div></div> : requirements.length === 0 && loadError ? <section className="panel"><EmptyState title="Analytics unavailable" text="Retry the connection to load your saved requirement data." /></section> : requirements.length === 0 ? <section className="panel"><EmptyState title="Analytics will appear here" text="Save requirements to see category and submission summaries." /></section> : <div className="analytics-grid">
      <section className="panel chart-panel"><div className="panel-heading"><div><h2>Submissions over time</h2><p>Saved records by month</p></div><span className="chart-legend"><i /> Requirements</span></div><div className="bar-chart" role="img" aria-label="Requirement submissions by month">{months.map((month) => <div className="chart-column" key={month.key}><strong>{month.count || ''}</strong><div className="chart-column__track"><span style={{ height: `${month.count ? Math.max(8, (month.count / maxMonth) * 100) : 0}%` }} /></div><span>{month.label}{month.year !== new Date().getFullYear() ? ` '${String(month.year).slice(-2)}` : ''}</span></div>)}</div></section>
      <section className="panel chart-panel"><div className="panel-heading"><div><h2>Requirements by category</h2><p>Category totals in returned records</p></div></div><div className="analytics-categories">{categories.map(({ category, count }) => <div className="analytics-category" key={category}><div className="category-bar-label"><span><i className={`category-dot category-dot--${CATEGORY_COLORS[category]}`} />{CATEGORY_LABELS[category]}</span><strong>{count} <small>{requirements.length ? `${Math.round((count / requirements.length) * 100)}%` : '0%'}</small></strong></div><div className="bar-track"><span className={`bar-fill bar-fill--${CATEGORY_COLORS[category]}`} style={{ width: `${(count / maxCategory) * 100}%` }} /></div></div>)}</div></section>
    </div>}
  </>;
}

function RequirementRow({ item, onSelect }) {
  return <article className="recent-row"><div className={`category-symbol category-symbol--${CATEGORY_COLORS[item.category] || 'blue'}`} aria-hidden="true">{(CATEGORY_LABELS[item.category] || 'R').slice(0, 1)}</div><div className="recent-row__main"><button className="link-button" onClick={() => onSelect(item._id)}>{item.eventName || 'Untitled event'}</button><span>{item.eventType || 'Event'} <i>·</i> {item.location || 'Location not set'}</span></div><CategoryTag category={item.category} /><div className="recent-row__date">{formatDate(item.startDate, { day: 'numeric', month: 'short' })}</div></article>;
}

function CategoryTag({ category }) {
  const tone = CATEGORY_COLORS[category] || 'blue';
  return <span className={`category-tag category-tag--${tone}`}>{CATEGORY_LABELS[category] || 'Uncategorized'}</span>;
}

function RequirementTable({ items, onSelect }) {
  return <table className="requirement-table"><thead><tr><th>Event</th><th>Category</th><th>Event date</th><th>Location</th><th>Submitted</th></tr></thead><tbody>{items.map((item) => <tr key={item._id}><td><button className="link-button" onClick={() => onSelect(item._id)}>{item.eventName || 'Untitled event'}</button><span className="table-subtitle">{item.eventType || 'Event'}</span></td><td><CategoryTag category={item.category} /></td><td>{formatDate(item.startDate)}</td><td>{item.location || '—'}</td><td>{formatDate(item.createdAt)}</td></tr>)}</tbody></table>;
}

function RequirementCard({ item, onSelect }) {
  return <article className="requirement-card"><div className="requirement-card__top"><CategoryTag category={item.category} /><span className="requirement-card__date">{formatDate(item.startDate, { day: 'numeric', month: 'short' })}</span></div><button className="link-button requirement-card__title" onClick={() => onSelect(item._id)}>{item.eventName || 'Untitled event'}</button><p>{item.eventType || 'Event'} <span>·</span> {item.location || 'Location not set'}</p><div className="requirement-card__bottom">Submitted {formatDate(item.createdAt)}</div></article>;
}

function RequirementDetailsDialog({ id, onClose }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const result = await getRequirement(id);
      setRecord(result?.data || null);
    } catch (requestError) {
      setError(requestError.message || 'Requirement details could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setRecord(null);
    load();
  }, [id, load]);

  useEffect(() => {
    if (!id) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function closeOnEscape(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [id, onClose]);

  if (!id) return null;
  const categoryKey = record?.category ? `${record.category}Details` : '';
  const detailValues = categoryKey ? record?.[categoryKey] || {} : {};
  const eventValues = record ? {
    eventName: record.eventName,
    eventType: record.eventType,
    startDate: record.dateMode === 'range' && record.endDate ? `${formatDate(record.startDate)} – ${formatDate(record.endDate)}` : formatDate(record.startDate),
    location: record.location,
    venue: record.venue,
    category: CATEGORY_LABELS[record.category] || record.category,
  } : {};

  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="detail-dialog" role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <div className="detail-dialog__head"><div><span className="eyebrow">REQUIREMENT DETAILS</span><h2 id="detail-title">{record?.eventName || 'Requirement'}</h2></div><button className="icon-button" aria-label="Close details" onClick={onClose}>×</button></div>
      <div className="detail-dialog__body">
        {loading && <div className="detail-loading" role="status"><span className="spinner" /> Loading saved details…</div>}
        {!loading && error && <div className="detail-error" role="alert"><p>{error}</p><button className="btn btn--quiet" onClick={load}>Retry</button></div>}
        {!loading && record && <>
          <DetailSection title="Event information" values={eventValues} />
          {Object.keys(detailValues).length > 0 && <DetailSection title={`${CATEGORY_LABELS[record.category] || 'Category'} requirements`} values={detailValues} />}
          {record.additionalNotes && <DetailSection title="Additional notes" values={{ additionalNotes: record.additionalNotes }} />}
          <div className="detail-metadata"><span>Submitted {formatDate(record.createdAt)}</span><span className="detail-id">ID {record._id}</span></div>
        </>}
      </div>
      <div className="detail-dialog__foot"><button className="btn btn--quiet" onClick={onClose}>Close</button></div>
    </section>
  </div>;
}

function DetailSection({ title, values }) {
  const rows = Object.entries(values).filter(([, value]) => value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length > 0));
  if (!rows.length) return null;
  return <section className="detail-section"><h3>{title}</h3><dl>{rows.map(([key, value]) => <div className="detail-row" key={key}><dt>{key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())}</dt><dd>{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : Array.isArray(value) ? value.join(', ') : String(value)}</dd></div>)}</dl></section>;
}

function LoadingRows() {
  return <div className="loading-rows" aria-label="Loading requirements">{[1, 2, 3].map((item) => <div className="loading-row" key={item}><span className="skeleton skeleton--avatar" /><span className="skeleton skeleton--line" /><span className="skeleton skeleton--short" /></div>)}</div>;
}

function EmptyState({ title, text, action, onAction }) {
  return <div className="empty-state"><div className="empty-symbol" aria-hidden="true">+</div><h3>{title}</h3><p>{text}</p>{action && <button className="btn btn--quiet" onClick={onAction}>{action} <span aria-hidden="true">→</span></button>}</div>;
}
