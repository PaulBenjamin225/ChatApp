// chat-backend/controllers/favoriteController.js
const db = require('../config/db');

// @desc    Ajouter un utilisateur aux favoris
// @route   POST /api/favorites/:id
// @access  Private
const addFavorite = async (req, res) => {
    const userId = req.user.id;
    const favoriteUserId = req.params.id;

    if (userId == favoriteUserId) {
        return res.status(400).json({ message: "Vous ne pouvez pas vous ajouter vous-même en favori." });
    }

    try {
        await db.query('INSERT IGNORE INTO user_favorites (user_id, favorite_user_id) VALUES (?, ?)', [userId, favoriteUserId]);
        res.status(201).json({ message: "Utilisateur ajouté aux favoris." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur." });
    }
};

// @desc    Retirer un utilisateur des favoris
// @route   DELETE /api/favorites/:id
// @access  Private
const removeFavorite = async (req, res) => {
    const userId = req.user.id;
    const favoriteUserId = req.params.id;

    try {
        await db.query('DELETE FROM user_favorites WHERE user_id = ? AND favorite_user_id = ?', [userId, favoriteUserId]);
        res.status(200).json({ message: "Utilisateur retiré des favoris." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur." });
    }
};

// @desc    Lister les utilisateurs favoris
// @route   GET /api/favorites
// @access  Private
const getFavorites = async (req, res) => {
    const userId = req.user.id;
    try {
        const [favorites] = await db.query(`
            SELECT u.id, u.username, u.age, u.gender, u.relationship_intent, u.profile_picture_url
            FROM user_favorites uf
            JOIN users u ON uf.favorite_user_id = u.id
            WHERE uf.user_id = ?
        `, [userId]);
        res.json(favorites);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur." });
    }
};

// NOUVEAU : Vérifier le statut de favori pour un ensemble d'utilisateurs
// @desc    Vérifier le statut de favori
// @route   POST /api/favorites/status
// @access  Private
const checkFavoriteStatus = async (req, res) => {
    const userId = req.user.id;
    const { userIds } = req.body; // Attendre un tableau d'IDs

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.json({});
    }

    try {
        const [results] = await db.query(
            'SELECT favorite_user_id FROM user_favorites WHERE user_id = ? AND favorite_user_id IN (?)',
            [userId, userIds]
        );
        
        const favoriteStatus = {};
        userIds.forEach(id => {
            favoriteStatus[id] = results.some(fav => fav.favorite_user_id === id);
        });

        res.json(favoriteStatus);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
};

module.exports = { addFavorite, removeFavorite, getFavorites, checkFavoriteStatus };