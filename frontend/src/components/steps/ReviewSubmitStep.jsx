'use client';

import { TextareaField } from '../Fields';

const CATEGORY_LABELS = {
  planner: 'Event Planner',
  performer: 'Performer',
  crew: 'Crew',
};

const BOOL_LABEL = { true: 'Yes', false: 'No' };

function Row({ label, value }) {
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
    return null;
  }
  const display =
    typeof value === 'boolean' ? BOOL_LABEL[value] : Array.isArray(value) ? value.join(', ') : String(value);
  return (
    <div style={{ display: 'flex', gap: '0.75rem', padding: '0.35rem 0', borderBottom: '1px solid var(--border)' }}>
      <strong style={{ minWidth: '180px', fontSize: '0.9rem' }}>{label}</strong>
      <span style={{ fontSize: '0.9rem' }}>{display}</span>
    </div>
  );
}

function Section({ title, onEdit, children }) {
  return (
    <section className="review-section">
      <div className="review-section__head">
        <h3>{title}</h3>
        <button type="button" className="btn btn--secondary btn--small" onClick={onEdit}>
          Edit
        </button>
      </div>
      {children}
    </section>
  );
}

export default function ReviewSubmitStep({ form, updateNotes, back, goto, submitting, onSubmit }) {
  const basics = form.eventBasics;
  const details = form.categoryDetails;
  const categoryLabel = CATEGORY_LABELS[basics.category] || '—';
  const budget =
    details.budgetMin || details.budgetMax
      ? `₹${details.budgetMin || 0} – ₹${details.budgetMax || details.budgetMin || 0}`
      : '';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <h2 style={{ marginBottom: '1rem' }}>Step 4 — Review & Submit</h2>
      <p style={{ color: 'var(--muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
        Confirm everything looks right, then submit. This will be saved as a{' '}
        <strong>{categoryLabel.toLowerCase()}</strong> requirement.
      </p>

      <Section title="Event information" onEdit={() => goto(1)}>
        <Row label="Event name" value={basics.eventName} />
        <Row label="Event type" value={basics.eventType} />
        <Row
          label="Event dates"
          value={
            basics.startDate
              ? basics.dateMode === 'range' && basics.endDate
                ? `${basics.startDate} → ${basics.endDate}`
                : basics.startDate
              : ''
          }
        />
        <Row label="Location" value={basics.location} />
        <Row label="Venue" value={basics.venue} />
        <Row label="Category" value={categoryLabel} />
      </Section>

      {basics.category === 'planner' && (
        <Section title="Planner requirements" onEdit={() => goto(2)}>
          <Row label="Planning scope" value={details.planningScope} />
          <Row label="Guest count" value={details.guestCount} />
          <Row label="Budget" value={budget} />
          <Row label="Services required" value={details.servicesRequired} />
          <Row label="Theme / style" value={details.themeStyle} />
          <Row label="Special requirements" value={details.specialRequirements} />
          <Row label="Planning timeline" value={details.planningTimeline} />
          <Row label="Coordinators" value={details.coordinatorsNeeded} />
          <Row label="Vendor coordination" value={details.vendorCoordination} />
          <Row label="On-site coordination" value={details.onSiteCoordination} />
        </Section>
      )}

      {basics.category === 'performer' && (
        <Section title="Performer requirements" onEdit={() => goto(2)}>
          <Row label="Performance type" value={details.performanceType} />
          <Row label="Genre" value={details.genre} />
          <Row label="Performers" value={details.performerCount} />
          <Row label="Duration (mins)" value={details.durationMins} />
          <Row label="Budget" value={budget} />
          <Row label="Requirements" value={details.performanceRequirements} />
          <Row label="Sound system" value={details.soundSystemRequired} />
          <Row label="Lighting" value={details.lightingRequired} />
          <Row label="Stage" value={details.stageRequired} />
          <Row label="Travel" value={details.travelRequired} />
          <Row label="Accommodation" value={details.accommodationRequired} />
          <Row label="Special requests" value={details.specialRequests} />
        </Section>
      )}

      {basics.category === 'crew' && (
        <Section title="Crew requirements" onEdit={() => goto(2)}>
          <Row label="Crew roles" value={details.crewRole} />
          <Row label="Crew count" value={details.crewCount} />
          <Row label="Experience level" value={details.experienceLevel} />
          <Row label="Working hours" value={details.workingHours} />
          <Row label="Hourly rate" value={details.hourlyRate} />
          <Row label="Responsibilities" value={details.responsibilities} />
          <Row label="Equipment" value={details.equipmentRequired} />
          <Row label="Setup" value={details.setupRequired} />
          <Row label="Breakdown" value={details.breakdownRequired} />
          <Row label="Travel" value={details.travelRequired} />
          <Row label="Technical requirements" value={details.technicalRequirements} />
        </Section>
      )}

      <TextareaField
        label="Additional notes"
        name="additionalNotes"
        value={form.additionalNotes}
        onChange={updateNotes}
        optional
        placeholder="Anything else we should know?"
      />

      <div className="form__actions">
        <button type="button" className="btn btn--secondary" onClick={back} disabled={submitting}>
          ← Back
        </button>
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit requirement'}
        </button>
      </div>
    </form>
  );
}
