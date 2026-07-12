const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const Task = require('../models/Task');
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
} = require('../controllers/employeeController');

// ── 1. GET /api/employees/my-department ─────────── مهم: قبل /:id
router.get('/my-department', protect, async (req, res) => {
  try {
    const userDept = req.user.department?.trim();
    console.log('👤 Manager:', req.user.name, '| Department:', userDept);

    if (!userDept) {
      return res.status(400).json({
        success: false,
        message: 'لم يتم تحديد قسم لهذا المدير'
      });
    }

    const employees = await Employee.find({
      department: { $regex: new RegExp(`^${userDept}$`, 'i') },
      status: { $ne: 'terminated' }
    }).sort({ createdAt: -1 });

    console.log(`✅ Found ${employees.length} employees in: ${userDept}`);

    const enriched = await Promise.all(
      employees.map(async (emp) => {
        const tasks = await Task.find({ assignedTo: emp._id });
        const completed = tasks.filter(t => t.status === 'completed').length;
        return {
          ...emp.toObject(),
          taskCompletionRate: tasks.length > 0
            ? Math.round((completed / tasks.length) * 100) : 0,
          totalTasks: tasks.length,
        };
      })
    );

    res.json({
      success: true,
      employees: enriched,
      department: userDept,
      total: enriched.length
    });
  } catch (error) {
    console.error('❌ my-department error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── 2. POST /api/employees/my-department ────────── مهم: قبل /:id
router.post('/my-department', protect, authorize('manager', 'admin'), async (req, res) => {
  try {
    const User = require('../models/User');
    const bcrypt = require('bcryptjs');

    const managerDept = req.user.department?.trim();
    if (!managerDept) {
      return res.status(400).json({
        success: false,
        message: 'لم يتم تحديد قسم لهذا المدير'
      });
    }

    const employeeId = await Employee.generateId();
    const data = {
      ...req.body,
      employeeId,
      department: managerDept,
      managerId: req.user._id,
    };

    if (!data.phone) delete data.phone;
    if (!data.notes) delete data.notes;
    data.email = data.email?.toLowerCase().trim();

    const existingEmp = await Employee.findOne({ email: data.email });
    if (existingEmp) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مستخدم مسبقاً'
      });
    }

    const employee = await Employee.create(data);

    const defaultPassword = data.name.replace(/\s+/g, '').slice(0, 6) + '123';
    const existingUser = await User.findOne({ email: data.email });
    if (!existingUser) {
      const hash = await bcrypt.hash(defaultPassword, 10);
      await User.create({
        name: data.name,
        email: data.email,
        password: hash,
        role: 'employee',
        department: managerDept,
        isActive: true,
      });
    }

    console.log(`✅ Employee added to "${managerDept}":`, employee.name);

    res.status(201).json({
      success: true,
      message: 'تم إضافة الموظف بنجاح',
      employee,
      loginInfo: { email: data.email, password: defaultPassword }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مستخدم مسبقاً'
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── 3. GET /api/employees/sync-department ────────── مهم: قبل /:id
router.get('/sync-department', protect, authorize('admin'), async (req, res) => {
  try {
    const Department = require('../models/Department');
    const User = require('../models/User');
    const departments = await Department.find({ isActive: true });
    let fixed = 0;

    for (const dept of departments) {
      if (dept.managerEmail) {
        const user = await User.findOne({ email: dept.managerEmail });
        if (user && user.department?.trim() !== dept.name?.trim()) {
          user.department = dept.name.trim();
          await user.save();
          fixed++;
        }
      }
    }
    res.json({ success: true, fixed });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── 4. GET /api/employees/by-email/:email ────────── مهم: قبل /:id
router.get('/by-email/:email', protect, async (req, res) => {
  try {
    const employee = await Employee.findOne({ email: req.params.email });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'الموظف غير موجود' });
    }
    res.json({ success: true, employee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── 5. باقي الـ Routes العامة ──────────────────────
router.get('/', protect, getEmployees);
router.post('/', protect, authorize('admin', 'manager'), createEmployee);

// ── 6. Routes بـ /:id — يجب أن تكون أخيراً دائماً ──
router.get('/:id', protect, getEmployee);

router.put('/:id', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'الموظف غير موجود' });
    }

    if (req.user.role === 'manager' && employee.department !== req.user.department) {
      return res.status(403).json({ success: false, message: 'لا يمكنك تعديل موظف من قسم آخر' });
    }

    const { name, email, department, position, phone, hireDate, status, notes } = req.body;
    const oldEmail = employee.email;

    if (name) employee.name = name.trim();
    if (email) employee.email = email.trim().toLowerCase();
    if (department) employee.department = department;
    if (position) employee.position = position.trim();
    if (phone !== undefined) employee.phone = phone.trim();
    if (hireDate) employee.hireDate = hireDate;
    if (status) employee.status = status;
    if (notes !== undefined) employee.notes = notes;

    if (email && email.trim().toLowerCase() !== oldEmail) {
      const existing = await Employee.findOne({
        email: email.trim().toLowerCase(),
        _id: { $ne: employee._id }
      });
      if (existing) {
        return res.status(400).json({ success: false, message: 'البريد الإلكتروني مستخدم لموظف آخر' });
      }
    }

    await employee.save();

    const User = require('../models/User');
    const userAccount = await User.findOne({ email: oldEmail });
    if (userAccount) {
      if (name) userAccount.name = name.trim();
      if (email) userAccount.email = email.trim().toLowerCase();
      if (department) userAccount.department = department;
      await userAccount.save();
    }

    res.json({ success: true, message: 'تم تحديث بيانات الموظف', employee });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني مستخدم مسبقاً' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    console.log('🔍 DELETE request for employee ID:', req.params.id);

    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'الموظف غير موجود' });
    }

    if (req.user.role === 'manager' && employee.department !== req.user.department) {
      return res.status(403).json({ success: false, message: 'لا يمكنك حذف موظف من قسم آخر' });
    }

    const Task = require('../models/Task');
    await Task.deleteMany({ assignedTo: employee._id });

    const Attendance = require('../models/Attendance');
    await Attendance.deleteMany({ employee: employee._id });

    const Evaluation = require('../models/Evaluation');
    await Evaluation.deleteMany({ employee: employee._id });

    const User = require('../models/User');
    const userDeleted = await User.findOneAndDelete({ email: employee.email });

    if (userDeleted) {
      const Message = require('../models/Message');
      await Message.deleteMany({
        $or: [{ sender: userDeleted._id }, { recipient: userDeleted._id }]
      });
    }

    await Employee.findByIdAndDelete(req.params.id);
    console.log('✅ Employee deleted:', employee.name);

    res.json({
      success: true,
      message: `تم حذف "${employee.name}" نهائياً`,
      freedEmail: employee.email,
    });
  } catch (error) {
    console.error('❌ Delete error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;