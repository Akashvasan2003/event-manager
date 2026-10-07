/**
 * Server-side validation for requirement payloads.
 * Returns an array of human-readable error messages (empty = valid).
 * Mirrors the frontend rules so neither side relies on the other.
 */
const CATEGORIES = ['planner', 'performer', 'crew'];

const isStr = (v) => typeof v === 'string';
const hasValue = (v) => v !== undefined && v !== null && v !== '';
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const num = (v) => Number(v);

const checkNum = (errors, value, label, { min = null, max = null, required = false } = {}) => {
  if (!hasValue(value)) {
    if (required) errors.push(`${label} is required.`);
    return;
  }
  const n = num(value);
  if (!isNum(n)) {
    errors.push(`${label} must be a number.`);
    return;
  }
  if (min !== null && n < min) errors.push(`${label} must be at least ${min}.`);
  if (max !== null && n > max) errors.push(`${label} must be at most ${max}.`);
};

const checkStr = (errors, value, label, { required = false, maxLen = null } = {}) => {
  if (!hasValue(value) || (isStr(value) && !value.trim())) {
    if (required) errors.push(`${label} is required.`);
    return;
  }
  if (!isStr(value)) {
    errors.push(`${label} must be text.`);
    return;
  }
  if (maxLen && value.trim().length > maxLen) {
    errors.push(`${label} must be at most ${maxLen} characters.`);
  }
};

const checkOneOf = (errors, value, label, allowed, { required = false } = {}) => {
  if (!hasValue(value)) {
    if (required) errors.push(`${label} is required.`);
    return;
  }
  if (!allowed.includes(value)) {
    errors.push(`${label} must be one of: ${allowed.join(', ')}.`);
  }
};

const checkMulti = (errors, value, label, { required = false } = {}) => {
  if (!Array.isArray(value) || value.length === 0) {
    if (required) errors.push(`Select at least one ${label.toLowerCase()}.`);
  }
};

const checkDateOrder = (errors, basics) => {
  const { startDate, endDate, dateMode } = basics;
  if (!startDate || Number.isNaN(Date.parse(startDate))) {
    errors.push('A valid start date is required.');
  }
  if (dateMode === 'range') {
    if (!endDate) errors.push('End date is required for a multi-day event.');
    else if (Number.isNaN(Date.parse(endDate))) errors.push('End date must be a valid date.');
    else if (Date.parse(endDate) < Date.parse(startDate)) {
      errors.push('End date cannot be before the start date.');
    }
  }
};

// ---------------------------------------------------------------------------
// Per-category rule tables (Steps 2 & 3)
// ---------------------------------------------------------------------------
const PLANNER_RULES = {
  planningScope: { kind: 'oneOf', label: 'Planning scope', allowed: ['full', 'partial', 'day-of'], required: true },
  guestCount: { kind: 'num', label: 'Expected guest count', min: 1, required: true },
  budgetMin: { kind: 'num', label: 'Minimum budget', min: 0, required: true },
  budgetMax: { kind: 'num', label: 'Maximum budget', min: 0 },
  servicesRequired: { kind: 'multi', label: 'Planning services required', required: true },
  themeStyle: { kind: 'str', label: 'Event theme / style', maxLen: 300 },
  specialRequirements: { kind: 'str', label: 'Special requirements', maxLen: 1000 },
  planningTimeline: { kind: 'oneOf', label: 'Planning timeline', allowed: ['under-1-month', '1-3-months', '3-6-months', '6-plus-months'], required: true },
  coordinatorsNeeded: { kind: 'num', label: 'Coordinators required', min: 0, required: true },
  vendorCoordination: { kind: 'bool', label: 'Vendor coordination' },
  onSiteCoordination: { kind: 'bool', label: 'On-site coordination' },
};

const PERFORMER_RULES = {
  performanceType: { kind: 'oneOf', label: 'Performance type', allowed: ['band', 'dj', 'solo', 'comedy', 'dance', 'speaker', 'other'], required: true },
  genre: { kind: 'str', label: 'Genre', maxLen: 100, required: true },
  performerCount: { kind: 'num', label: 'Number of performers', min: 1, required: true },
  durationMins: { kind: 'num', label: 'Performance duration (minutes)', min: 5, required: true },
  budgetMin: { kind: 'num', label: 'Minimum budget', min: 0 },
  budgetMax: { kind: 'num', label: 'Maximum budget', min: 0 },
  performanceRequirements: { kind: 'str', label: 'Performance requirements', maxLen: 1000 },
  soundSystemRequired: { kind: 'bool', label: 'Sound system required' },
  lightingRequired: { kind: 'bool', label: 'Lighting required' },
  stageRequired: { kind: 'bool', label: 'Stage required' },
  travelRequired: { kind: 'bool', label: 'Travel required' },
  accommodationRequired: { kind: 'bool', label: 'Accommodation required' },
  specialRequests: { kind: 'str', label: 'Special requests', maxLen: 1000 },
};

const CREW_RULES = {
  crewRole: { kind: 'multi', label: 'Crew roles required', required: true },
  crewCount: { kind: 'num', label: 'Number of crew members', min: 1, required: true },
  experienceLevel: { kind: 'oneOf', label: 'Required experience', allowed: ['any', 'junior', 'mid', 'senior'], required: true },
  workingHours: { kind: 'num', label: 'Working hours (per shift)', min: 1, max: 24, required: true },
  hourlyRate: { kind: 'num', label: 'Budget / hourly rate', min: 0 },
  responsibilities: { kind: 'str', label: 'Responsibilities', maxLen: 1000 },
  equipmentRequired: { kind: 'multi', label: 'Equipment items', required: true },
  setupRequired: { kind: 'bool', label: 'Setup required' },
  breakdownRequired: { kind: 'bool', label: 'Breakdown required' },
  technicalRequirements: { kind: 'str', label: 'Technical requirements', maxLen: 1000 },
  travelRequired: { kind: 'bool', label: 'Travel required' },
};

const RULES = { planner: PLANNER_RULES, performer: PERFORMER_RULES, crew: CREW_RULES };

const validateCategoryDetails = (errors, category, details = {}) => {
  const rules = RULES[category] || {};
  for (const [field, rule] of Object.entries(rules)) {
    const value = details[field];
    switch (rule.kind) {
      case 'str':
        checkStr(errors, value, rule.label, { required: rule.required, maxLen: rule.maxLen });
        break;
      case 'num':
        checkNum(errors, value, rule.label, { required: rule.required, min: rule.min, max: rule.max });
        break;
      case 'oneOf':
        checkOneOf(errors, value, rule.label, rule.allowed, { required: rule.required });
        break;
      case 'multi':
        checkMulti(errors, value, rule.label, { required: rule.required });
        break;
      case 'bool':
        // HTML forms send strings; the controller coerces 'true'/'false' to booleans
        if (hasValue(value) && value !== true && value !== false && value !== 'true' && value !== 'false') {
          errors.push(`${rule.label} must be true or false.`);
        }
        break;
      default:
        break;
    }
  }

  // Budget sanity where both bounds exist
  if (
    rules.budgetMin &&
    rules.budgetMax &&
    hasValue(details.budgetMin) &&
    hasValue(details.budgetMax) &&
    num(details.budgetMax) < num(details.budgetMin)
  ) {
    errors.push('Maximum budget cannot be less than the minimum budget.');
  }
};

module.exports = function validateRequirement(body = {}) {
  const errors = [];
  const basics = body.eventBasics || {};
  const details = body.categoryDetails || {};

  // --- Step 1: event basics ----------------------------------------------
  checkStr(errors, basics.eventName, 'Event name', { required: true, maxLen: 120 });
  checkStr(errors, basics.eventType, 'Event type', { required: true });
  checkOneOf(errors, basics.dateMode, 'Date mode', ['single', 'range'], { required: true });
  checkDateOrder(errors, basics);
  checkStr(errors, basics.location, 'Location', { required: true });
  checkStr(errors, basics.venue, 'Venue', { maxLen: 200 });
  checkOneOf(errors, basics.category, 'Category', CATEGORIES, { required: true });

  // --- Steps 2 & 3: category-specific --------------------------------------
  if (CATEGORIES.includes(basics.category)) {
    validateCategoryDetails(errors, basics.category, details);
  }

  // --- Shared ---------------------------------------------------------------
  checkStr(errors, body.additionalNotes, 'Additional notes', { maxLen: 2000 });

  return errors;
};

// Exported for the smoke test / potential reuse
module.exports.RULES = RULES;
