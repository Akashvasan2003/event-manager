const Requirement = require('../models/Requirement');
const validateRequirement = require('../validation/requirementValidation');

/**
 * The wizard posts { eventBasics, categoryDetails, additionalNotes }.
 * We store Step 1 data flat and move categoryDetails into exactly one of
 * plannerDetails / performerDetails / crewDetails, renaming fields where the
 * storage name differs (e.g. crewRole -> crewRoles, crewCount -> numberOfCrew).
 * Only fields declared in the validation rule table are copied, so unrelated
 * category data can never reach the document. Unfilled details objects are
 * not stored at all.
 */
const DETAILS_KEY = {
  planner: 'plannerDetails',
  performer: 'performerDetails',
  crew: 'crewDetails',
};

// wizard field name -> stored field name
const RENAMES = {
  crewRole: 'crewRoles',
  crewCount: 'numberOfCrew',
  performerCount: 'numberOfPerformers',
  durationMins: 'performanceDurationMins',
};

function buildDocument(body = {}) {
  const basics = body.eventBasics || {};
  const category = basics.category;
  const raw = body.categoryDetails || {};
  const { RULES } = require('../validation/requirementValidation');
  const rules = RULES[category] || {};

  const details = {};
  for (const [field, rule] of Object.entries(rules)) {
    let value = raw[field];
    if (value === undefined || value === null || value === '') continue;

    switch (rule.kind) {
      case 'num':
        value = Number(value);
        if (!Number.isFinite(value)) continue;
        break;
      case 'bool':
        value = value === true || value === 'true';
        break;
      case 'multi':
        value = Array.isArray(value) ? value : [];
        break;
      case 'str':
        value = String(value).trim();
        break;
      default:
        break;
    }
    details[RENAMES[field] || field] = value;
  }

  const doc = {
    eventName: basics.eventName,
    eventType: basics.eventType,
    dateMode: basics.dateMode,
    startDate: basics.startDate,
    endDate: basics.endDate || null,
    location: basics.location,
    venue: basics.venue || '',
    category,
    additionalNotes: body.additionalNotes || '',
  };

  // Store ONLY the relevant details object; skip empty ones entirely.
  const key = DETAILS_KEY[category];
  if (key && Object.keys(details).length > 0) {
    doc[key] = details;
  }

  return doc;
}

// POST /api/requirements
exports.createRequirement = async (req, res, next) => {
  try {
    const doc = buildDocument(req.body);

    const errors = validateRequirement(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    const requirement = await Requirement.create(doc);
    return res
      .status(201)
      .json({ success: true, message: 'Requirement submitted successfully', data: requirement });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: 'Validation failed', errors: messages });
    }
    return next(err);
  }
};

// GET /api/requirements  (optional ?category=planner|performer|crew)
exports.getRequirements = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;

    const requirements = await Requirement.find(filter).sort({ createdAt: -1 }).limit(100);
    return res.json({ success: true, count: requirements.length, data: requirements });
  } catch (err) {
    return next(err);
  }
};

// GET /api/requirements/:id
exports.getRequirementById = async (req, res, next) => {
  try {
    const requirement = await Requirement.findById(req.params.id);
    if (!requirement) {
      return res
        .status(404)
        .json({ success: false, message: 'Not found', errors: ['Requirement not found.'] });
    }
    return res.json({ success: true, data: requirement });
  } catch (err) {
    if (err.name === 'CastError') {
      return res
        .status(400)
        .json({ success: false, message: 'Validation failed', errors: ['Invalid requirement id.'] });
    }
    return next(err);
  }
};
