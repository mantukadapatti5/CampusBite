const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate, authorize } = require('../middleware/auth');

// crowd prediction is shown to students on the menu, so it's public
router.get('/crowd-prediction', analyticsController.crowdPrediction);
router.get('/demand-forecast', authenticate, authorize('admin', 'manager'), analyticsController.demandForecast);
router.get('/recommendations/:menuItemId', analyticsController.recommendations);

module.exports = router;
