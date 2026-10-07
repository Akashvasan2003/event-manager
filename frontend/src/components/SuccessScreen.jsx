'use client';

const CATEGORY_LABELS = {
  planner: 'Event Planner',
  performer: 'Performer',
  crew: 'Crew',
};

export default function SuccessScreen({ requirement, onNew }) {
  const basics = requirement || {};  // response is the flat requirement document
  const categoryLabel = CATEGORY_LABELS[basics.category] || '—';

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div className="success__icon" aria-hidden="true">✅</div>
      <h2>Requirement submitted successfully</h2>
      <p style={{ color: 'var(--muted)', margin: '0.5rem 0 1.25rem' }}>
        Your requirement has been saved and categorized. We&apos;ll be in touch with matches.
      </p>

      <dl className="success__details">
        <div className="success__row">
          <dt>Event name</dt>
          <dd>{basics.eventName || '—'}</dd>
        </div>
        <div className="success__row">
          <dt>Category</dt>
          <dd>{categoryLabel}</dd>
        </div>
        <div className="success__row">
          <dt>Submission ID</dt>
          <dd className="success__id">{requirement._id}</dd>
        </div>
      </dl>

      <button className="btn" onClick={onNew}>
        Post another requirement
      </button>
    </div>
  );
}

