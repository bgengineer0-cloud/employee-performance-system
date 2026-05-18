const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Task = require('../models/Task');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const Message = require('../models/Message');

// GET /api/notifications
router.get('/', protect, async (req, res) => {
  try {
    const notifications = [];
    const now = new Date();

    // مهام متأخرة
    const overdueTasks = await Task.find({
      status: { $in: ['pending', 'in_progress'] },
      dueDate: { $lt: now }
    }).populate('assignedTo', 'name');

    overdueTasks.forEach(task => {
      notifications.push({
        _id: `task-overdue-${task._id}`,
        type: 'warning',
        icon: '⚠',
        title: 'مهمة متأخرة',
        message: `"${task.title}" — ${task.assignedTo?.name || 'موظف'}`,
        time: task.dueDate,
        color: '#A32D2D',
        bg: '#FCEBEB',
      });
    });

    // مهام مكتملة اليوم
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const completedToday = await Task.find({
      status: 'completed',
      completedAt: { $gte: todayStart }
    }).populate('assignedTo', 'name');

    completedToday.forEach(task => {
      notifications.push({
        _id: `task-done-${task._id}`,
        type: 'success',
        icon: '✓',
        title: 'مهمة مكتملة',
        message: `"${task.title}" — ${task.assignedTo?.name || 'موظف'}`,
        time: task.completedAt,
        color: '#1D9E75',
        bg: '#E1F5EE',
      });
    });

    // غياب اليوم
    const absentToday = await Attendance.find({
      date: { $gte: todayStart },
      status: 'absent'
    }).populate('employee', 'name');

    absentToday.forEach(att => {
      notifications.push({
        _id: `absent-${att._id}`,
        type: 'info',
        icon: '👤',
        title: 'غياب بدون إذن',
        message: att.employee?.name || 'موظف',
        time: att.date,
        color: '#BA7517',
        bg: '#FAEEDA',
      });
    });

    // رسائل غير مقروءة
    const unreadMessages = await Message.find({
      recipient: req.user._id,
      isRead: false
    }).populate('sender', 'name');

    unreadMessages.forEach(msg => {
      notifications.push({
        _id: `msg-${msg._id}`,
        type: 'message',
        icon: '✉',
        title: 'رسالة جديدة',
        message: `من ${msg.sender?.name}: ${msg.content.slice(0, 40)}...`,
        time: msg.createdAt,
        color: '#534AB7',
        bg: '#EEEDFE',
      });
    });

    // ترتيب حسب الوقت
    notifications.sort((a, b) => new Date(b.time) - new Date(a.time));

    res.json({
      success: true,
      count: notifications.length,
      notifications: notifications.slice(0, 20)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;