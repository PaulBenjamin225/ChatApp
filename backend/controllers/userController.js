// chat-backend/controllers/userController.js
const db = require('../config/db');

// @desc    Obtenir le profil de l'utilisateur connecté
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, username, email, age, gender, interests, relationship_intent, location, profile_picture_url FROM users WHERE id = ?', [req.user.id]);
        if (users.length > 0) {
            res.json(users[0]);
        } else {
            res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// @desc    Mettre à jour le profil de l'utilisateur
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    const { age, gender, interests, relationship_intent, location, profile_picture_url } = req.body;
    try {
        await db.query(
            'UPDATE users SET age = ?, gender = ?, interests = ?, relationship_intent = ?, location = ?, profile_picture_url = ? WHERE id = ?',
            [age, gender, interests, relationship_intent, location, profile_picture_url, req.user.id]
        );
        const [updatedUser] = await db.query('SELECT id, username, email, age, gender, interests, relationship_intent, location, profile_picture_url FROM users WHERE id = ?', [req.user.id]);
        res.json(updatedUser[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur serveur lors de la mise à jour' });
    }
};

// @desc    Rechercher des utilisateurs (ne montre pas les utilisateurs bloqués)
// @route   GET /api/users/search
// @access  Private
const searchUsers = async (req, res) => {
    const keyword = req.query.keyword ? `%${req.query.keyword}%` : '%';
    const myId = req.user.id;
    try {
        const [users] = await db.query(`
            SELECT id, username, age, gender, relationship_intent, profile_picture_url 
            FROM users 
            WHERE username LIKE ? AND id != ?
            AND id NOT IN (SELECT blocked_id FROM user_blocks WHERE blocker_id = ?)
            AND id NOT IN (SELECT blocker_id FROM user_blocks WHERE blocked_id = ?)
        `, [keyword, myId, myId, myId]);
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// @desc    Bloquer un utilisateur
// @route   POST /api/users/block/:id
// @access  Private
const blockUser = async (req, res) => {
    const blockedId = req.params.id;
    const blockerId = req.user.id;
    if (blockerId == blockedId) {
        return res.status(400).json({ message: 'Vous ne pouvez pas vous bloquer vous-même' });
    }
    try {
        await db.query('INSERT IGNORE INTO user_blocks (blocker_id, blocked_id) VALUES (?, ?)', [blockerId, blockedId]);
        res.status(201).json({ message: 'Utilisateur bloqué avec succès' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// @desc    Débloquer un utilisateur
// @route   DELETE /api/users/unblock/:id
// @access  Private
const unblockUser = async (req, res) => {
    const blockedId = req.params.id;
    const blockerId = req.user.id;
    try {
        await db.query('DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?', [blockerId, blockedId]);
        res.status(200).json({ message: 'Utilisateur débloqué avec succès' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// @desc    Obtenir la liste des utilisateurs bloqués par l'utilisateur courant
// @route   GET /api/users/blocked
// @access  Private
const getBlockedUsers = async (req, res) => {
    const blockerId = req.user.id;
    try {
        const [blocked] = await db.query(`
            SELECT u.id, u.username, u.profile_picture_url
            FROM user_blocks ub
            JOIN users u ON ub.blocked_id = u.id
            WHERE ub.blocker_id = ?
        `, [blockerId]);
        res.json(blocked);
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// @desc    Mettre à jour la photo de profil de l'utilisateur
// @route   POST /api/users/profile/picture
// @access  Private
const updateUserProfilePicture = async (req, res) => {
    const userId = req.user.id;
    
    if (!req.file) {
        return res.status(400).json({ message: "Aucun fichier reçu." });
    }

    const profilePictureUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    try {
        await db.query(
            'UPDATE users SET profile_picture_url = ? WHERE id = ?',
            [profilePictureUrl, userId]
        );

        res.status(200).json({ 
            message: "Photo de profil mise à jour avec succès.",
            profilePictureUrl: profilePictureUrl 
        });
    } catch (error) {
        console.error("Erreur de mise à jour de la photo de profil:", error);
        res.status(500).json({ message: "Erreur serveur." });
    }
};

module.exports = { 
    getUserProfile, 
    updateUserProfile, 
    searchUsers, 
    blockUser, 
    unblockUser, 
    getBlockedUsers,
    updateUserProfilePicture
};