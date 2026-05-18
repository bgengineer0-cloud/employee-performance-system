const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Employee = require('../models/Employee');
const bcrypt = require('bcryptjs');

// ── دالة مساعدة لإنشاء كلمة مرور افتراضية ──────────
const makeDefaultPassword = (name) => {
  return name.replace(/\s+/g, '').slice(0, 6) + '123';
};

// ── دالة مساعدة لإنشاء حساب من بيانات الموظف ───────
const createUserAccount = async (emp) => {
  const existing = await User.findOne({ email: emp.email });
  if (existing) return existing;

  const password = makeDefaultPassword(emp.name);
  const hash = await bcrypt.hash(password, 10);

  const user = await User.create({
    name: emp.name,
    email: emp.email,
    password: hash,
    role: 'employee',
    department: emp.department,
    isActive: true,
  });

  return { user, password };
};

// ── GET /api/users/from-employees ────────────────────
// جلب كل المستخدمين مستنداً على جدول الموظفين
router.get('/from-employees', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    // جلب كل الموظفين
    const employees = await Employee.find({
      status: { $ne: 'terminated' }
    }).sort({ createdAt: -1 });

    // جلب المديرين الذين ليسوا موظفين
    const empEmails = employees.map(e => e.email);
    const managers = await User.find({
      email: { $nin: empEmails },
      role: { $in: ['admin', 'manager'] },
    }).select('-password');

    // بناء القائمة المدمجة
    const employeeList = await Promise.all(
      employees.map(async (emp) => {
        let userAccount = await User.findOne({ email: emp.email }).select('-password');

        // إنشاء حساب تلقائي إن لم يكن موجوداً
        if (!userAccount) {
          const result = await createUserAccount(emp);
          userAccount = result.user || result;
        }

        return {
          _id: emp._id,
          userId: userAccount?._id || null,
          name: emp.name,
          email: emp.email,
          department: emp.department,
          position: emp.position,
          employeeId: emp.employeeId,
          empStatus: emp.status,
          role: userAccount?.role || 'employee',
          isActive: userAccount?.isActive !== false,
          hasAccount: true,
          defaultPassword: makeDefaultPassword(emp.name),
          createdAt: emp.createdAt,
        };
      })
    );

    const managerList = managers.map(m => ({
      _id: m._id,
      userId: m._id,
      name: m.name,
      email: m.email,
      department: m.department,
      position: m.role === 'admin' ? 'مدير النظام' : 'مدير',
      employeeId: null,
      empStatus: 'active',
      role: m.role,
      isActive: m.isActive !== false,
      hasAccount: true,
      defaultPassword: null,
      createdAt: m.createdAt,
    }));

    res.json({
      success: true,
      users: [...managerList, ...employeeList]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /api/users/profile ───────────────────────────
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /api/users ───────────────────────────────────
router.get('/', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /api/users/:id ───────────────────────────────
router.get('/:id', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── PUT /api/users/profile ───────────────────────────
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, email, department, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (email) user.email = email;
    if (department) user.department = department;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'يرجى إدخال كلمة المرور الحالية' });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'كلمة المرور الحالية غير صحيحة' });
      }
      user.password = newPassword;
    }

    await user.save();

    res.json({
      success: true,
      message: 'تم تحديث البيانات',
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, department: user.department }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── PUT /api/users/:id ───────────────────────────────
// تعديل مستخدم من المشرف — مع إنشاء حساب إن لم يكن موجوداً
router.put('/:id', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { name, email, department, role, isActive, newPassword } = req.body;

    // محاولة إيجاد المستخدم في جدول User أولاً
    let user = await User.findById(req.params.id);

    if (!user) {
      // قد يكون الـ id هو id الموظف — نبحث بالإيميل
      const emp = await Employee.findById(req.params.id);
      if (!emp) {
        return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
      }

      // إنشاء حساب جديد للموظف
      const password = newPassword || makeDefaultPassword(emp.name);
      const hash = await bcrypt.hash(password, 10);
      user = await User.create({
        name: name || emp.name,
        email: email || emp.email,
        password: hash,
        role: role || 'employee',
        department: department || emp.department,
        isActive: isActive !== undefined ? isActive : true,
      });

      return res.json({
        success: true,
        message: 'تم إنشاء حساب الدخول بنجاح',
        user: { _id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive },
        created: true,
        password: newPassword || makeDefaultPassword(emp.name)
      });
    }

    // تحديث المستخدم الموجود
    if (name) user.name = name;
    if (email) user.email = email;
    if (department) user.department = department;
    if (role) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;
    if (newPassword) user.password = newPassword;

    await user.save();

    // تحديث بيانات الموظف أيضاً
    await Employee.findOneAndUpdate(
      { email: user.email },
      { name: user.name, department: user.department }
    );

    res.json({
      success: true,
      message: 'تم تحديث البيانات',
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني مستخدم مسبقاً' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── PATCH /api/users/:id/toggle-active ───────────────
router.patch('/:id/toggle-active', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    let user = await User.findById(req.params.id);

    if (!user) {
      // البحث بـ employeeId
      const emp = await Employee.findById(req.params.id);
      if (!emp) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });

      user = await User.findOne({ email: emp.email });
      if (!user) {
        // إنشاء حساب جديد
        const result = await createUserAccount(emp);
        return res.json({ success: true, message: 'تم إنشاء حساب وتفعيله', isActive: true });
      }
    }

    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, message: user.isActive ? 'تم تفعيل الحساب' : 'تم تعطيل الحساب', isActive: user.isActive });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── DELETE /api/users/:id ────────────────────────────
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'لا يمكنك حذف حسابك الخاص' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'تم حذف المستخدم' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;