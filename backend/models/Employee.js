const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String },
    department: {
      type: String,
      enum: ['تقنية المعلومات', 'الموارد البشرية', 'المالية', 'المبيعات', 'خدمة العملاء'],
      required: true,
    },
    position: { type: String, required: true },
    status: {
      type: String,
      enum: ['active', 'absent', 'on_leave', 'terminated'],
      default: 'active',
    },
    hireDate: { type: Date, required: true },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    performanceScore: { type: Number, default: 0, min: 0, max: 100 },
    notes: { type: String },
  },
  { timestamps: true }
);

// Auto-generate employeeId
employeeSchema.statics.generateId = async function () {
  const count = await this.countDocuments();
  return `EMP-${String(count + 1).padStart(3, '0')}`;
};

module.exports = mongoose.model('Employee', employeeSchema);
