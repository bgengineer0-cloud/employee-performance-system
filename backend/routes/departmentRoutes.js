const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const Department = require('../models/Department');
const User = require('../models/User');
const Employee = require('../models/Employee');
const bcrypt = require('bcryptjs');
// GET /api/departments/available-managers — موظفون بمنصب "مدير" بدون قسم مُدار حالياً
// GET /api/departments/available-managers — كل الموظفين (لاختيار أي منهم كمدير)
router.get('/available-managers', protect, authorize('admin'), async (req, res) => {
  try {
    // جلب كل الموظفين النشطين
    const employees = await Employee.find({
      status: { $ne: 'terminated' }
    }).sort({ name: 1 });

    // جلب الأقسام الحالية لمعرفة من هو مدير فعلاً الآن (role: manager)
    const departments = await Department.find({ isActive: true });
    const assignedManagerEmails = departments
      .filter(d => d.managerEmail)
      .map(d => d.managerEmail);

    // جلب أدوار المستخدمين الحاليين لمعرفة من هو manager بالفعل
    const users = await User.find({ email: { $in: employees.map(e => e.email) } });
    const userRoleMap = {};
    users.forEach(u => { userRoleMap[u.email] = u.role; });

    const result = employees.map(emp => ({
      _id: emp._id,
      name: emp.name,
      email: emp.email,
      department: emp.department,
      position: emp.position,
      currentRole: userRoleMap[emp.email] || 'employee',
      isCurrentlyManaging: assignedManagerEmails.includes(emp.email),
    }));

    res.json({ success: true, employees: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// GET /api/departments — جلب كل الأقسام
router.get('/', protect, async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true })
      .populate('manager', 'name email')
      .sort({ createdAt: -1 });

    // إضافة عدد الموظفين لكل قسم
    const enriched = await Promise.all(
      departments.map(async (dept) => {
        const count = await Employee.countDocuments({
          department: dept.name,
          status: { $ne: 'terminated' }
        });
        return { ...dept.toObject(), employeeCount: count };
      })
    );

    res.json({ success: true, departments: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/departments/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id)
      .populate('manager', 'name email role');
    if (!dept) {
      return res.status(404).json({ success: false, message: 'القسم غير موجود' });
    }
    res.json({ success: true, department: dept });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
/*
// POST /api/departments — إنشاء قسم جديد مع حساب مدير
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const {
      name, description, color, icon,
      managerName, managerEmail, managerPassword
    } = req.body;

    // التحقق من عدم تكرار اسم القسم
    const existing = await Department.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'يوجد قسم بهذا الاسم مسبقاً'
      });
    }

    let managerId = null;

    // إنشاء حساب مدير القسم إذا تم تزويد بياناته
    if (managerEmail && managerName) {
      const existingUser = await User.findOne({ email: managerEmail });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'البريد الإلكتروني لمدير القسم مستخدم مسبقاً'
        });
      }

      const password = managerPassword || managerName.replace(/\s+/g, '').slice(0, 6) + '123';
      const hash = await bcrypt.hash(password, 10);

      const managerUser = await User.create({
        name: managerName,
        email: managerEmail,
        password: hash,
        role: 'manager',
        department: name.trim(),
        isActive: true,
      });

      managerId = managerUser._id;
    }

    // إنشاء القسم
    const department = await Department.create({
      name: name.trim(),
      description: description || '',
      manager: managerId,
      managerName: managerName || '',
      managerEmail: managerEmail || '',
      color: color || '#1D9E75',
      icon: icon || '🏢',
    });

    const populated = await Department.findById(department._id)
      .populate('manager', 'name email');

    res.status(201).json({
      success: true,
      message: 'تم إنشاء القسم بنجاح',
      department: populated,
      managerCredentials: managerId ? {
        email: managerEmail,
        password: managerPassword || managerName.replace(/\s+/g, '').slice(0, 6) + '123',
      } : null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});*/
// POST /api/departments — إنشاء قسم جديد مع اختيار مدير من الموظفين
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, description, color, icon, managerId } = req.body;

    const existing = await Department.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'يوجد قسم بهذا الاسم مسبقاً'
      });
    }

    let manager = null;
    let managerName = '';
    let managerEmail = '';
    let managerCredentials = null;

    if (managerId) {
      const selectedEmployee = await Employee.findById(managerId);
      if (!selectedEmployee) {
        return res.status(404).json({ success: false, message: 'الموظف المحدد غير موجود' });
      }

      managerName = selectedEmployee.name;
      managerEmail = selectedEmployee.email;

      // نقل الموظف لهذا القسم (بدون تغيير المسمى الوظيفي)
      selectedEmployee.department = name.trim();
      await selectedEmployee.save();

      // رفع الدور (role) فقط إلى manager
      let managerUser = await User.findOne({ email: managerEmail });

      if (managerUser) {
        managerUser.role = 'manager';
        managerUser.department = name.trim();
        await managerUser.save();
        console.log('✅ User role upgraded to manager:', managerUser.email);
      } else {
        const password = managerName.replace(/\s+/g, '').slice(0, 6) + '123';
        const hash = await bcrypt.hash(password, 10);
        managerUser = await User.create({
          name: managerName,
          email: managerEmail,
          password: hash,
          role: 'manager',
          department: name.trim(),
          isActive: true,
        });
        managerCredentials = { email: managerEmail, password };
        console.log('✅ New manager user created:', managerUser.email);
      }

      manager = managerUser._id;
    }

    const department = await Department.create({
      name: name.trim(),
      description: description || '',
      manager,
      managerName,
      managerEmail,
      color: color || '#1D9E75',
      icon: icon || '🏢',
    });

    const populated = await Department.findById(department._id)
      .populate('manager', 'name email');

    res.status(201).json({
      success: true,
      message: 'تم إنشاء القسم بنجاح',
      department: populated,
      managerCredentials,
    });
  } catch (error) {
    console.error('❌ Error creating department:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});
/*
// POST /api/departments — إنشاء قسم جديد مع حساب مدير
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const {
      name, description, color, icon,
      managerName, managerEmail, managerPassword
    } = req.body;

    // التحقق من عدم تكرار اسم القسم
    const existing = await Department.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'يوجد قسم بهذا الاسم مسبقاً'
      });
    }

    let managerId = null;
    let managerCredentials = null;

    // إنشاء حساب مدير القسم إذا تم تزويد بياناته
    if (managerEmail && managerName) {
      const existingUser = await User.findOne({ email: managerEmail });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'البريد الإلكتروني لمدير القسم مستخدم مسبقاً'
        });
      }

      const password = managerPassword || managerName.replace(/\s+/g, '').slice(0, 6) + '123';
      const hash = await bcrypt.hash(password, 10);

      // إنشاء حساب User للمدير
      const managerUser = await User.create({
        name: managerName,
        email: managerEmail,
        password: hash,
        role: 'manager',
        department: name.trim(),
        isActive: true,
      });

      managerId = managerUser._id;
      managerCredentials = { email: managerEmail, password };

      // ── إضافة المدير كسجل Employee أيضاً ──────────
      const existingEmp = await Employee.findOne({ email: managerEmail });
      if (!existingEmp) {
        const employeeId = await Employee.generateId();
        await Employee.create({
          employeeId,
          name: managerName,
          email: managerEmail,
          department: name.trim(),
          position: 'مدير القسم',
          status: 'active',
          hireDate: new Date(),
          managerId: null, // المدير لا يتبع لمدير آخر
          performanceScore: 0,
          notes: 'مدير القسم — تم الإنشاء تلقائياً',
        });
      }
    }

    // إنشاء القسم
    const department = await Department.create({
      name: name.trim(),
      description: description || '',
      manager: managerId,
      managerName: managerName || '',
      managerEmail: managerEmail || '',
      color: color || '#1D9E75',
      icon: icon || '🏢',
    });

    const populated = await Department.findById(department._id)
      .populate('manager', 'name email');

    res.status(201).json({
      success: true,
      message: 'تم إنشاء القسم بنجاح',
      department: populated,
      managerCredentials,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});*/
/*
// PUT /api/departments/:id — تعديل قسم
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, description, color, icon, isActive } = req.body;

    const dept = await Department.findById(req.params.id);
    if (!dept) {
      return res.status(404).json({ success: false, message: 'القسم غير موجود' });
    }

    const oldName = dept.name;

    if (name) dept.name = name.trim();
    if (description !== undefined) dept.description = description;
    if (color) dept.color = color;
    if (icon) dept.icon = icon;
    if (typeof isActive === 'boolean') dept.isActive = isActive;

    await dept.save();

    // تحديث اسم القسم في الموظفين إذا تغيّر
    if (name && name.trim() !== oldName) {
      await Employee.updateMany(
        { department: oldName },
        { department: name.trim() }
      );
      await User.updateMany(
        { department: oldName },
        { department: name.trim() }
      );
    }

    res.json({ success: true, message: 'تم تحديث القسم', department: dept });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/departments/:id — حذف قسم
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) {
      return res.status(404).json({ success: false, message: 'القسم غير موجود' });
    }

    const empCount = await Employee.countDocuments({
      department: dept.name,
      status: { $ne: 'terminated' }
    });

    if (empCount > 0) {
      return res.status(400).json({
        success: false,
        message: `لا يمكن حذف القسم — يوجد ${empCount} موظف نشط`
      });
    }

    await Department.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'تم حذف القسم' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});*/
// DELETE /api/departments/:id — حذف قسم وكل موظفيه نهائياً
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) {
      return res.status(404).json({ success: false, message: 'القسم غير موجود' });
    }

    // جلب كل موظفي القسم
    const employees = await Employee.find({ department: dept.name });
    const employeeEmails = employees.map(e => e.email);

    console.log(`🗑 Deleting department "${dept.name}" with ${employees.length} employees`);

    // حذف كل المهام المرتبطة بهؤلاء الموظفين
    const Task = require('../models/Task');
    const employeeIds = employees.map(e => e._id);
    const tasksDeleted = await Task.deleteMany({ assignedTo: { $in: employeeIds } });
    console.log(`🗑 Deleted ${tasksDeleted.deletedCount} tasks`);

    // حذف سجلات الحضور
    const Attendance = require('../models/Attendance');
    const attendanceDeleted = await Attendance.deleteMany({ employee: { $in: employeeIds } });
    console.log(`🗑 Deleted ${attendanceDeleted.deletedCount} attendance records`);

    // حذف التقييمات
    const Evaluation = require('../models/Evaluation');
    const evalDeleted = await Evaluation.deleteMany({ employee: { $in: employeeIds } });
    console.log(`🗑 Deleted ${evalDeleted.deletedCount} evaluations`);

    // حذف الرسائل المرتبطة بحسابات هؤلاء الموظفين
    const Message = require('../models/Message');
    const usersToDelete = await User.find({ email: { $in: employeeEmails } });
    const userIds = usersToDelete.map(u => u._id);
    const msgDeleted = await Message.deleteMany({
      $or: [
        { sender: { $in: userIds } },
        { recipient: { $in: userIds } }
      ]
    });
    console.log(`🗑 Deleted ${msgDeleted.deletedCount} messages`);

    // حذف حسابات المستخدمين (Users) لكل موظفي القسم
    const usersDeleted = await User.deleteMany({ email: { $in: employeeEmails } });
    console.log(`🗑 Deleted ${usersDeleted.deletedCount} user accounts`);

    // حذف سجلات الموظفين نفسها
    const empDeleted = await Employee.deleteMany({ department: dept.name });
    console.log(`🗑 Deleted ${empDeleted.deletedCount} employee records`);

    // حذف القسم نفسه
    await Department.findByIdAndDelete(req.params.id);
    console.log(`✅ Department "${dept.name}" deleted completely`);

    res.json({
      success: true,
      message: `تم حذف القسم وجميع موظفيه (${employees.length} موظف) نهائياً`,
      deletedCount: {
        employees: empDeleted.deletedCount,
        users: usersDeleted.deletedCount,
        tasks: tasksDeleted.deletedCount,
        attendance: attendanceDeleted.deletedCount,
        evaluations: evalDeleted.deletedCount,
        messages: msgDeleted.deletedCount,
      }
    });
  } catch (error) {
    console.error('❌ Error deleting department:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/departments/:id — تعديل قسم
// PUT /api/departments/:id — تعديل قسم مع اختيار/تغيير المدير
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, description, color, icon, isActive, managerId } = req.body;

    const dept = await Department.findById(req.params.id);
    if (!dept) {
      return res.status(404).json({ success: false, message: 'القسم غير موجود' });
    }

    const oldName = dept.name;
    let managerCredentials = null;

    if (name) dept.name = name.trim();
    if (description !== undefined) dept.description = description;
    if (color) dept.color = color;
    if (icon) dept.icon = icon;
    if (typeof isActive === 'boolean') dept.isActive = isActive;

    // إذا تم تحديد مدير جديد (مختلف عن الحالي)
    if (managerId && String(dept.manager) !== String(managerId)) {
      const selectedEmployee = await Employee.findById(managerId);
      if (!selectedEmployee) {
        return res.status(404).json({ success: false, message: 'الموظف المحدد غير موجود' });
      }

      selectedEmployee.department = dept.name;
     
      await selectedEmployee.save();

      let managerUser = await User.findOne({ email: selectedEmployee.email });

      if (managerUser) {
        managerUser.role = 'manager';
        managerUser.department = dept.name;
        await managerUser.save();
      } else {
        const password = selectedEmployee.name.replace(/\s+/g, '').slice(0, 6) + '123';
        const hash = await bcrypt.hash(password, 10);
        managerUser = await User.create({
          name: selectedEmployee.name,
          email: selectedEmployee.email,
          password: hash,
          role: 'manager',
          department: dept.name,
          isActive: true,
        });
        managerCredentials = { email: selectedEmployee.email, password };
      }

      dept.manager = managerUser._id;
      dept.managerName = selectedEmployee.name;
      dept.managerEmail = selectedEmployee.email;
    }

    await dept.save();

    // تحديث اسم القسم في الموظفين إذا تغيّر
    if (name && name.trim() !== oldName) {
      await Employee.updateMany({ department: oldName }, { department: name.trim() });
      await User.updateMany({ department: oldName }, { department: name.trim() });
    }

    res.json({
      success: true,
      message: 'تم تحديث القسم',
      department: dept,
      managerCredentials
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// GET /api/departments/:id/employees — موظفو القسم
router.get('/:id/employees', protect, async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) {
      return res.status(404).json({ success: false, message: 'القسم غير موجود' });
    }

    const employees = await Employee.find({
      department: dept.name,
      status: { $ne: 'terminated' }
    });

    res.json({ success: true, employees, department: dept });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;