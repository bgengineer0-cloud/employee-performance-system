const Evaluation = require('../models/Evaluation');
const Employee = require('../models/Employee');

// @route  GET /api/evaluations
const getEvaluations = async (req, res) => {
  try {
    const { employee, period } = req.query;
    const filter = {};
    if (employee) filter.employee = employee;
    if (period) filter.period = period;

    const evaluations = await Evaluation.find(filter)
      .populate('employee', 'name employeeId department')
      .populate('evaluatedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, evaluations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route  POST /api/evaluations
const createEvaluation = async (req, res) => {
  try {
    const evaluation = await Evaluation.create({
      ...req.body,
      evaluatedBy: req.user._id,
    });

    // Update employee overall score
    const allEvals = await Evaluation.find({ employee: req.body.employee });
    const avgScore =
      allEvals.reduce((sum, e) => sum + e.overallScore, 0) / allEvals.length;

    await Employee.findByIdAndUpdate(req.body.employee, {
      performanceScore: Math.round(avgScore * 20), // 1–5 → 0–100
    });

    const populated = await evaluation.populate('employee', 'name employeeId');
    res.status(201).json({ success: true, message: 'تم حفظ التقييم بنجاح', evaluation: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route  PUT /api/evaluations/:id
const updateEvaluation = async (req, res) => {
  try {
    const evaluation = await Evaluation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!evaluation) return res.status(404).json({ success: false, message: 'التقييم غير موجود' });
    res.json({ success: true, message: 'تم تحديث التقييم', evaluation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route  DELETE /api/evaluations/:id
const deleteEvaluation = async (req, res) => {
  try {
    await Evaluation.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'تم حذف التقييم' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getEvaluations, createEvaluation, updateEvaluation, deleteEvaluation };
