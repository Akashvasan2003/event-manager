const Requirement = require('../models/Requirement');
const validateRequirement = require('../validation/requirementValidation');

/**
 * HTML form values arrive as strings. Coerce the numeric/string-typed
 * categoryDetails fields to their proper types before validation + save.
 * Field types come from the same rule table the validator uses, so there is
 * a single source of truth.
 */
function coerceCategoryDetails(category, details = {}) {
  const { RULES } = require('../validation/requirementValidation');
  const rules = RULES[category] || {};
  const out = {};

  for (const [field, rule] of Object.entries(rules)) {
    const value = details[field];
    if (value === undefined || value === null || value === '') continue;

    switch (rule.kind) {
      case 'num':
        out[field] = Number(value);
        break;
      case 'bool':
        out[field] = value === true || value === 'true';
        break;
      case 'multi':
        out[field] = Array.isArray(value) ? value : [];
        break;
      default:
        out[field] = value;
    }
  }
  return out;
}

// POST /api/requirements
exports.createRequirement = async (req, res, next) => {
  try {
    const payload = {
      eventBasics: req.body.eventBasics || {},
      categoryDetails: coerceCategoryDetails(
        req.body.eventBasics?.category,
        req.body.categoryDetails || {}
      ),
      additionalNotes: req.body.additionalNotes || '',
    };

    const errors = validateRequirement(payload);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    const requirement = await Requirement.create(payload);
    return res
      .status(201)
      .json({ success: true, message: 'Requirement submitted successfully', data: requirement });
  } catch (err) {
    // Mongoose validation / cast errors -> 400 with readable messages
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: 'Validation failed', errors: messages });
    }
    return next(err);
  }
};

// GET /api/requirements  (optional ?category=planner|performer|crew for admin testing)
exports.getRequirements = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.category) filter['eventBasics.category'] = req.query.category;

    const requirements = await Requirement.find(filter).sort({ createdAt: -1 }).limit(100);
    return res.json({
      success: true,
      count: requirements.length,
      data: requirements,
    });
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
