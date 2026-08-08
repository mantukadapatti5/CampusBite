const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoriteController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, favoriteController.getMyFavorites);
router.post('/toggle', authenticate, favoriteController.toggleFavorite);

module.exports = router;
