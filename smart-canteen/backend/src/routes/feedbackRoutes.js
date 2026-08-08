const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, feedbackController.submitFeedback);
router.get('/summary', authenticate, authorize('admin', 'manager'), feedbackController.getFeedbackSummary);
router.get('/all', authenticate, authorize('admin', 'manager'), feedbackController.listAll);
router.patch('/:id/reply', authenticate, authorize('admin', 'manager'), feedbackController.reply);

module.exports = router;
