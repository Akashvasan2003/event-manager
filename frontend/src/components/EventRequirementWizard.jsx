'use client';

import { useCallback, useState } from 'react';
import Stepper from './Stepper';
import EventBasicsStep from './steps/EventBasicsStep';
import PlannerStepTwo from './forms/PlannerStepTwo';
import PlannerStepThree from './forms/PlannerStepThree';
import PerformerStepTwo from './forms/PerformerStepTwo';
import PerformerStepThree from './forms/PerformerStepThree';
import CrewStepTwo from './forms/CrewStepTwo';
import CrewStepThree from './forms/CrewStepThree';
import ReviewSubmitStep from './steps/ReviewSubmitStep';
import SuccessScreen from './SuccessScreen';
import { createRequirement } from '../services/requirementApi';

const STEP2_COMPONENTS = { planner: PlannerStepTwo, performer: PerformerStepTwo, crew: CrewStepTwo };
const STEP3_COMPONENTS = { planner: PlannerStepThree, performer: PerformerStepThree, crew: CrewStepThree };
const STEPS = ['Event basics', 'Requirements', 'Details', 'Review'];

function emptyForm() {
  return { eventBasics: { category: '', dateMode: 'single' }, categoryDetails: {}, additionalNotes: '' };
}

export default function EventRequirementWizard({ onComplete, onCancel }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [serverErrors, setServerErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [saved, setSaved] = useState(null);

  const updateBasics = useCallback((patch) => {
    setForm((current) => ({
      ...current,
      eventBasics: { ...current.eventBasics, ...patch },
      categoryDetails: patch.category !== undefined && patch.category !== current.eventBasics.category ? {} : current.categoryDetails,
    }));
  }, []);

  const updateDetails = useCallback((patch) => {
    setForm((current) => ({ ...current, categoryDetails: { ...current.categoryDetails, ...patch } }));
  }, []);

  const updateNotes = useCallback((patch) => {
    if ('additionalNotes' in patch) setForm((current) => ({ ...current, additionalNotes: patch.additionalNotes }));
  }, []);

  const next = () => setStep((current) => Math.min(4, current + 1));
  const back = () => setStep((current) => Math.max(1, current - 1));

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError('');
    setServerErrors({});
    try {
      const result = await createRequirement(form);
      setSaved(result.data);
    } catch (error) {
      const messages = error.response?.data?.errors;
      setSubmitError(Array.isArray(messages) ? messages.join(' ') : error.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function startAnother() {
    setSaved(null);
    setStep(1);
    setForm(emptyForm());
    setSubmitError('');
  }

  if (saved) return <div className="wizard-wrap"><SuccessScreen requirement={saved} onNew={startAnother} onDashboard={() => onComplete?.(saved)} /></div>;

  return <div className="wizard-wrap">
    <div className="wizard-toolbar"><div><span className="wizard-overline">NEW REQUEST</span><h2>Tell us what your event needs</h2><p>Your details stay in the form as you move between steps.</p></div><button className="btn btn--quiet" onClick={onCancel}>Exit form</button></div>
    <Stepper steps={STEPS} current={step} />
    <section className="wizard-panel" aria-label={`Step ${step} of 4`}>
      <div className="wizard-panel__head"><span>STEP {String(step).padStart(2, '0')} <i>/</i> 04</span><span>{STEPS[step - 1]}</span></div>
      {submitError && <div className="notice notice--error" role="alert"><div><strong>We couldn&apos;t submit this requirement</strong><span>{submitError}</span></div></div>}
      {step === 1 && <EventBasicsStep form={form.eventBasics} errors={serverErrors} update={updateBasics} next={next} />}
      {step === 2 && <CategoryStep components={STEP2_COMPONENTS} form={form} serverErrors={serverErrors} updateDetails={updateDetails} updateNotes={updateNotes} next={next} back={back} goToStep={setStep} />}
      {step === 3 && <CategoryStep components={STEP3_COMPONENTS} form={form} serverErrors={serverErrors} updateDetails={updateDetails} updateNotes={updateNotes} next={next} back={back} goToStep={setStep} />}
      {step === 4 && <ReviewSubmitStep form={form} updateNotes={updateNotes} back={back} goto={setStep} submitting={submitting} onSubmit={handleSubmit} />}
    </section>
    <p className="wizard-privacy"><span aria-hidden="true">✓</span> Your request is submitted directly to the GoPratle event workspace.</p>
  </div>;
}

function CategoryStep({ components, form, serverErrors, updateDetails, updateNotes, next, back, goToStep }) {
  const StepComponent = components[form.eventBasics.category];
  if (!StepComponent) return <div className="notice notice--error" role="alert"><div><strong>Choose a category first</strong><span>Select Event Planner, Performer, or Crew in event basics.</span></div><button type="button" className="btn btn--quiet" onClick={() => goToStep(1)}>Back to event basics</button></div>;
  return <StepComponent form={form} serverErrors={serverErrors} update={updateDetails} updateNotes={updateNotes} next={next} back={back} />;
}
