const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Employee = require('../models/Employee');
const Task = require('../models/Task');
const Evaluation = require('../models/Evaluation');
const Attendance = require('../models/Attendance');

const seedData = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB for seeding...');

  // Clear existing
  await User.deleteMany();
  await Employee.deleteMany();
  await Task.deleteMany();
  await Evaluation.deleteMany();
  await Attendance.deleteMany();

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await User.create({
    name: 'عبدالله محمد',
    email: 'admin@company.com',
    password: adminPassword,
    role: 'admin',
    department: 'الموارد البشرية',
  });

  // Create manager user
  const managerPassword = await bcrypt.hash('manager123', 10);
  const manager = await User.create({
    name: 'نورة العتيبي',
    email: 'manager@company.com',
    password: managerPassword,
    role: 'manager',
    department: 'تقنية المعلومات',
  });

  // Create employees
  const employees = await Employee.insertMany([
    {
      employeeId: 'EMP-001',
      name: 'سارة أحمد',
      email: 'sara.ahmed@company.com',
      department: 'تقنية المعلومات',
      position: 'مطورة برمجيات',
      status: 'active',
      hireDate: new Date('2022-03-15'),
      phone: '+966501234567',
      managerId: manager._id,
    },
    {
      employeeId: 'EMP-002',
      name: 'خالد سعيد',
      email: 'khalid.saeed@company.com',
      department: 'المالية',
      position: 'محاسب أول',
      status: 'active',
      hireDate: new Date('2021-07-01'),
      phone: '+966502345678',
      managerId: manager._id,
    },
    {
      employeeId: 'EMP-003',
      name: 'نورة محمد',
      email: 'noura.mohammed@company.com',
      department: 'خدمة العملاء',
      position: 'مشرفة قسم',
      status: 'active',
      hireDate: new Date('2020-01-10'),
      phone: '+966503456789',
      managerId: manager._id,
    },
    {
      employeeId: 'EMP-004',
      name: 'محمد علي',
      email: 'mohammed.ali@company.com',
      department: 'المبيعات',
      position: 'مندوب مبيعات',
      status: 'absent',
      hireDate: new Date('2023-06-20'),
      phone: '+966504567890',
      managerId: manager._id,
    },
    {
      employeeId: 'EMP-005',
      name: 'فاطمة عبدالله',
      email: 'fatima.abdullah@company.com',
      department: 'تقنية المعلومات',
      position: 'محللة أنظمة',
      status: 'on_leave',
      hireDate: new Date('2022-09-05'),
      phone: '+966505678901',
      managerId: manager._id,
    },
  ]);

  // Create tasks
  await Task.insertMany([
    {
      title: 'تحديث واجهة لوحة التحكم',
      description: 'تصميم وتطوير واجهة مستخدم جديدة لنظام إدارة الأداء مع دعم الوضع الليلي.',
      assignedTo: employees[0]._id,
      assignedBy: manager._id,
      status: 'in_progress',
      priority: 'high',
      dueDate: new Date('2026-04-28'),
      steps: [
        { stepNumber: 1, description: 'تصميم الـ Wireframes', isCompleted: true },
        { stepNumber: 2, description: 'بناء المكونات الأساسية', isCompleted: true },
        { stepNumber: 3, description: 'ربط API البيانات', isCompleted: false },
        { stepNumber: 4, description: 'اختبار الواجهة', isCompleted: false },
      ],
    },
    {
      title: 'إعداد تقرير الميزانية الربعية',
      description: 'جمع وتحليل بيانات الإنفاق لإعداد تقرير الربع الأول من عام 2026.',
      assignedTo: employees[1]._id,
      assignedBy: manager._id,
      status: 'overdue',
      priority: 'high',
      dueDate: new Date('2026-04-25'),
      steps: [
        { stepNumber: 1, description: 'جمع البيانات المالية', isCompleted: true },
        { stepNumber: 2, description: 'تحليل الإنفاق', isCompleted: false },
        { stepNumber: 3, description: 'إعداد التقرير النهائي', isCompleted: false },
      ],
    },
    {
      title: 'تدريب فريق خدمة العملاء',
      description: 'تنفيذ برنامج تدريبي لتحسين مهارات التواصل وحل المشكلات.',
      assignedTo: employees[2]._id,
      assignedBy: manager._id,
      status: 'completed',
      priority: 'medium',
      dueDate: new Date('2026-04-22'),
      completedAt: new Date('2026-04-22'),
      steps: [
        { stepNumber: 1, description: 'إعداد المواد التدريبية', isCompleted: true },
        { stepNumber: 2, description: 'تنفيذ جلسات التدريب', isCompleted: true },
        { stepNumber: 3, description: 'تقييم المتدربين', isCompleted: true },
      ],
    },
  ]);

  // Create evaluations
  await Evaluation.insertMany([
    {
      employee: employees[0]._id,
      evaluatedBy: manager._id,
      qualityScore: 5,
      timeScore: 5,
      teamworkScore: 5,
      overallScore: 5,
      notes: 'أداء استثنائي في جميع المجالات',
      period: 'Q1-2026',
    },
    {
      employee: employees[1]._id,
      evaluatedBy: manager._id,
      qualityScore: 4,
      timeScore: 3,
      teamworkScore: 4,
      overallScore: 3.7,
      notes: 'يحتاج تحسين في الالتزام بالمواعيد',
      period: 'Q1-2026',
    },
    {
      employee: employees[2]._id,
      evaluatedBy: manager._id,
      qualityScore: 4,
      timeScore: 4,
      teamworkScore: 5,
      overallScore: 4.3,
      notes: 'تحسن ملحوظ في التعاون مع الفريق',
      period: 'Q1-2026',
    },
  ]);

  // Create attendance records
  const today = new Date();
  await Attendance.insertMany([
    { employee: employees[0]._id, date: today, checkIn: '08:02', status: 'present' },
    { employee: employees[1]._id, date: today, checkIn: '08:15', status: 'present' },
    { employee: employees[2]._id, date: today, checkIn: '08:30', status: 'present' },
    { employee: employees[3]._id, date: today, status: 'absent' },
    { employee: employees[4]._id, date: today, status: 'on_leave' },
  ]);

  console.log('✅ Seed data inserted successfully');
  console.log('📧 Admin: admin@company.com / admin123');
  console.log('📧 Manager: manager@company.com / manager123');
  process.exit(0);
};

seedData().catch((err) => {
  console.error(err);
  process.exit(1);
});
