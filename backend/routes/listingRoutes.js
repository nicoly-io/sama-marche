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

// Routes publiques
router.get('/', getListings);
router.get('/:id', getListingById);

// Routes protégées (sans upload middleware pour la version base64)
router.post('/', authenticate, createListing);
router.put('/:id', authenticate, updateListing);
router.delete('/:id', authenticate, deleteListing);

module.exports = router;