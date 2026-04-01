const express = require('express');
const router = express.Router();
const { 
    getOrCreateConversation, 
    sendMessage, 
    getMessages, 
    getUserConversations,
    markAsRead
} = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/conversations', getUserConversations);
router.get('/conversation/:listingId', getOrCreateConversation);
router.get('/messages/:conversationId', getMessages);
router.post('/message/:conversationId', sendMessage);
router.post('/mark-read/:conversationId', markAsRead);

module.exports = router;