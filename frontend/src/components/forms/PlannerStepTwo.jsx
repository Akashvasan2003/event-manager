'use client';

import { TextField, NumberField, SelectField, CheckboxGroup } from '../Fields';
import { useStepValidation } from './stepHelpers';

const SCOPES = [
  { value: 'full', label: 'Full planning (concept to execution)' },
  { value: 'partial', label: 'Partial planning (specific areas)' },
  { value: 'day-of', label: 'Day-of coordination only' },
];

const SERVICES = [
  { value: 'venue-sourcing', label: 'Venue sourcing' },
  { value: 'catering', label: 'Catering arrangement' },
  { value: 'decor', label: 'Decor & styling' },
  { value: 'photography', label: 'Photography & videography' },
  { value: 'entertainment', label: 'Entertainment booking' },
  { value: 'logistics', label: 'Logistics & transport' },
  { value: 'invitations', label: 'Invitations & RSVP management' },
];

export default function PlannerStepTwo({ form, serverErrors, update, next, back }) {
  const details = form.categoryDetails;

  const { errors, handleNext } = useStepValidation(() => {
    const errs = {};
    if (!details.planningScope) errs.planningScope = 'Select a planning scope.';
    if (!details.guestCount || Number(details.guestCount) < 1) {
      errs.guestCount = 'Guest count must be at least 1.';
    }
    if (details.budgetMin === '' || details.budgetMin === undefined) {
      errs.budgetMin = 'Minimum budget is required.';
    }
    if (
      details.budgetMin !== '' && details.budgetMin !== undefined &&
      details.budgetMax !== '' && details.budgetMax !== undefined &&
      Number(details.budgetMax) < Number(details.budgetMin)
    ) {
      errs.budgetMax = 'Max budget cannot be less than min budget.';
    }
    if (!details.servicesRequired || details.servicesRequired.length === 0) {
      errs.servicesRequired = 'Select at least one service.';
    }
    return errs;
  });

  const err = (k) => serverErrors?.[k] || errors[k];

  return (
    <form onSubmit={(e) => handleNext(e, next)} noValidate>
      <h2 className="card__title">Step 2 — Planning Requirements</h2>
      <p className="card__subtitle">Tell us what kind of planning you need.</p>

      <SelectField
        label="Planning scope"
        name="planningScope"
        value={details.planningScope}
        onChange={update}
        error={err('planningScope')}
        options={SCOPES}
        placeholder="How much do you need planned?"
      />

      <div className="field__row">
        <NumberField
          label="Expected guest count"
          name="guestCount"
          value={details.guestCount}
          onChange={update}
          error={err('guestCount')}
          min={1}
          placeholder="e.g. 150"
        />
        <NumberField
          label="Minimum budget (₹)"
          name="budgetMin"
          value={details.budgetMin}
          onChange={update}
          error={err('budgetMin')}
          min={0}
          placeholder="e.g. 100000"
        />
        <NumberField
          label="Maximum budget (₹)"
          name="budgetMax"
          value={details.budgetMax}
          onChange={update}
          error={err('budgetMax')}
          min={0}
          placeholder="e.g. 500000"
        />
      </div>

      <CheckboxGroup
        label="Planning services required"
        name="servicesRequired"
        options={SERVICES}
        selected={details.servicesRequired}
        onChange={update}
        error={err('servicesRequired')}
      />

      <TextField
        label="Event theme / style"
        name="themeStyle"
        value={details.themeStyle}
        onChange={update}
        error={err('themeStyle')}
        optional
        placeholder="e.g. Rustic outdoor, minimalist modern"
      />

      <TextField
        label="Special requirements"
        name="specialRequirements"
        value={details.specialRequirements}
        onChange={update}
        error={err('specialRequirements')}
        optional
        placeholder="e.g. Vegetarian catering only, wheelchair access"
      />

      <div className="form__actions">
        <button type="button" className="btn btn--secondary" onClick={back}>← Back</button>
        <button type="submit" className="btn">Next →</button>
      </div>
    </form>
  );
}
