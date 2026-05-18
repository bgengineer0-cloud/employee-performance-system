const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true },
    checkIn: { type: String }, // "HH:MM"
    checkOut: { type: String },
    status: {
      type: String,
      enum: ['present', 'absent', 'on_leave', 'late', 'half_day'],
      required: true,
    },
    leaveType: {
      type: String,
      enum: ['annual', 'sick', 'emergency', 'unpaid', null],
      default: null,
    },
    notes: { type: String },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Unique attendance per employee per day
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
