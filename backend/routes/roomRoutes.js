// routes/roomRoutes.js
const express = require('express');
const router = express.Router();
const { getRooms, createRoom, getRoomMessages } = require('../controllers/roomController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/').get(protect, getRooms).post(protect, admin, createRoom);
router.get('/:id/messages', protect, getRoomMessages);

module.exports = router;