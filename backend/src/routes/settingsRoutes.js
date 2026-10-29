const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', settingsController.get); // public read — shown on menu page (hours, tax)
router.put('/', authenticate, authorize('admin', 'manager'), settingsController.update);

module.exports = router;
