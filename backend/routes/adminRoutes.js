const express = require('express');
const router = express.Router();
const { 
    isAdmin,
    getStats, 
    moderateListing, 
    verifyCNI, 
    resolveDispute, 
    blockUser,
    getPendingDisputes,
    getPendingCNI
} = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');

// Toutes les routes admin nécessitent authentification + rôle admin
router.use(authenticate);
router.use(isAdmin);

router.get('/stats', getStats);
router.get('/disputes', getPendingDisputes);
router.get('/cni-pending', getPendingCNI);
router.put('/listing/:id', moderateListing);
router.put('/cni/:id', verifyCNI);
router.put('/dispute/:id', resolveDispute);
router.put('/block-user/:id', blockUser);

module.exports = router;