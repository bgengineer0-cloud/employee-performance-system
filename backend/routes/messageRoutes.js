const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Message = require('../models/Message');
const User = require('../models/User');
const Employee = require('../models/Employee');
const bcrypt = require('bcryptjs');

// ── دالة مساعدة ──────────────────────────────────────
const ensureUserAccount = async (emp) => {
  let user = await User.findOne({ email: emp.email });
  if (!user) {
    const password = emp.name.replace(/\s+/g, '').slice(0, 6) + '123';
    const hash = await bcrypt.hash(password, 10);
    user = await User.create({
      name: emp.name,
      email: emp.email,
      password: hash,
      role: 'employee',
      department: emp.department,
      isActive: true,
    });
  }
  return user;
};

// ── GET /api/messages/users ─────────────────────────
// جلب كل جهات الاتصال — جميع الموظفين + المديرين
router.get('/users', protect, async (req, res) => {
  try {
    // جلب كل الموظفين النشطين
    const employees = await Employee.find({
      status: { $ne: 'terminated' },
    });

    // ضمان وجود حساب لكل موظف
    const employeeContacts = await Promise.all(
      employees.map(async (emp) => {
        const user = await ensureUserAccount(emp);
        // استثناء المستخدم الحالي
        if (user._id.toString() === req.user._id.toString()) return null;
        return {
          _id: user._id,           // userId للرسائل
          employeeDocId: emp._id,
          name: emp.name,
          email: emp.email,
          role: 'employee',
          department: emp.department,
          position: emp.position,
          employeeId: emp.employeeId,
        };
      })
    );

    // جلب المديرين الذين ليسوا موظفين
    const empEmails = employees.map(e => e.email);
    const managers = await User.find({
      _id: { $ne: req.user._id },
      isActive: true,
      role: { $in: ['admin', 'manager'] },
      email: { $nin: empEmails }
    }).select('-password');

    const managerContacts = managers.map(m => ({
      _id: m._id,
      name: m.name,
      email: m.email,
      role: m.role,
      department: m.department,
      position: m.role === 'admin' ? 'مدير النظام' : 'مدير',
    }));

    // دمج وتصفية القائمة
    const allContacts = [
      ...managerContacts,
      ...employeeContacts.filter(Boolean)
    ];

    res.json({ success: true, users: allContacts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /api/messages/conversation/:userId ──────────
router.get('/conversation/:userId', protect, async (req, res) => {
  try {
    const otherId = req.params.userId;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { sender: myId, recipient: otherId },
        { sender: otherId, recipient: myId }
      ]
    })
      .populate('sender', 'name email')
      .populate('recipient', 'name email')
      .sort({ createdAt: 1 });

    // تحديد رسائل الطرف الآخر كمقروءة
    await Message.updateMany(
      { sender: otherId, recipient: myId, isRead: false },
      { isRead: true }
    );

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /api/messages ──────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const { recipient, content } = req.body;

    if (!recipient || !content?.trim()) {
      return res.status(400).json({ success: false, message: 'المستلم والمحتوى مطلوبان' });
    }

    // التحقق من وجود المستلم
    const recipientUser = await User.findById(recipient);
    if (!recipientUser) {
      return res.status(404).json({ success: false, message: 'المستلم غير موجود' });
    }

    const message = await Message.create({
      sender: req.user._id,
      recipient,
      content: content.trim(),
    });

    const populated = await Message.findById(message._id)
      .populate('sender', 'name email')
      .populate('recipient', 'name email');

    res.status(201).json({ success: true, message: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /api/messages/unread-count ──────────────────
router.get('/unread-count', protect, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      recipient: req.user._id,
      isRead: false
    });
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /api/messages ────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ sender: req.user._id }, { recipient: req.user._id }]
    })
      .populate('sender', 'name email')
      .populate('recipient', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;