'use client';

import { useState } from 'react';

import { TextField, SelectField, RadioGroup } from '../Fields';

const EVENT_TYPES = [
  { value: 'Wedding', label: 'Wedding' },
  { value: 'Corporate', label: 'Corporate Event' },
  { value: 'Concert', label: 'Concert / Live Show' },
  { value: 'Birthday', label: 'Birthday Party' },
  { value: 'College Event', label: 'College Event' },
  { value: 'Festival', label: 'Festival' },
  { value: 'Private Event', label: 'Private Event' },
  { value: 'Other', label: 'Other' },
];

const CATEGORIES = [
  { value: 'planner', label: 'Event Planner' },
  { value: 'performer', label: 'Performer' },
  { value: 'crew', label: 'Crew' },
];

const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));

const MIN_NAME_LENGTH = 3;

export default function EventBasicsStep({ form, errors, update, next }) {
  const [localErrors, setLocalErrors] = useState({});

  const isMultiDay = form.dateMode === 'range';

  function handleDateModeChange(patch) {
    // Switching to a single-day event clears any stale end date
    if (patch.dateMode === 'single') update({ dateMode: 'single', endDate: '' });
    else update(patch);
  }

  function handleNext(e) {
    e.preventDefault();
    const errs = {};

    const name = (form.eventName || '').trim();
    if (!name) errs.eventName = 'Event name is required.';
    else if (name.length < MIN_NAME_LENGTH)
      errs.eventName = `Event name must be at least ${MIN_NAME_LENGTH} characters.`;

    if (!form.eventType) errs.eventType = 'Event type is required.';
    if (!form.startDate) errs.startDate = 'Start date is required.';
    if (isMultiDay && !form.endDate) errs.endDate = 'End date is required for a multi-day event.';
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      errs.endDate = 'End date cannot be before the start date.';
    }
    if (!(form.location || '').trim()) errs.location = 'Location is required.';
    if (!form.category) errs.category = 'Choose a category to continue.';

    setLocalErrors(errs);
    if (Object.keys(errs).length === 0) next();
  }

  return (
    <form onSubmit={handleNext} noValidate>
      <h2 className="card__title">Step 1 — Event Basics</h2>
      <p className="card__subtitle">Tell us the core details of your event.</p>

      <TextField
        label="Event name"
        name="eventName"
        value={form.eventName}
        onChange={update}
        error={errors.eventName || localErrors.eventName}
        placeholder="e.g. Sharma Wedding Reception"
        autoFocus
      />

      <div className="field__row">
        <SelectField
          label="Event type"
          name="eventType"
          value={form.eventType}
          onChange={update}
          error={errors.eventType || localErrors.eventType}
          options={EVENT_TYPES}
          placeholder="Choose a type…"
        />
        <TextField
          label="Location"
          name="location"
          value={form.location}
          onChange={update}
          error={errors.location || localErrors.location}
          placeholder="City or area"
        />
      </div>

      <div className="field">
        <span className="field__label">Event dates</span>
        <div className="field__row" role="radiogroup" aria-label="Event duration">
          <label className={`choice ${!isMultiDay ? 'choice--checked' : ''}`}>
            <input
              type="radio"
              name="dateMode"
              checked={!isMultiDay}
              onChange={() => handleDateModeChange({ dateMode: 'single' })}
            />
            One day
          </label>
          <label className={`choice ${isMultiDay ? 'choice--checked' : ''}`}>
            <input
              type="radio"
              name="dateMode"
              checked={isMultiDay}
              onChange={() => handleDateModeChange({ dateMode: 'range' })}
            />
            Multiple days
          </label>
        </div>
      </div>

      <div className="field__row">
        <TextField
          label="Start date"
          name="startDate"
          type="date"
          value={form.startDate}
          onChange={update}
          error={errors.startDate || localErrors.startDate}
        />
        {isMultiDay && (
          <TextField
            label="End date"
            name="endDate"
            type="date"
            value={form.endDate}
            onChange={update}
            error={errors.endDate || localErrors.endDate}
          />
        )}
      </div>

      <TextField
        label="Venue"
        name="venue"
        value={form.venue}
        onChange={update}
        error={errors.venue}
        optional
        placeholder="e.g. Grand Hyatt Ballroom"
      />

      <RadioGroup
        label="What do you need?"
        name="category"
        value={form.category}
        onChange={update}
        error={errors.category || localErrors.category}
        options={CATEGORIES}
      />

      {/* Persistent reminder so the user always sees the active category */}
      {form.category && (
        <p className="category-pill" role="status">
          Selected category: <strong>{CATEGORY_LABELS[form.category]}</strong> — Steps 2 and 3 will
          adapt to it.
        </p>
      )}

      <div className="form__actions form__actions--start">
        <button type="submit" className="btn">Next →</button>
      </div>
    </form>
  );
}
