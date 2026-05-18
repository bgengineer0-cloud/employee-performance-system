const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  updateStep,
  updateTaskStatus,
  deleteTask,
  getContinuityPlan
} = require('../controllers/taskController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ── يجب أن تكون هذه Routes قبل /:id ──────────────

// جلب مهام الموظف بالإيميل
router.get('/my-tasks/:email', protect, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const Employee = mongoose.model('Employee');
    const Task = mongoose.model('Task');

    const email = decodeURIComponent(req.params.email);
    console.log('📧 جلب مهام للإيميل:', email);

    // إيجاد الموظف
    const employee = await Employee.findOne({ email: email });

    if (!employee) {
      console.log('❌ لا يوجد موظف بهذا الإيميل:', email);
      return res.json({
        success: true,
        tasks: [],
        employee: null,
        message: 'لا يوجد موظف بهذا الإيميل'
      });
    }

    console.log('✅ الموظف:', employee.name, '| ID:', employee._id);

    // جلب المهام
    const tasks = await Task.find({ assignedTo: employee._id })
      .populate('assignedTo', 'name employeeId department')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 });

    console.log('📋 عدد المهام:', tasks.length);

    res.json({
      success: true,
      tasks,
      employee: {
        _id: employee._id,
        name: employee.name,
        employeeId: employee.employeeId,
        department: employee.department,
        position: employee.position
      }
    });
  } catch (error) {
    console.error('❌ خطأ في my-tasks:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/continuity/:employeeId', protect, getContinuityPlan);
router.get('/', protect, getTasks);
router.get('/:id', protect, getTask);
router.post('/', protect, authorize('admin', 'manager'), createTask);
router.put('/:id', protect, updateTask);
router.put('/:id/step/:stepId', protect, updateStep);
router.patch('/:id/status', protect, updateTaskStatus);
router.delete('/:id', protect, authorize('admin', 'manager'), deleteTask);

module.exports = router;