// chat-backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { 
    getUserProfile, 
    updateUserProfile, 
    searchUsers, 
    blockUser,
    unblockUser,
    getBlockedUsers,
    updateUserProfilePicture
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const multerConfig = require('../middleware/multerConfig');

// Route pour obtenir/mettre à jour les infos du profil (texte)
router.route('/profile')
    .get(protect, getUserProfile)
    .put(protect, updateUserProfile);

// Route pour la photo de profil
router.post('/profile/picture', protect, multerConfig, updateUserProfilePicture);

router.get('/search', protect, searchUsers);
router.get('/blocked', protect, getBlockedUsers);
router.post('/block/:id', protect, blockUser);
router.delete('/unblock/:id', protect, unblockUser);

module.exports = router;