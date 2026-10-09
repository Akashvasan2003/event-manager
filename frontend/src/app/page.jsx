'use client';

import { useCallback, useState } from 'react';

import Stepper from '../components/Stepper';
import EventBasicsStep from '../components/steps/EventBasicsStep';
import PlannerStepTwo from '../components/forms/PlannerStepTwo';
import PlannerStepThree from '../components/forms/PlannerStepThree';
import PerformerStepTwo from '../components/forms/PerformerStepTwo';
import PerformerStepThree from '../components/forms/PerformerStepThree';
import CrewStepTwo from '../components/forms/CrewStepTwo';
import CrewStepThree from '../components/forms/CrewStepThree';
import ReviewSubmitStep from '../components/steps/ReviewSubmitStep';
import SuccessScreen from '../components/SuccessScreen';
import { createRequirement } from '../services/requirementApi';

const STEP2_COMPONENTS = {
  planner: PlannerStepTwo,
  performer: PerformerStepTwo,
  crew: CrewStepTwo,
};

const STEP3_COMPONENTS = {
  planner: PlannerStepThree,
  performer: PerformerStepThree,
  crew: CrewStepThree,
};

const STEPS = ['Event Basics', 'Requirements', 'Details', 'Review'];
// The API returns human-readable validation messages like "Planning scope is
// required." Map each message's leading label back to the wizard field so the
// error can render beside the relevant input (serverErrors[field]).
const FIELD_BY_LABEL = {
  'Event name': 'eventName',
  'Event type': 'eventType',
  'Location': 'location',
  'Venue': 'venue',
  'Start date': 'startDate',
  'End date': 'endDate',
  'Category': 'category',
  'Planning scope': 'planningScope',
  'Expected guest count': 'guestCount',
  'Minimum budget': 'budgetMin',
  'Maximum budget': 'budgetMax',
  'Planning services required': 'servicesRequired',
  'Event theme / style': 'themeStyle',
  'Planning timeline': 'planningTimeline',
  'Coordinators required': 'coordinatorsNeeded',
  'Performance type': 'performanceType',
  'Genre': 'genre',
  'Number of performers': 'performerCount',
  'Performance duration (minutes)': 'durationMins',
  'Crew roles required': 'crewRole',
  'Number of crew members': 'crewCount',
  'Required experience': 'experienceLevel',
  'Working hours (per shift)': 'workingHours',
  'Equipment items': 'equipmentRequired',
};
// Turn API messages into { field: message } for inline display. Messages that
// don't map to a single field (e.g. cross-field budget sanity) are skipped and
// surfaced through the submit banner instead.
function toServerErrors(messages = []) {
  const map = {};
  for (const msg of messages) {
    if (typeof msg !== 'string') continue;
    const label = msg.split(/ is required\.| must be | cannot be /)[0].trim();
    const field = FIELD_BY_LABEL[label];
    if (field && !map[field]) map[field] = msg;
  }
  return map;
}

export default function HomePage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(() => ({
    eventBasics: { category: '', dateMode: 'single' },
    categoryDetails: {},
    additionalNotes: '',
  }));
  const [serverErrors, setServerErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [saved, setSaved] = useState(null); // full response data from POST

  // Merge a patch into eventBasics (Step 1). When the category changes we
  // wipe categoryDetails so stale fields from another category can never be
  // submitted under the new one.
  const updateBasics = useCallback((patch) => {
    setForm((f) => ({
      ...f,
      eventBasics: { ...f.eventBasics, ...patch },
      categoryDetails:
        patch.category !== undefined && patch.category !== f.eventBasics.category
          ? {}
          : f.categoryDetails,
    }));
    // Category fields differ per category — stale server errors from the old
    // category would render beside fields that no longer exist.
    if (patch.category !== undefined) setServerErrors({});
  }, []);

  // Merge a patch into categoryDetails (Steps 2 & 3)
  const updateDetails = useCallback((patch) => {
    setForm((f) => ({
      ...f,
      categoryDetails: { ...f.categoryDetails, ...patch },
    }));
  }, []);

  // Shared optional notes (Step 3 screens)
  const updateNotes = useCallback((patch) => {
    if ('additionalNotes' in patch) {
      setForm((f) => ({ ...f, additionalNotes: patch.additionalNotes }));
    }
  }, []);

  const next = () => setStep((s) => Math.min(4, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));
  const goto = (n) => setStep(n);

  async function handleSubmit() {
    if (submitting) return; // guard against double-clicks
    setSubmitting(true);
    setSubmitError('');
    setServerErrors({});
    try {
      const res = await createRequirement(form);
      setSaved(res.data); // { eventBasics, categoryDetails, _id, ... }
    } catch (err) {
      const messages = err.response?.data?.errors;
      if (Array.isArray(messages)) {
        setSubmitError(messages.join(' '));
        setServerErrors(toServerErrors(messages));
      } else {
        setSubmitError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleStartAnother() {
    setSaved(null);
    setStep(1);
    setForm({ eventBasics: { category: '', dateMode: 'single' }, categoryDetails: {}, additionalNotes: '' });
    setServerErrors({});
    setSubmitError('');
  }

  if (saved) {
    return (
      <main className="page">
        <SuccessScreen requirement={saved} onNew={handleStartAnother} />
      </main>
    );
  }

  return (
    <main className="page">
      <header className="page__header">
        <h1>Post an Event Requirement</h1>
        <p>Tell us what you need — we&apos;ll match you with planners, performers, or crew.</p>
      </header>

      <Stepper steps={STEPS} current={step} />

      <div className="card">
        {submitError && <div className="banner banner--error">{submitError}</div>}

        {step === 1 && (
          <EventBasicsStep
            form={form.eventBasics}
            errors={serverErrors}
            update={updateBasics}
            next={next}
          />
        )}

        {/* Steps 2 & 3 are rendered by category. If the user somehow reaches
            step 2+ without a category, show a guard and send them back. */}
        {step === 2 && (
          <CategoryStep
            components={STEP2_COMPONENTS}
            form={form}
            serverErrors={serverErrors}
            updateDetails={updateDetails}
            updateNotes={updateNotes}
            next={next}
            back={back}
            goToStep={setStep}
          />
        )}
        {step === 3 && (
          <CategoryStep
            components={STEP3_COMPONENTS}
            form={form}
            serverErrors={serverErrors}
            updateDetails={updateDetails}
            updateNotes={updateNotes}
            next={next}
            back={back}
            goToStep={setStep}
          />
        )}

        {step === 4 && (
          <ReviewSubmitStep
            form={form}
            updateNotes={updateNotes}
            back={back}
            goto={goto}
            submitting={submitting}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </main>
  );
}

// Renders the correct category component for steps 2 and 3. Falls back to a
// guard banner if no category was selected.
function CategoryStep({
  components,
  form,
  serverErrors,
  updateDetails,
  updateNotes,
  next,
  back,
  goToStep,
}) {
  const StepComponent = components[form.eventBasics.category];
  if (!StepComponent) {
    return (
      <div className="banner banner--error">
        Please choose a category (Event Planner, Performer, or Crew) in Step 1 first.
        <button type="button" className="btn btn--secondary" onClick={() => goToStep(1)}>
          Go back to Step 1
        </button>
      </div>
    );
  }
  return (
    <StepComponent
      form={form}
      serverErrors={serverErrors}
      update={updateDetails}
      updateNotes={updateNotes}
      next={next}
      back={back}
    />
  );
}
