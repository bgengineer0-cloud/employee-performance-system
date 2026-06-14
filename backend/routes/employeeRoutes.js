const express = require('express');
const router = express.Router();
const { getEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee } = require('../controllers/employeeController');
const { protect, authorize } = require('../middleware/authMiddleware');
const Employee = require('../models/Employee');

router.get('/', protect, getEmployees);
router.get('/:id', protect, getEmployee);
router.post('/', protect, authorize('admin', 'manager'), createEmployee);
router.put('/:id', protect, authorize('admin', 'manager'), updateEmployee);
router.delete('/:id', protect, authorize('admin'), deleteEmployee);
// جلب موظف بالإيميل
router.get('/by-email/:email', protect, async (req, res) => {
  try {
    const employee = await Employee.findOne({ 
      email: req.params.email,
      status: { $ne: 'terminated' }
    });
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        message: 'الموظف غير موجود' 
      });
    }
    res.json({ success: true, employee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// GET /api/employees/my-department — موظفو قسم المدير فقط
router.get('/my-department', protect, async (req, res) => {
  try {
    const employees = await Employee.find({
      department: req.user.department,
      status: { $ne: 'terminated' }
    }).sort({ createdAt: -1 });

    const enriched = await Promise.all(
      employees.map(async (emp) => {
        const Task = require('../models/Task');
        const tasks = await Task.find({ assignedTo: emp._id });
        const completed = tasks.filter(t => t.status === 'completed').length;
        return {
          ...emp.toObject(),
          taskCompletionRate: tasks.length > 0
            ? Math.round((completed / tasks.length) * 100)
            : 0,
          totalTasks: tasks.length,
        };
      })
    );

    res.json({ success: true, employees: enriched, department: req.user.department });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/employees/my-department — إضافة موظف لقسم المدير تلقائياً
router.post('/my-department', protect, authorize('manager', 'admin'), async (req, res) => {
  try {
    const User = require('../models/User');
    const bcrypt = require('bcryptjs');

    const employeeId = await Employee.generateId();

    // تعيين القسم تلقائياً من قسم المدير
    const data = {
      ...req.body,
      employeeId,
      department: req.user.department, // القسم يُحدد تلقائياً
      managerId: req.user._id,
    };

    if (!data.phone) delete data.phone;
    if (!data.notes) delete data.notes;

    // التحقق من عدم تكرار الإيميل
    const existingEmp = await Employee.findOne({ email: data.email });
    if (existingEmp) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني مستخدم مسبقاً' });
    }

    const employee = await Employee.create(data);

    // إنشاء حساب دخول تلقائي
    const defaultPassword = data.name.replace(/\s+/g, '').slice(0, 6) + '123';
    const existingUser = await User.findOne({ email: data.email });
    if (!existingUser) {
      const hash = await bcrypt.hash(defaultPassword, 10);
      await User.create({
        name: data.name,
        email: data.email,
        password: hash,
        role: 'employee',
        department: req.user.department,
        isActive: true,
      });
    }

    res.status(201).json({
      success: true,
      message: 'تم إضافة الموظف بنجاح',
      employee,
      loginInfo: {
        email: data.email,
        password: defaultPassword,
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني مستخدم مسبقاً' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});
module.exports = router;
// جلب موظف بالإيميل
router.get('/by-email/:email', protect, async (req, res) => {
  try {
    const employee = await Employee.findOne({ email: req.params.email });
    res.json({ success: true, employee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});