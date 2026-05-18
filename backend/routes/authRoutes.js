const express = require('express');
const router = express.Router();
const { login, getMe, register, changePassword } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/register', protect, authorize('admin'), register);
router.put('/change-password', protect, changePassword);

module.exports = router;