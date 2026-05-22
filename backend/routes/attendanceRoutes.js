const express = require('express');
const router = express.Router();
const { getAttendance, getTodayAttendance, createAttendance, updateAttendance, getEmployeeAttendanceStats } = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, getAttendance);
router.get('/today', protect, getTodayAttendance);
router.get('/stats/:employeeId', protect, getEmployeeAttendanceStats);
router.post('/', protect, authorize('admin', 'manager'), createAttendance);
router.put('/:id', protect, authorize('admin', 'manager'), updateAttendance);

module.exports = router;