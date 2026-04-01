const express = require('express');
const router = express.Router();
const { 
    getSubscriptionPlans, 
    subscribe, 
    getUserSubscription, 
    cancelSubscription 
} = require('../controllers/subscriptionController');
const { authenticate } = require('../middleware/auth');

// Routes publiques
router.get('/plans', getSubscriptionPlans);

// Routes protégées
router.get('/my', authenticate, getUserSubscription);
router.post('/subscribe', authenticate, subscribe);
router.post('/cancel', authenticate, cancelSubscription);

module.exports = router;