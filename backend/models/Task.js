const mongoose = require('mongoose');

const stepSchema = new mongoose.Schema({
  stepNumber: { type: Number, required: true },
  description: { type: String, required: true },
  isCompleted: { type: Boolean, default: false },
  completedAt: { type: Date },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String },
});

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'overdue', 'postponed'],
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    dueDate: { type: Date, required: true },
    completedAt: { type: Date },
    steps: [stepSchema],
    attachments: [{ name: String, url: String, uploadedAt: Date }],
    managerNotes: { type: String },
    // Business continuity: who can take over if employee is absent
    backupEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  },
  { timestamps: true }
);

// Auto-mark overdue tasks
taskSchema.pre('save', function (next) {
  if (this.status !== 'completed' && this.dueDate < new Date()) {
    this.status = 'overdue';
  }
  next();
});

module.exports = mongoose.model('Task', taskSchema);
