const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'اسم القسم مطلوب'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    managerName: {
      type: String,
      default: '',
    },
    managerEmail: {
      type: String,
      default: '',
    },
    color: {
      type: String,
      default: '#1D9E75',
    },
    icon: {
      type: String,
      default: '🏢',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    employeeCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Department', departmentSchema);