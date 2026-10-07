'use client';

import { CheckboxGroup, RadioGroup, TextareaField } from '../Fields';
import { useStepValidation } from './stepHelpers';

const yesNo = [
  { value: true, label: 'Yes' },
  { value: false, label: 'No' },
];

export default function CrewStepThree({ form, update, updateNotes, next, back }) {
  const details = form.categoryDetails;
  const { errors, handleNext } = useStepValidation(() => ({})); // all optional

  return (
    <form onSubmit={(e) => handleNext(e, next)} noValidate>
      <h2 className="card__title">Step 3 — Working Conditions</h2>
      <p className="card__subtitle">What does the crew need on site?</p>

      <CheckboxGroup
        label="Equipment the crew will handle"
        name="equipmentRequired"
        options={[
          { value: 'pa-system', label: 'PA / sound system' },
          { value: 'lights', label: 'Lighting rig' },
          { value: 'truss', label: 'Truss & staging' },
          { value: 'power', label: 'Power distribution' },
          { value: 'tools', label: 'Hand tools' },
        ]}
        selected={details.equipmentRequired}
        onChange={update}
      />

      <div className="field__row">
        <RadioGroup label="Setup required?" name="setupRequired" value={details.setupRequired} onChange={update} options={yesNo} />
        <RadioGroup label="Breakdown required?" name="breakdownRequired" value={details.breakdownRequired} onChange={update} options={yesNo} />
        <RadioGroup label="Travel required?" name="travelRequired" value={details.travelRequired} onChange={update} options={yesNo} />
      </div>

      <TextareaField
        label="Technical requirements"
        name="technicalRequirements"
        value={details.technicalRequirements}
        onChange={update}
        optional
        placeholder="e.g. Certified riggers only, 3-phase power"
      />

      <TextareaField
        label="Additional notes"
        name="additionalNotes"
        value={form.additionalNotes}
        onChange={updateNotes}
        optional
        placeholder="Anything else the crew lead should know?"
      />

      <div className="form__actions">
        <button type="button" className="btn btn--secondary" onClick={back}>← Back</button>
        <button type="submit" className="btn">Next →</button>
      </div>
    </form>
  );
}
