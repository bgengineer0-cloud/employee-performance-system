const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const Department = require('../models/Department');
const User = require('../models/User');
const Employee = require('../models/Employee');
const bcrypt = require('bcryptjs');

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
});

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