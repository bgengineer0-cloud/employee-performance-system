const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const Employee = require('../models/Employee');
const Task = require('../models/Task');
const Evaluation = require('../models/Evaluation');
const Attendance = require('../models/Attendance');

router.get('/dashboard', protect, async (req, res) => {
  try {
    const totalEmployees = await Employee.countDocuments({ status: { $ne: 'terminated' } });
    const totalTasks = await Task.countDocuments();
    const completedTasks = await Task.countDocuments({ status: 'completed' });
    const overdueTasks = await Task.countDocuments({ status: 'overdue' });

    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
    const todayAttendance = await Attendance.countDocuments({ date: { $gte: today, $lt: tomorrow }, status: 'present' });

    const evals = await Evaluation.find();
    const avgEval = evals.length > 0 ? (evals.reduce((s, e) => s + e.overallScore, 0) / evals.length).toFixed(1) : 0;

    res.json({ success: true, stats: { totalEmployees, totalTasks, completedTasks, overdueTasks, todayAttendance, avgEvalScore: avgEval, taskCompletionRate: totalTasks > 0 ? Math.round((completedTasks/totalTasks)*100) : 0 } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/department-performance', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const departments = ['تقنية المعلومات', 'الموارد البشرية', 'المالية', 'المبيعات', 'خدمة العملاء'];
    const report = await Promise.all(departments.map(async (dept) => {
      const employees = await Employee.find({ department: dept, status: { $ne: 'terminated' } });
      const empIds = employees.map(e => e._id);
      const tasks = await Task.find({ assignedTo: { $in: empIds } });
      const completed = tasks.filter(t => t.status === 'completed').length;
      const evals = await Evaluation.find({ employee: { $in: empIds } });
      const avgScore = evals.length > 0 ? (evals.reduce((s,e) => s + e.overallScore, 0) / evals.length).toFixed(1) : 0;
      return { department: dept, employeeCount: employees.length, totalTasks: tasks.length, completedTasks: completed, completionRate: tasks.length > 0 ? Math.round((completed/tasks.length)*100) : 0, avgEvalScore: avgScore };
    }));
    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;