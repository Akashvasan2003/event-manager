'use client';

export default function Stepper({ steps, current }) {
  return <nav className="stepper" aria-label="Form progress">
    {steps.map((label, index) => {
      const number = index + 1;
      const state = number === current ? 'stepper__step--active' : number < current ? 'stepper__step--done' : '';
      return <div className="stepper__segment" key={label}>
        <div className={`stepper__step ${state}`} aria-current={number === current ? 'step' : undefined}>
          <span className="stepper__dot" aria-hidden="true">{number < current ? '✓' : number}</span>
          <span className="stepper__label">{label}</span>
        </div>
        {number < steps.length && <span className={`stepper__line ${number < current ? 'stepper__line--done' : ''}`} aria-hidden="true" />}
      </div>;
    })}
  </nav>;
}
