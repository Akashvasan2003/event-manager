'use client';

import { NumberField, SelectField, RadioGroup, TextareaField } from '../Fields';
import { useStepValidation } from './stepHelpers';

const TIMELINES = [
  { value: 'under-1-month', label: 'Less than 1 month' },
  { value: '1-3-months', label: '1–3 months' },
  { value: '3-6-months', label: '3–6 months' },
  { value: '6-plus-months', label: 'More than 6 months' },
];

export default function PlannerStepThree({ form, serverErrors, update, updateNotes, next, back }) {
  const details = form.categoryDetails;

  const { errors, handleNext } = useStepValidation(() => {
    const errs = {};
    if (!details.planningTimeline) errs.planningTimeline = 'Select a planning timeline.';
    if (details.coordinatorsNeeded === undefined || details.coordinatorsNeeded === '' ||
      Number(details.coordinatorsNeeded) < 0) {
      errs.coordinatorsNeeded = 'Number of coordinators is required (0 or more).';
    }
    return errs;
  });

  const err = (k) => serverErrors?.[k] || errors[k];

  const boolOptions = (name) => [
    { value: true, label: 'Yes' },
    { value: false, label: 'No' },
  ];

  return (
    <form onSubmit={(e) => handleNext(e, next)} noValidate>
      <h2 className="card__title">Step 3 — Coordination Details</h2>
      <p className="card__subtitle">How should the planning be staffed and timed?</p>

      <SelectField
        label="Planning timeline"
        name="planningTimeline"
        value={details.planningTimeline}
        onChange={update}
        error={err('planningTimeline')}
        options={TIMELINES}
        placeholder="How far out is the event?"
      />

      <NumberField
        label="Number of coordinators required"
        name="coordinatorsNeeded"
        value={details.coordinatorsNeeded}
        onChange={update}
        error={err('coordinatorsNeeded')}
        min={0}
        placeholder="e.g. 2"
      />

      <RadioGroup
        label="Vendor coordination required?"
        name="vendorCoordination"
        value={details.vendorCoordination}
        onChange={update}
        options={boolOptions('vendorCoordination')}
      />

      <RadioGroup
        label="On-site coordination required?"
        name="onSiteCoordination"
        value={details.onSiteCoordination}
        onChange={update}
        options={boolOptions('onSiteCoordination')}
      />

      <TextareaField
        label="Additional notes"
        name="additionalNotes"
        value={form.additionalNotes}
        onChange={updateNotes}
        optional
        placeholder="Anything else the planner should know?"
      />

      <div className="form__actions">
        <button type="button" className="btn btn--secondary" onClick={back}>← Back</button>
        <button type="submit" className="btn">Next →</button>
      </div>
    </form>
  );
}
