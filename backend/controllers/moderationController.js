// controllers/moderationController.js
const db = require('../config/db');

// @desc    Signaler un utilisateur ou un message
// @route   POST /api/moderation/report
// @access  Private
const reportUser = async (req, res) => {
    const { reported_user_id, message_content, reason } = req.body;
    const reporter_id = req.user.id;

    if (!reported_user_id || !reason) {
        return res.status(400).json({ message: 'ID de l\'utilisateur signalé et raison sont requis.' });
    }
    try {
        await db.query(
            'INSERT INTO reports (reporter_id, reported_user_id, message_content, reason) VALUES (?, ?, ?, ?)',
            [reporter_id, reported_user_id, message_content, reason]
        );
        res.status(201).json({ message: 'Signalement envoyé avec succès.' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// @desc    Voir tous les signalements (Admin)
// @route   GET /api/moderation/reports
// @access  Admin
const getReports = async (req, res) => {
    try {
        const [reports] = await db.query(`
            SELECT r.id, r.message_content, r.reason, r.status, r.created_at,
                   reporter.username as reporter_username,
                   reported.username as reported_username
            FROM reports r
            JOIN users reporter ON r.reporter_id = reporter.id
            JOIN users reported ON r.reported_user_id = reported.id
            WHERE r.status = 'pending'
            ORDER BY r.created_at DESC
        `);
        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// @desc    Bannir un utilisateur (Admin)
// @route   POST /api/moderation/ban/:id
// @access  Admin
const banUser = async (req, res) => {
    const userIdToBan = req.params.id;
    // Dans une vraie application, on ajouterait une colonne `is_banned` ou une table `bans`
    // Pour simplifier, nous allons changer le rôle de l'utilisateur pour le "bannir"
    // Une meilleure approche serait une table `bans` avec une date d'expiration.
    
    try {
        // Ici, on pourrait désactiver le compte, le supprimer, ou ajouter à une table de bannis
        // Pour cet exemple, on le supprime (attention, c'est destructif !)
        await db.query('DELETE FROM users WHERE id = ?', [userIdToBan]);

        // On pourrait aussi mettre à jour le statut des signalements le concernant
        await db.query("UPDATE reports SET status = 'resolved' WHERE reported_user_id = ?", [userIdToBan]);
        
        res.json({ message: 'Utilisateur banni avec succès (supprimé).' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

module.exports = { reportUser, getReports, banUser };