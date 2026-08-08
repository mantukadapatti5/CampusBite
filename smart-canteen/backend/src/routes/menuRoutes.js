const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const { authenticate, authorize } = require('../middleware/auth');

// public browse
router.get('/categories', menuController.getCategories);
router.get('/', menuController.getMenu);

// admin-only management
router.post('/categories', authenticate, authorize('admin', 'manager'), menuController.createCategory);
router.post('/items', authenticate, authorize('admin', 'manager'), menuController.createItem);
router.put('/items/:id', authenticate, authorize('admin', 'manager', 'canteen_staff'), menuController.updateItem);
router.delete('/items/:id', authenticate, authorize('admin', 'manager'), menuController.deleteItem);

module.exports = router;
