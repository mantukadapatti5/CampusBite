const express = require('express');
const router = express.Router();
const ml = require('../controllers/mlController');
const { authenticate, authorize } = require('../middleware/auth');

// ML Insights lives in the manager portal (admins can open it too)
router.use(authenticate, authorize('admin', 'manager'));

router.get('/overview', ml.overview);
router.get('/crowd-forecast', ml.crowdForecast);
router.get('/demand-forecast', ml.demandForecast);
router.post('/wait-time', ml.waitTime);
router.post('/retrain', ml.retrain);
router.get('/dataset/:name', ml.downloadDataset);

module.exports = router;
