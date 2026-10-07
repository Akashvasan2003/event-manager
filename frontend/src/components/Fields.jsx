'use client';

/**
 * Reusable form primitives shared by every wizard step.
 * Each renders a label, control, and per-field validation error.
 */
export function TextField({ label, name, value, onChange, error, type = 'text', optional = false, placeholder }) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={name}>
        {label} {optional && <span className="optional">(optional)</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        className={`field__input ${error ? 'field__input--error' : ''}`}
        value={value ?? ''}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        onChange={(e) => onChange({ [name]: e.target.value })}
      />
      {error && (
        <p className="field__error" id={`${name}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function NumberField({ label, name, value, onChange, error, optional = false, min, max, placeholder }) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={name}>
        {label} {optional && <span className="optional">(optional)</span>}
      </label>
      <input
        id={name}
        name={name}
        type="number"
        className={`field__input ${error ? 'field__input--error' : ''}`}
        value={value ?? ''}
        min={min}
        max={max}
        placeholder={placeholder}
        onChange={(e) => onChange({ [name]: e.target.value })}
      />
      {error && <p className="field__error">{error}</p>}
    </div>
  );
}

export function SelectField({ label, name, value, onChange, error, options, optional = false, placeholder }) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={name}>
        {label} {optional && <span className="optional">(optional)</span>}
      </label>
      <select
        id={name}
        name={name}
        className={`field__select ${error ? 'field__select--error' : ''}`}
        value={value ?? ''}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        onChange={(e) => onChange({ [name]: e.target.value })}
      >
        <option value="">{placeholder || 'Select…'}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="field__error" id={`${name}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextareaField({ label, name, value, onChange, error, optional = true, rows = 3, placeholder }) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={name}>
        {label} {optional && <span className="optional">(optional)</span>}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        className="field__textarea"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange({ [name]: e.target.value })}
      />
      {error && <p className="field__error">{error}</p>}
    </div>
  );
}

export function CheckboxGroup({ label, name, options, selected = [], onChange, error }) {
  const toggle = (val) => {
    onChange({ [name]: selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val] });
  };

  return (
    <div className="field">
      <span className="field__label">{label}</span>
      {options.map((opt) => (
        <label key={opt.value} className={`choice ${selected.includes(opt.value) ? 'choice--checked' : ''}`}>
          <input
            type="checkbox"
            checked={selected.includes(opt.value)}
            onChange={() => toggle(opt.value)}
          />
          {opt.label}
        </label>
      ))}
      {error && <p className="field__error">{error}</p>}
    </div>
  );
}

export function RadioGroup({ label, name, value, onChange, error, options }) {
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      <div role="radiogroup" aria-label={label}>
        {options.map((opt) => (
          <label key={opt.value} className={`choice ${value === opt.value ? 'choice--checked' : ''}`}>
            <input
              type="radio"
              name={name}
              checked={value === opt.value}
              onChange={() => onChange({ [name]: opt.value })}
            />
            {opt.label}
          </label>
        ))}
      </div>
      {error && (
        <p className="field__error" id={`${name}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
