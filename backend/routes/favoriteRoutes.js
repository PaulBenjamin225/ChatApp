// chat-backend/routes/favoriteRoutes.js
const express = require('express');
const router = express.Router();
const { addFavorite, removeFavorite, getFavorites, checkFavoriteStatus } = require('../controllers/favoriteController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getFavorites);

router.route('/status')
    .post(protect, checkFavoriteStatus);

router.route('/:id')
    .post(protect, addFavorite)
    .delete(protect, removeFavorite);

module.exports = router;