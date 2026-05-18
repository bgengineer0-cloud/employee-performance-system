const express = require('express');
const router = express.Router();
const { getEvaluations, createEvaluation, updateEvaluation, deleteEvaluation } = require('../controllers/evaluationController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, getEvaluations);
router.post('/', protect, authorize('admin', 'manager'), createEvaluation);
router.put('/:id', protect, authorize('admin', 'manager'), updateEvaluation);
router.delete('/:id', protect, authorize('admin'), deleteEvaluation);

module.exports = router;