const Task = require('../models/Task');

// GET /api/tasks
const getTasks = async (req, res) => {
  try {
    const { status, priority, assignedTo } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name employeeId department')
      .populate('assignedBy', 'name')
      .populate('backupEmployee', 'name employeeId')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: tasks.length, tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/tasks/:id
const getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name employeeId department position status')
      .populate('assignedBy', 'name email')
      .populate('backupEmployee', 'name employeeId');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'المهمة غير موجودة'
      });
    }
    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/tasks
const createTask = async (req, res) => {
  try {
    const task = await Task.create({
      ...req.body,
      assignedBy: req.user._id
    });

    const populated = await Task.findById(task._id)
      .populate('assignedTo', 'name employeeId')
      .populate('assignedBy', 'name');

    res.status(201).json({
      success: true,
      message: 'تم إنشاء المهمة بنجاح',
      task: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/tasks/:id — تحديث المهمة كاملة
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'المهمة غير موجودة'
      });
    }

    // تحديث الحقول
    const allowedFields = [
      'title', 'description', 'status', 'priority',
      'dueDate', 'managerNotes', 'backupEmployee', 'steps'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        task[field] = req.body[field];
      }
    });

    // إذا اكتملت المهمة
    if (req.body.status === 'completed' && !task.completedAt) {
      task.completedAt = new Date();
    }

    await task.save();

    const updated = await Task.findById(task._id)
      .populate('assignedTo', 'name employeeId')
      .populate('assignedBy', 'name');

    res.json({ success: true, message: 'تم تحديث المهمة', task: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/tasks/:id/step/:stepId — تحديث خطوة
const updateStep = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'المهمة غير موجودة'
      });
    }

    const step = task.steps.id(req.params.stepId);
    if (!step) {
      return res.status(404).json({
        success: false,
        message: 'الخطوة غير موجودة'
      });
    }

    step.isCompleted = req.body.isCompleted;
    if (req.body.notes) step.notes = req.body.notes;
    if (req.body.isCompleted) {
      step.completedAt = new Date();
      step.completedBy = req.user._id;
    } else {
      step.completedAt = null;
    }

    // إذا اكتملت كل الخطوات → أكمل المهمة
    if (task.steps.every(s => s.isCompleted)) {
      task.status = 'completed';
      task.completedAt = new Date();
    } else if (task.status === 'completed') {
      task.status = 'in_progress';
      task.completedAt = null;
    }

    await task.save();
    res.json({ success: true, message: 'تم تحديث الخطوة', task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/tasks/:id/status — تغيير حالة المهمة فقط
const updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'in_progress', 'completed', 'overdue', 'postponed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'حالة غير صحيحة'
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'المهمة غير موجودة'
      });
    }

    task.status = status;
    if (status === 'completed') {
      task.completedAt = new Date();
      // إكمال جميع الخطوات تلقائياً
      task.steps.forEach(step => {
        if (!step.isCompleted) {
          step.isCompleted = true;
          step.completedAt = new Date();
        }
      });
    } else {
      task.completedAt = null;
    }

    await task.save();

    const updated = await Task.findById(task._id)
      .populate('assignedTo', 'name employeeId')
      .populate('assignedBy', 'name');

    res.json({ success: true, message: 'تم تحديث حالة المهمة', task: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/tasks/:id
const deleteTask = async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'تم حذف المهمة' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/tasks/continuity/:employeeId
const getContinuityPlan = async (req, res) => {
  try {
    const tasks = await Task.find({
      assignedTo: req.params.employeeId,
      status: { $in: ['pending', 'in_progress'] }
    })
      .populate('backupEmployee', 'name employeeId department')
      .populate('assignedTo', 'name status');

    res.json({ success: true, tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getTasks,
  getTask,
  createTask,
  updateTask,
  updateStep,
  updateTaskStatus,
  deleteTask,
  getContinuityPlan
};