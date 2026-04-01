const express = require('express');
const router = express.Router();
const { 
    sendOTPCode, 
    verifyOTPAndRegister, 
    login, 
    acceptTerms,
    googleLogin,
    googleCallback
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// Routes publiques avec rate limiting
router.post('/send-otp', authLimiter, sendOTPCode);
router.post('/verify-otp', authLimiter, verifyOTPAndRegister);
router.post('/login', authLimiter, login);

// Routes Google OAuth
router.get('/google', googleLogin);
router.get('/google/callback', googleCallback);

// Routes protégées
router.post('/accept-terms', authenticate, acceptTerms);

module.exports = router;