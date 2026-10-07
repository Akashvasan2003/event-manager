'use client';

export default function Stepper({ steps, current }) {
  return (
    <nav className="stepper" aria-label="Form progress">
      {steps.map((label, i) => {
        const num = i + 1;
        const state =
          num === current ? 'stepper__step--active' : num < current ? 'stepper__step--done' : '';
        return (
          <div key={label} style={{ display: 'contents' }}>
            <div className={`stepper__step ${state}`}>
              <span className="stepper__dot">{num < current ? '✓' : num}</span>
              <span className="stepper__label">{label}</span>
            </div>
            {num < steps.length && <div className="stepper__line" />}
          </div>
        );
      })}
    </nav>
  );
}
