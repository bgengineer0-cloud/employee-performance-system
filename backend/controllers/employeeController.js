const Employee = require('../models/Employee');
const Task = require('../models/Task');
const Evaluation = require('../models/Evaluation');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @route GET /api/employees
const getEmployees = async (req, res) => {
  try {
    const { department, status, search } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (status) filter.status = status;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const employees = await Employee.find(filter)
      .populate('managerId', 'name email')
      .sort({ createdAt: -1 });

    const enriched = await Promise.all(
      employees.map(async (emp) => {
        const evals = await Evaluation.find({ employee: emp._id });
        const avgScore = evals.length > 0
          ? evals.reduce((sum, e) => sum + e.overallScore, 0) / evals.length
          : 0;
        const tasks = await Task.find({ assignedTo: emp._id });
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const taskRate = tasks.length > 0
          ? Math.round((completedTasks / tasks.length) * 100)
          : 0;
        return {
          ...emp.toObject(),
          avgEvalScore: parseFloat(avgScore.toFixed(1)),
          taskCompletionRate: taskRate,
          totalTasks: tasks.length,
        };
      })
    );

    res.json({ success: true, count: enriched.length, employees: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route GET /api/employees/:id
const getEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('managerId', 'name email');
    if (!employee) {
      return res.status(404).json({ success: false, message: 'الموظف غير موجود' });
    }
    const tasks = await Task.find({ assignedTo: employee._id })
      .sort({ dueDate: -1 }).limit(10);
    const evaluations = await Evaluation.find({ employee: employee._id })
      .populate('evaluatedBy', 'name').sort({ createdAt: -1 });
    const attendance = await Attendance.find({ employee: employee._id })
      .sort({ date: -1 }).limit(30);

    res.json({ success: true, employee, tasks, evaluations, attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route POST /api/employees
const createEmployee = async (req, res) => {
  try {
    const employeeId = await Employee.generateId();
    const data = { ...req.body, employeeId };

    if (!data.managerId || data.managerId === '') delete data.managerId;
    if (!data.phone || data.phone === '') delete data.phone;
    if (!data.notes || data.notes === '') delete data.notes;

    // التحقق من عدم تكرار الإيميل
    const existingEmp = await Employee.findOne({ email: data.email });
    if (existingEmp) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مستخدم مسبقاً'
      });
    }

    // إنشاء الموظف
    const employee = await Employee.create(data);

    // إنشاء كلمة مرور افتراضية
    const namePart = data.name
      .replace(/\s+/g, '')
      .slice(0, 6);
    const defaultPassword = namePart + '123';

    // إنشاء حساب دخول تلقائي
    const existingUser = await User.findOne({ email: data.email });
    if (!existingUser) {
      const hash = await bcrypt.hash(defaultPassword, 10);
      await User.collection.insertOne({
        name: data.name,
        email: data.email,
        password: hash,
        role: 'employee',
        department: data.department,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    res.status(201).json({
      success: true,
      message: 'تم إضافة الموظف وإنشاء حساب الدخول بنجاح',
      employee,
      loginInfo: {
        email: data.email,
        password: defaultPassword,
        note: 'يمكن للموظف تغيير كلمة المرور من الإعدادات'
      }
    });
  } catch (error) {
    console.error('Create employee error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مستخدم مسبقاً'
      });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors)
        .map(e => e.message).join(', ');
      return res.status(400).json({ success: false, message: messages });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route PUT /api/employees/:id
const updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'الموظف غير موجود'
      });
    }

    // تحديث بيانات المستخدم أيضاً
    await User.findOneAndUpdate(
      { email: employee.email },
      { name: employee.name, department: employee.department }
    );

    res.json({ success: true, message: 'تم تحديث بيانات الموظف', employee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route DELETE /api/employees/:id
const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'الموظف غير موجود'
      });
    }
    employee.status = 'terminated';
    await employee.save();

    // تعطيل حساب الدخول
    await User.findOneAndUpdate(
      { email: employee.email },
      { isActive: false }
    );

    res.json({ success: true, message: 'تم إنهاء خدمة الموظف' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee
};