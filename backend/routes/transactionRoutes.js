const express = require('express');
const router = express.Router();
const { 
    initiatePurchase, 
    paymentCallback, 
    validateDelivery, 
    getTransactionStatus, 
    openDispute 
} = require('../controllers/transactionController');
const { authenticate } = require('../middleware/auth');
const { generalLimiter } = require('../middleware/rateLimiter');

// Webhook public (PayTech appelle ça)
router.post('/callback', paymentCallback);

// Routes protégées
router.post('/initiate', authenticate, initiatePurchase);
router.post('/validate', authenticate, validateDelivery);
router.post('/dispute', authenticate, openDispute);
router.get('/:id', authenticate, getTransactionStatus);

module.exports = router;