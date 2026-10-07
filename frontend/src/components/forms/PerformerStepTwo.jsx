'use client';

import { TextField, NumberField, SelectField, TextareaField } from '../Fields';
import { useStepValidation } from './stepHelpers';

const TYPES = [
  { value: 'band', label: 'Live band' },
  { value: 'dj', label: 'DJ' },
  { value: 'solo', label: 'Solo artist' },
  { value: 'comedy', label: 'Comedian' },
  { value: 'dance', label: 'Dance troupe' },
  { value: 'speaker', label: 'Speaker / host' },
  { value: 'other', label: 'Other' },
];

export default function PerformerStepTwo({ form, serverErrors, update, next, back }) {
  const details = form.categoryDetails;

  const { errors, handleNext } = useStepValidation(() => {
    const errs = {};
    if (!details.performanceType) errs.performanceType = 'Select a performance type.';
    if (!details.genre?.trim()) errs.genre = 'Genre is required.';
    if (!details.performerCount || Number(details.performerCount) < 1) {
      errs.performerCount = 'Number of performers must be at least 1.';
    }
    if (!details.durationMins || Number(details.durationMins) < 5) {
      errs.durationMins = 'Duration must be at least 5 minutes.';
    }
    if (
      details.budgetMin !== '' && details.budgetMin !== undefined &&
      details.budgetMax !== '' && details.budgetMax !== undefined &&
      Number(details.budgetMax) < Number(details.budgetMin)
    ) {
      errs.budgetMax = 'Max budget cannot be less than min budget.';
    }
    return errs;
  });

  const err = (k) => serverErrors?.[k] || errors[k];

  return (
    <form onSubmit={(e) => handleNext(e, next)} noValidate>
      <h2 className="card__title">Step 2 — Performance Requirements</h2>
      <p className="card__subtitle">What kind of act are you looking for?</p>

      <div className="field__row">
        <SelectField
          label="Performance type"
          name="performanceType"
          value={details.performanceType}
          onChange={update}
          error={err('performanceType')}
          options={TYPES}
          placeholder="Choose a type…"
        />
        <TextField
          label="Genre"
          name="genre"
          value={details.genre}
          onChange={update}
          error={err('genre')}
          placeholder="e.g. Bollywood, EDM, stand-up"
        />
      </div>

      <div className="field__row">
        <NumberField
          label="Number of performers"
          name="performerCount"
          value={details.performerCount}
          onChange={update}
          error={err('performerCount')}
          min={1}
          placeholder="e.g. 4"
        />
        <NumberField
          label="Performance duration (minutes)"
          name="durationMins"
          value={details.durationMins}
          onChange={update}
          error={err('durationMins')}
          min={5}
          placeholder="e.g. 90"
        />
      </div>

      <div className="field__row">
        <NumberField
          label="Minimum budget (₹)"
          name="budgetMin"
          value={details.budgetMin}
          onChange={update}
          error={err('budgetMin')}
          min={0}
          placeholder="e.g. 30000"
        />
        <NumberField
          label="Maximum budget (₹)"
          name="budgetMax"
          value={details.budgetMax}
          onChange={update}
          error={err('budgetMax')}
          min={0}
          placeholder="e.g. 100000"
        />
      </div>

      <TextareaField
        label="Performance requirements"
        name="performanceRequirements"
        value={details.performanceRequirements}
        onChange={update}
        optional
        placeholder="e.g. Two 45-minute sets, want crowd interaction"
      />

      <div className="form__actions">
        <button type="button" className="btn btn--secondary" onClick={back}>← Back</button>
        <button type="submit" className="btn">Next →</button>
      </div>
    </form>
  );
}
