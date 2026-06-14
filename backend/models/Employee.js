const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
      unique: true
    },
    name: {
      type: String,
      required: [true, 'اسم الموظف مطلوب'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'البريد الإلكتروني مطلوب'],
      unique: true,
      lowercase: true
    },
    phone: {
      type: String,
      default: ''
    },
    department: {
      type: String,
      required: [true, 'القسم مطلوب'],
      trim: true,
    },
    position: {
      type: String,
      required: [true, 'المسمى الوظيفي مطلوب'],
      trim: true
    },
    status: {
      type: String,
      enum: ['active', 'absent', 'on_leave', 'terminated'],
      default: 'active',
    },
    hireDate: {
      type: Date,
      required: [true, 'تاريخ التعيين مطلوب']
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    performanceScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    notes: {
      type: String,
      default: ''
    },
  },
  { timestamps: true }
);

employeeSchema.statics.generateId = async function () {
  const count = await this.countDocuments();
  return `EMP-${String(count + 1).padStart(3, '0')}`;
};

module.exports = mongoose.model('Employee', employeeSchema);