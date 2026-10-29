const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/active', announcementController.listActive); // public
router.get('/', authenticate, authorize('admin', 'manager'), announcementController.listAll);
router.post('/', authenticate, authorize('admin', 'manager'), announcementController.create);
router.patch('/:id/deactivate', authenticate, authorize('admin', 'manager'), announcementController.deactivate);

module.exports = router;
