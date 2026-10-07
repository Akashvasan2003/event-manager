'use client';

/**
 * Shared plumbing for category step components.
 * `useStepValidation` keeps the per-step validate/next pattern DRY across all
 * six category screens; the validators themselves live in each component.
 */
import { useState } from 'react';

export function useStepValidation(validateFn) {
  const [errors, setErrors] = useState({});

  function handleNext(e, next) {
    e.preventDefault();
    const errs = validateFn() || {};
    setErrors(errs);
    if (Object.keys(errs).length === 0) next();
  }

  return { errors, handleNext };
}
