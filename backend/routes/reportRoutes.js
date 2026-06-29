const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const Employee = require('../models/Employee');
const Task = require('../models/Task');
const Evaluation = require('../models/Evaluation');
const Attendance = require('../models/Attendance');
const Department = require('../models/Department');


// GET /api/reports/department-performance — أداء كل قسم
router.get('/department-performance', protect, async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true });

    const report = await Promise.all(
      departments.map(async (dept) => {
        const employees = await Employee.find({
          department: dept.name,
          status: { $ne: 'terminated' }
        });

        const employeeIds = employees.map(e => e._id);

        const tasks = await Task.find({ assignedTo: { $in: employeeIds } });
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const overdueTasks = tasks.filter(t => t.status === 'overdue').length;
        const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;

        const completionRate = tasks.length > 0
          ? Math.round((completedTasks / tasks.length) * 100)
          : 0;

        // حساب الحضور لآخر 30 يوم
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const attendanceRecords = await Attendance.find({
          employee: { $in: employeeIds },
          date: { $gte: thirtyDaysAgo }
        });

        const presentCount = attendanceRecords.filter(a => a.status === 'present').length;
        const attendanceRate = attendanceRecords.length > 0
          ? Math.round((presentCount / attendanceRecords.length) * 100)
          : 0;

        // متوسط تقييم الأداء
        const avgPerformance = employees.length > 0
          ? Math.round(
              employees.reduce((sum, e) => sum + (e.performanceScore || 0), 0) / employees.length
            )
          : 0;

        return {
          _id: dept._id,
          name: dept.name,
          icon: dept.icon,
          color: dept.color,
          managerName: dept.managerName,
          employeeCount: employees.length,
          totalTasks: tasks.length,
          completedTasks,
          inProgressTasks,
          overdueTasks,
          completionRate,
          attendanceRate,
          avgPerformance,
        };
      })
    );

    res.json({ success: true, departments: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// GET /api/reports/dashboard — إحصائيات لوحة التحكم
router.get('/dashboard', protect, async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true });
    const totalEmployees = await Employee.countDocuments({ status: { $ne: 'terminated' } });
    const totalTasks = await Task.countDocuments();
    const completedTasks = await Task.countDocuments({ status: 'completed' });
    const overdueTasks = await Task.countDocuments({ status: 'overdue' });
    const inProgressTasks = await Task.countDocuments({ status: 'in_progress' });
    const pendingTasks = await Task.countDocuments({ status: 'pending' });

    // توزيع الموظفين على الأقسام
    const departmentDistribution = await Promise.all(
      departments.map(async (dept) => {
        const count = await Employee.countDocuments({
          department: dept.name,
          status: { $ne: 'terminated' }
        });
        return {
          name: dept.name,
          icon: dept.icon,
          color: dept.color,
          count,
        };
      })
    );

    res.json({
      success: true,
      stats: {
        totalDepartments: departments.length,
        totalEmployees,
        totalTasks,
        completedTasks,
        overdueTasks,
        inProgressTasks,
        pendingTasks,
        taskCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
      departmentDistribution,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
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