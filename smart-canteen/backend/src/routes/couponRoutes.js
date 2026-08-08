const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/validate', authenticate, couponController.validateCoupon);
router.get('/', authenticate, authorize('admin', 'manager'), couponController.listCoupons);
router.post('/', authenticate, authorize('admin', 'manager'), couponController.createCoupon);
router.put('/:id', authenticate, authorize('admin', 'manager'), couponController.updateCoupon);
router.delete('/:id', authenticate, authorize('admin', 'manager'), couponController.deleteCoupon);

module.exports = router;
