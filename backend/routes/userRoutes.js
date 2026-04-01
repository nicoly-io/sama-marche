const express = require('express');
const router = express.Router();
const { 
    getProfile, 
    updateProfile, 
    submitCNI, 
    getUserListings, 
    getUserTransactions 
} = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { generalLimiter } = require('../middleware/rateLimiter');

// Toutes les routes nécessitent authentification
router.use(authenticate);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/cni', submitCNI);
router.get('/listings', getUserListings);
router.get('/transactions', getUserTransactions);
router.get('/listings/:userId', getUserListings);

module.exports = router;