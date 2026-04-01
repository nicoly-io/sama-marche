const express = require('express');
const router = express.Router();
const { 
    getBoostPackages, 
    purchaseBoost, 
    boostCallback 
} = require('../controllers/boostController');
const { authenticate } = require('../middleware/auth');

// Webhook public
router.post('/callback', boostCallback);

// Routes protégées
router.get('/packages', authenticate, getBoostPackages);
router.post('/purchase', authenticate, purchaseBoost);

module.exports = router;