// routes/moderationRoutes.js
const express = require('express');
const router = express.Router();
const { reportUser, getReports, banUser } = require('../controllers/moderationController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/report', protect, reportUser);
router.get('/reports', protect, admin, getReports);
router.post('/ban/:id', protect, admin, banUser);

module.exports = router;