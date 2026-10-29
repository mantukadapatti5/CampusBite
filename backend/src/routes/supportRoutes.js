const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, supportController.submit);
router.get('/mine', authenticate, supportController.myRequests);
router.get('/', authenticate, authorize('admin', 'manager'), supportController.list);
router.patch('/:id/resolve', authenticate, authorize('admin', 'manager'), supportController.resolve);

module.exports = router;
