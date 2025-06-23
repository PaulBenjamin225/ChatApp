// chat-backend/routes/conversationRoutes.js
const express = require('express');
const router = express.Router();
const { getOrCreateConversation, getUserConversations, getPrivateMessages } = require('../controllers/conversationController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getUserConversations).post(protect, getOrCreateConversation);
router.get('/:id/messages', protect, getPrivateMessages);

module.exports = router;