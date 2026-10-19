'use client';

const CATEGORY_LABELS = { planner: 'Event Planner', performer: 'Performer', crew: 'Crew' };

export default function SuccessScreen({ requirement, onNew, onDashboard }) {
  const record = requirement || {};

  return <section className="success-panel">
    <div className="success-check" aria-hidden="true">✓</div>
    <div className="eyebrow">REQUEST SAVED</div>
    <h2>Requirement submitted</h2>
    <p className="success-copy">Your event requirement has been saved to the workspace.</p>
    <dl className="success__details">
      <div className="success__row"><dt>Event</dt><dd>{record.eventName || '—'}</dd></div>
      <div className="success__row"><dt>Category</dt><dd>{CATEGORY_LABELS[record.category] || '—'}</dd></div>
      <div className="success__row"><dt>Submission ID</dt><dd className="success__id">{record._id || '—'}</dd></div>
    </dl>
    <div className="success-actions">
      <button className="btn btn--quiet" onClick={onDashboard}>Back to overview</button>
      <button className="btn btn--primary" onClick={onNew}>Post another requirement</button>
    </div>
  </section>;
}
