'use client';

import { RadioGroup, TextareaField } from '../Fields';
import { useStepValidation } from './stepHelpers';

const yesNo = [
  { value: true, label: 'Yes' },
  { value: false, label: 'No' },
];

export default function PerformerStepThree({ form, serverErrors, update, updateNotes, next, back }) {
  const details = form.categoryDetails;
  const { errors, handleNext } = useStepValidation(() => ({})); // all optional

  return (
    <form onSubmit={(e) => handleNext(e, next)} noValidate>
      <h2 className="card__title">Step 3 — Technical & Logistics</h2>
      <p className="card__subtitle">What should the venue provide?</p>

      <RadioGroup label="Sound system required?" name="soundSystemRequired" value={details.soundSystemRequired} onChange={update} options={yesNo} />
      <RadioGroup label="Lighting required?" name="lightingRequired" value={details.lightingRequired} onChange={update} options={yesNo} />
      <RadioGroup label="Stage required?" name="stageRequired" value={details.stageRequired} onChange={update} options={yesNo} />
      <RadioGroup label="Travel arrangement required?" name="travelRequired" value={details.travelRequired} onChange={update} options={yesNo} />
      <RadioGroup label="Accommodation required?" name="accommodationRequired" value={details.accommodationRequired} onChange={update} options={yesNo} />

      <TextareaField
        label="Special requests"
        name="specialRequests"
        value={details.specialRequests}
        onChange={update}
        optional
        placeholder="e.g. Green room, early soundcheck at 4 PM"
      />

      <TextareaField
        label="Additional notes"
        name="additionalNotes"
        value={form.additionalNotes}
        onChange={updateNotes}
        optional
        placeholder="Anything else we should know?"
      />

      <div className="form__actions">
        <button type="button" className="btn btn--secondary" onClick={back}>← Back</button>
        <button type="submit" className="btn">Next →</button>
      </div>
    </form>
  );
}
