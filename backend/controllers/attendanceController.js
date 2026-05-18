const Attendance = require('../models/Attendance');

// @route  GET /api/attendance
const getAttendance = async (req, res) => {
  try {
    const { employee, month, year } = req.query;
    const filter = {};
    if (employee) filter.employee = employee;

    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      filter.date = { $gte: start, $lte: end };
    }

    const records = await Attendance.find(filter)
      .populate('employee', 'name employeeId department')
      .sort({ date: -1 });

    res.json({ success: true, count: records.length, records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route  GET /api/attendance/today
const getTodayAttendance = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const records = await Attendance.find({
      date: { $gte: today, $lt: tomorrow },
    }).populate('employee', 'name employeeId department');

    const summary = {
      present: records.filter((r) => r.status === 'present').length,
      absent: records.filter((r) => r.status === 'absent').length,
      on_leave: records.filter((r) => r.status === 'on_leave').length,
      late: records.filter((r) => r.status === 'late').length,
    };

    res.json({ success: true, records, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route  POST /api/attendance
const createAttendance = async (req, res) => {
  try {
    const record = await Attendance.create(req.body);
    res.status(201).json({ success: true, message: 'تم تسجيل الحضور', record });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'تم تسجيل حضور هذا الموظف مسبقاً لهذا اليوم' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route  PUT /api/attendance/:id
const updateAttendance = async (req, res) => {
  try {
    const record = await Attendance.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, message: 'تم تحديث سجل الحضور', record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route  GET /api/attendance/stats/:employeeId
const getEmployeeAttendanceStats = async (req, res) => {
  try {
    const records = await Attendance.find({ employee: req.params.employeeId });
    const total = records.length;
    const present = records.filter((r) => r.status === 'present').length;
    const absent = records.filter((r) => r.status === 'absent').length;
    const onLeave = records.filter((r) => r.status === 'on_leave').length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

    res.json({ success: true, stats: { total, present, absent, onLeave, rate } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAttendance, getTodayAttendance, createAttendance, updateAttendance, getEmployeeAttendanceStats };
