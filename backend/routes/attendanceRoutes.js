const express = require('express');
const router = express.Router();
const {
  getAttendance,
  getTodayAttendance,
  createAttendance,
  updateAttendance,
  getEmployeeAttendanceStats
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');

// ── إعداد multer لرفع الملفات ────────────────────
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('يرجى رفع ملف Excel فقط (.xlsx أو .xls)'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// ── دالة تحليل وقت SmartPSS ─────────────────────
const parseSmartPSSTime = (timeStr) => {
  if (!timeStr) return null;
  const str = String(timeStr).trim();

  // صيغة SmartPSS: "2026/05/01 08:30:00" أو "2026-05-01 08:30:00"
  const patterns = [
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/,
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/,
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
  ];

  for (const pattern of patterns) {
    const match = str.match(pattern);
    if (match) {
      return new Date(str.replace(/\//g, '-'));
    }
  }

  // رقم Excel التسلسلي
  if (!isNaN(str) && str.length > 4) {
    const excelDate = XLSX.SSF.parse_date_code(parseFloat(str));
    if (excelDate) {
      return new Date(excelDate.y, excelDate.m - 1, excelDate.d, excelDate.H, excelDate.M);
    }
  }
  return null;
};

// ── دالة تنظيف اسم الموظف ────────────────────────
const cleanName = (name) => {
  if (!name) return '';
  return String(name).trim().replace(/\s+/g, ' ');
};

// ── دالة تحديد حالة الحضور ───────────────────────
const determineStatus = (checkIn, checkOut, workStartHour = 8) => {
  if (!checkIn) return 'absent';
  const hour = new Date(checkIn).getHours();
  const minutes = new Date(checkIn).getMinutes();
  const totalMinutes = hour * 60 + minutes;
  const workStart = workStartHour * 60;

  if (totalMinutes <= workStart + 15) return 'present';
  if (totalMinutes <= workStart + 60) return 'late';
  return 'late';
};

// ── POST /api/attendance/import-excel ────────────
router.post('/import-excel',
  protect,
  authorize('admin', 'manager'),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'يرجى رفع ملف Excel' });
      }

      // قراءة الملف
      const workbook = XLSX.read(req.file.buffer, {
        type: 'buffer',
        cellDates: true,
        dateNF: 'yyyy/mm/dd hh:mm:ss'
      });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        blankrows: false
      });

      if (rawData.length < 2) {
        return res.status(400).json({ success: false, message: 'الملف فارغ أو لا يحتوي على بيانات كافية' });
      }

      // استخراج الرؤوس
      const headers = rawData[0].map(h => String(h).trim().toLowerCase());
      console.log('رؤوس الأعمدة:', headers);

      // تحديد أعمدة SmartPSS الشائعة
      const colMap = {
        name: headers.findIndex(h =>
          h.includes('name') || h.includes('اسم') || h.includes('employee name') ||
          h.includes('الاسم') || h.includes('staff name')
        ),
        id: headers.findIndex(h =>
          h.includes('id') || h.includes('رقم') || h.includes('employee id') ||
          h.includes('staff id') || h.includes('no.')
        ),
        date: headers.findIndex(h =>
          h.includes('date') || h.includes('تاريخ') || h.includes('time') ||
          h.includes('check') || h.includes('clock')
        ),
        checkIn: headers.findIndex(h =>
          h.includes('check in') || h.includes('clock in') || h.includes('دخول') ||
          h.includes('in') || h.includes('arrival') || h.includes('first')
        ),
        checkOut: headers.findIndex(h =>
          h.includes('check out') || h.includes('clock out') || h.includes('خروج') ||
          h.includes('out') || h.includes('departure') || h.includes('last')
        ),
        dept: headers.findIndex(h =>
          h.includes('dept') || h.includes('department') || h.includes('قسم')
        ),
      };

      console.log('خريطة الأعمدة:', colMap);

      // معالجة البيانات
      const records = [];
      const errors = [];
      const skipped = [];

      for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.every(cell => !cell)) continue;

        try {
          // استخراج البيانات
          const empName = cleanName(
            colMap.name >= 0 ? row[colMap.name] :
            colMap.id >= 0 ? row[colMap.id] : row[0]
          );

          const empId = colMap.id >= 0 ? String(row[colMap.id] || '').trim() : '';

          // وقت الدخول
          let checkInTime = null;
          let checkOutTime = null;
          let recordDate = null;

          if (colMap.checkIn >= 0 && row[colMap.checkIn]) {
            checkInTime = parseSmartPSSTime(row[colMap.checkIn]);
          }
          if (colMap.checkOut >= 0 && row[colMap.checkOut]) {
            checkOutTime = parseSmartPSSTime(row[colMap.checkOut]);
          }
          if (colMap.date >= 0 && row[colMap.date]) {
            const parsed = parseSmartPSSTime(row[colMap.date]);
            if (parsed) recordDate = parsed;
          }

          // إذا كان التاريخ مدمجاً مع الوقت
          if (!checkInTime && colMap.date >= 0 && row[colMap.date]) {
            checkInTime = parseSmartPSSTime(row[colMap.date]);
          }

          // تحديد التاريخ
          const date = checkInTime || recordDate;
          if (!date) {
            skipped.push({ row: i + 1, reason: 'لا يوجد تاريخ صالح', data: row.join(' | ') });
            continue;
          }

          if (!empName) {
            skipped.push({ row: i + 1, reason: 'اسم الموظف فارغ', data: row.join(' | ') });
            continue;
          }

          const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

          // البحث عن الموظف في قاعدة البيانات
          let employee = null;

          // البحث بالرقم الوظيفي
          if (empId) {
            employee = await Employee.findOne({
              $or: [
                { employeeId: empId },
                { employeeId: `EMP-${empId.padStart(3, '0')}` },
              ]
            });
          }

          // البحث بالاسم
          if (!employee && empName) {
            employee = await Employee.findOne({
              name: { $regex: empName.split(' ')[0], $options: 'i' }
            });
          }

          if (!employee) {
            errors.push({
              row: i + 1,
              name: empName,
              id: empId,
              reason: `الموظف "${empName}" غير موجود في النظام`
            });
            continue;
          }

          // تنسيق وقت الدخول والخروج
          const checkInStr = checkInTime
            ? `${String(checkInTime.getHours()).padStart(2, '0')}:${String(checkInTime.getMinutes()).padStart(2, '0')}`
            : null;

          const checkOutStr = checkOutTime
            ? `${String(checkOutTime.getHours()).padStart(2, '0')}:${String(checkOutTime.getMinutes()).padStart(2, '0')}`
            : null;

          const status = determineStatus(checkInTime, checkOutTime);

          records.push({
            employee: employee._id,
            date: dateOnly,
            checkIn: checkInStr,
            checkOut: checkOutStr,
            status,
            notes: `مستورد من SmartPSS — ${empName}`
          });

        } catch (rowError) {
          errors.push({ row: i + 1, reason: rowError.message });
        }
      }

      // حفظ السجلات في قاعدة البيانات
      let inserted = 0;
      let updated = 0;
      let duplicates = 0;

      for (const record of records) {
        try {
          const existing = await Attendance.findOne({
            employee: record.employee,
            date: record.date
          });

          if (existing) {
            // تحديث السجل الموجود
            await Attendance.findByIdAndUpdate(existing._id, {
              checkIn: record.checkIn || existing.checkIn,
              checkOut: record.checkOut || existing.checkOut,
              status: record.status,
              notes: record.notes
            });
            updated++;
          } else {
            await Attendance.create(record);
            inserted++;
          }
        } catch (dbError) {
          if (dbError.code === 11000) {
            duplicates++;
          } else {
            errors.push({ reason: dbError.message });
          }
        }
      }

      res.json({
        success: true,
        message: 'تم استيراد الملف بنجاح',
        summary: {
          totalRows: rawData.length - 1,
          processed: records.length,
          inserted,
          updated,
          duplicates,
          skipped: skipped.length,
          errors: errors.length,
        },
        errors: errors.slice(0, 20),
        skipped: skipped.slice(0, 10),
        detectedColumns: colMap,
      });

    } catch (error) {
      console.error('خطأ في استيراد Excel:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ── GET /api/attendance/preview-excel ────────────
// معاينة الملف قبل الاستيراد
router.post('/preview-excel',
  protect,
  authorize('admin', 'manager'),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'يرجى رفع ملف' });
      }

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1, defval: '', blankrows: false
      });

      const headers = rawData[0] || [];
      const preview = rawData.slice(1, 6).map(row => {
        const obj = {};
        headers.forEach((h, i) => { obj[String(h)] = row[i]; });
        return obj;
      });

      res.json({
        success: true,
        sheetName,
        totalRows: rawData.length - 1,
        headers,
        preview,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.get('/', protect, getAttendance);
router.get('/today', protect, getTodayAttendance);
router.get('/stats/:employeeId', protect, getEmployeeAttendanceStats);
router.post('/', protect, authorize('admin', 'manager'), createAttendance);
router.put('/:id', protect, authorize('admin', 'manager'), updateAttendance);

module.exports = router;