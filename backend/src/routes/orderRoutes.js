const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/queue-status', orderController.queueStatus);

router.post('/', authenticate, orderController.placeOrder);
router.post('/manual', authenticate, authorize('admin', 'manager', 'canteen_staff'), orderController.manualOrder);
router.get('/mine', authenticate, orderController.getMyOrders);
router.get('/all', authenticate, authorize('admin', 'manager'), orderController.getAllOrders);
router.get('/active', authenticate, authorize('admin', 'manager', 'canteen_staff'), orderController.getActiveOrders);
router.get('/token/:token', authenticate, authorize('admin', 'manager', 'canteen_staff'), orderController.getOrderByToken);
router.get('/:id/invoice', authenticate, orderController.downloadInvoice);
router.get('/:id', authenticate, orderController.getOrderById);
router.patch('/:id/status', authenticate, authorize('admin', 'manager', 'canteen_staff'), orderController.updateStatus);

module.exports = router;
