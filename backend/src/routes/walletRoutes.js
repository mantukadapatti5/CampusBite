const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, walletController.getBalance);
router.post('/topup', authenticate, walletController.topUp);
router.post('/redeem-points', authenticate, walletController.redeemPoints);

module.exports = router;
