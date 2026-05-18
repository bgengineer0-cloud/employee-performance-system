const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    evaluatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    qualityScore: { type: Number, required: true, min: 1, max: 5 },
    timeScore: { type: Number, required: true, min: 1, max: 5 },
    teamworkScore: { type: Number, required: true, min: 1, max: 5 },
    overallScore: { type: Number, min: 1, max: 5 },
    notes: { type: String },
    period: { type: String }, // e.g. "Q1-2026"
    recommendations: { type: String },
  },
  { timestamps: true }
);

// Auto-calculate overall score before save
evaluationSchema.pre('save', function (next) {
  this.overallScore = parseFloat(
    ((this.qualityScore + this.timeScore + this.teamworkScore) / 3).toFixed(1)
  );
  next();
});

module.exports = mongoose.model('Evaluation', evaluationSchema);
