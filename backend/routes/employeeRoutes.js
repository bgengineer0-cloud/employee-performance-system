const express = require('express');
const router = express.Router();
const { getEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee } = require('../controllers/employeeController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, getEmployees);
router.get('/:id', protect, getEmployee);
router.post('/', protect, authorize('admin', 'manager'), createEmployee);
router.put('/:id', protect, authorize('admin', 'manager'), updateEmployee);
router.delete('/:id', protect, authorize('admin'), deleteEmployee);
// جلب موظف بالإيميل
router.get('/by-email/:email', protect, async (req, res) => {
  try {
    const employee = await Employee.findOne({ 
      email: req.params.email,
      status: { $ne: 'terminated' }
    });
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        message: 'الموظف غير موجود' 
      });
    }
    res.json({ success: true, employee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
module.exports = router;
// جلب موظف بالإيميل
router.get('/by-email/:email', protect, async (req, res) => {
  try {
    const employee = await Employee.findOne({ email: req.params.email });
    res.json({ success: true, employee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});