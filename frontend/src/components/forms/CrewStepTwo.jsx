'use client';

import { CheckboxGroup, NumberField, SelectField, TextareaField } from '../Fields';
import { useStepValidation } from './stepHelpers';

const ROLES = [
  { value: 'stage-setup', label: 'Stage setup' },
  { value: 'sound-engineer', label: 'Sound engineer' },
  { value: 'lighting-operator', label: 'Lighting operator' },
  { value: 'runner', label: 'Runner / stagehand' },
  { value: 'security', label: 'Security' },
  { value: 'registration', label: 'Registration desk' },
];

const EXPERIENCE = [
  { value: 'any', label: 'Any experience' },
  { value: 'junior', label: 'Junior (0–2 years)' },
  { value: 'mid', label: 'Mid-level (2–5 years)' },
  { value: 'senior', label: 'Senior (5+ years)' },
];

export default function CrewStepTwo({ form, serverErrors, update, next, back }) {
  const details = form.categoryDetails;

  const { errors, handleNext } = useStepValidation(() => {
    const errs = {};
    if (!details.crewRole || details.crewRole.length === 0) {
      errs.crewRole = 'Select at least one crew role.';
    }
    if (!details.crewCount || Number(details.crewCount) < 1) {
      errs.crewCount = 'Crew count must be at least 1.';
    }
    if (!details.experienceLevel) errs.experienceLevel = 'Select required experience.';
    if (!details.workingHours || Number(details.workingHours) < 1 || Number(details.workingHours) > 24) {
      errs.workingHours = 'Working hours must be between 1 and 24.';
    }
    return errs;
  });

  const err = (k) => serverErrors?.[k] || errors[k];

  return (
    <form onSubmit={(e) => handleNext(e, next)} noValidate>
      <h2 className="card__title">Step 2 — Crew Requirements</h2>
      <p className="card__subtitle">Who do you need on the ground?</p>

      <CheckboxGroup
        label="Crew roles required"
        name="crewRole"
        options={ROLES}
        selected={details.crewRole}
        onChange={update}
        error={err('crewRole')}
      />

      <div className="field__row">
        <NumberField
          label="Number of crew members"
          name="crewCount"
          value={details.crewCount}
          onChange={update}
          error={err('crewCount')}
          min={1}
          placeholder="e.g. 6"
        />
        <NumberField
          label="Working hours (per shift)"
          name="workingHours"
          value={details.workingHours}
          onChange={update}
          error={err('workingHours')}
          min={1}
          max={24}
          placeholder="e.g. 8"
        />
      </div>

      <div className="field__row">
        <SelectField
          label="Required experience"
          name="experienceLevel"
          value={details.experienceLevel}
          onChange={update}
          error={err('experienceLevel')}
          options={EXPERIENCE}
          placeholder="How experienced?"
        />
        <NumberField
          label="Budget / hourly rate (₹)"
          name="hourlyRate"
          value={details.hourlyRate}
          onChange={update}
          error={err('hourlyRate')}
          optional
          min={0}
          placeholder="e.g. 500"
        />
      </div>

      <TextareaField
        label="Responsibilities"
        name="responsibilities"
        value={details.responsibilities}
        onChange={update}
        optional
        placeholder="e.g. Manage entry gates, assist performers"
      />

      <div className="form__actions">
        <button type="button" className="btn btn--secondary" onClick={back}>← Back</button>
        <button type="submit" className="btn">Next →</button>
      </div>
    </form>
  );
}
