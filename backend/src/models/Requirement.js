const mongoose = require('mongoose');

/**
 * Requirement collection.
 * `eventBasics` holds the Step 1 data; `categoryDetails` is a flexible
 * sub-document whose shape depends on `category` (planner | performer | crew).
 * Mongoose strict mode discards anything not declared here.
 */
const requirementSchema = new mongoose.Schema(
  {
    // --- Step 1: Event basics ---------------------------------------------
    eventBasics: {
      eventName: { type: String, required: true, trim: true },
      eventType: { type: String, required: true, trim: true },
      // 'single' = one-day event, 'range' = multi-day
      dateMode: { type: String, enum: ['single', 'range'], default: 'single' },
      startDate: { type: Date, required: true },
      endDate: { type: Date },
      location: { type: String, required: true, trim: true },
      venue: { type: String, trim: true, default: '' }, // optional
      category: {
        type: String,
        required: true,
        enum: ['planner', 'performer', 'crew'],
      },
    },

    // --- Steps 2 & 3: Category-specific ------------------------------------
    categoryDetails: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Shared optional
    additionalNotes: { type: String, trim: true, default: '' },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Requirement', requirementSchema);
