const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/dashboard', authenticate, authorize('admin', 'manager'), adminController.dashboard);
router.get('/kitchen-dashboard', authenticate, authorize('admin', 'manager', 'canteen_staff'), adminController.kitchenDashboard);
router.get('/reports', authenticate, authorize('admin', 'manager'), adminController.reports);
router.get('/staff', authenticate, authorize('admin', 'manager'), adminController.listStaff);
router.post('/staff', authenticate, authorize('admin', 'manager'), adminController.addStaff);
router.delete('/staff/:id', authenticate, authorize('admin', 'manager'), adminController.removeStaff);

module.exports = router;
