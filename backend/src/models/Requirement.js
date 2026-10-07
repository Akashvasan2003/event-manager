const mongoose = require('mongoose');

/**
 * Requirement collection.
 * Step 1 data is stored flat at the top level; Steps 2 & 3 go into exactly one
 * of plannerDetails / performerDetails / crewDetails, chosen by `category`.
 * Mongoose strict mode discards anything not declared here, so a performer
 * document can never carry planner or crew fields.
 */
const requirementSchema = new mongoose.Schema(
  {
    // --- Step 1: Event basics (flat) ---------------------------------------
    eventName: { type: String, required: true, trim: true },
    eventType: { type: String, required: true, trim: true },
    // 'single' = one-day event, 'range' = multi-day
    dateMode: { type: String, enum: ['single', 'range'], default: 'single' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    location: { type: String, required: true, trim: true },
    venue: { type: String, trim: true, default: '' },
    category: {
      type: String,
      required: true,
      enum: ['planner', 'performer', 'crew'],
    },

    // --- Steps 2 & 3: exactly one of these is populated ---------------------
    plannerDetails: {
      planningScope: { type: String, enum: ['full', 'partial', 'day-of'] },
      guestCount: { type: Number, min: 1 },
      budgetMin: { type: Number, min: 0 },
      budgetMax: { type: Number, min: 0 },
      servicesRequired: { type: [String], default: [] },
      themeStyle: { type: String, trim: true, default: '' },
      specialRequirements: { type: String, trim: true, default: '' },
      planningTimeline: { type: String, enum: ['under-1-month', '1-3-months', '3-6-months', '6-plus-months'] },
      coordinatorsNeeded: { type: Number, min: 0 },
      vendorCoordination: { type: Boolean, default: false },
      onSiteCoordination: { type: Boolean, default: false },
    },

    performerDetails: {
      performanceType: { type: String, enum: ['band', 'dj', 'solo', 'comedy', 'dance', 'speaker', 'other'] },
      genre: { type: String, trim: true, default: '' },
      numberOfPerformers: { type: Number, min: 1 },
      performanceDurationMins: { type: Number, min: 5 },
      budgetMin: { type: Number, min: 0 },
      budgetMax: { type: Number, min: 0 },
      performanceRequirements: { type: String, trim: true, default: '' },
      soundSystemRequired: { type: Boolean, default: false },
      lightingRequired: { type: Boolean, default: false },
      stageRequired: { type: Boolean, default: false },
      travelRequired: { type: Boolean, default: false },
      accommodationRequired: { type: Boolean, default: false },
      specialRequests: { type: String, trim: true, default: '' },
    },

    crewDetails: {
      crewRoles: { type: [String], default: [] },
      numberOfCrew: { type: Number, min: 1 },
      experienceLevel: { type: String, enum: ['any', 'junior', 'mid', 'senior'] },
      workingHours: { type: Number, min: 1, max: 24 },
      hourlyRate: { type: Number, min: 0 },
      responsibilities: { type: String, trim: true, default: '' },
      equipmentRequired: { type: [String], default: [] },
      setupRequired: { type: Boolean, default: false },
      breakdownRequired: { type: Boolean, default: false },
      travelRequired: { type: Boolean, default: false },
      technicalRequirements: { type: String, trim: true, default: '' },
    },

    // Shared optional
    additionalNotes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Requirement', requirementSchema);
