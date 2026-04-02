const express = require('express');
const router = express.Router();
const { 
    createListing, 
    getListings, 
    getListingById, 
    updateListing, 
    deleteListing 
} = require('../controllers/listingController');
const { authenticate } = require('../middleware/auth');
const { listingLimiter, generalLimiter } = require('../middleware/rateLimiter');

// Routes publiques
router.get('/', generalLimiter, getListings);
router.get('/:id', generalLimiter, getListingById);

// Routes protégées
router.post('/', authenticate, (req, res, next) => {
    console.log('➡️ Route POST /api/listings atteinte');
    console.log('📝 Headers:', req.headers);
    console.log('👤 User:', req.user);
    next();
}, listingLimiter, createListing);

router.put('/:id', authenticate, updateListing);
router.delete('/:id', authenticate, deleteListing);

module.exports = router;