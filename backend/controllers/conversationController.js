// chat-backend/controllers/conversationController.js
const db = require('../config/db');

// @desc    Démarrer ou obtenir une conversation avec un autre utilisateur
// @route   POST /api/conversations
// @access  Private
const getOrCreateConversation = async (req, res) => {
    const { partnerId } = req.body;
    const myId = req.user.id;

    if (!partnerId) {
        return res.status(400).json({ message: 'ID du partenaire manquant' });
    }

    // Créer un nom de conversation unique et trié pour éviter les doublons
    const conversationName = [myId, partnerId].sort((a, b) => a - b).join('_');

    try {
        // Vérifier si la conversation existe déjà
        let [conversations] = await db.query('SELECT id FROM conversations WHERE name = ?', [conversationName]);
        
        let conversationId;
        if (conversations.length > 0) {
            conversationId = conversations[0].id;
        } else {
            // Si elle n'existe pas, la créer
            const [result] = await db.query('INSERT INTO conversations (name) VALUES (?)', [conversationName]);
            conversationId = result.insertId;

            // Ajouter les deux participants à la table de liaison
            await db.query('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?), (?, ?)', [conversationId, myId, conversationId, partnerId]);
        }
        
        // Renvoyer les infos de la conversation
        const [convData] = await db.query(`
            SELECT c.id, c.name, 
                   p.id as partner_id, p.username as partner_username, p.profile_picture_url as partner_avatar
            FROM conversations c
            JOIN conversation_participants cp ON c.id = cp.conversation_id
            JOIN users p ON cp.user_id = p.id
            WHERE c.id = ? AND cp.user_id = ?
        `, [conversationId, partnerId]);
        
        res.status(200).json(convData[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// @desc    Lister toutes les conversations privées d'un utilisateur
// @route   GET /api/conversations
// @access  Private
const getUserConversations = async (req, res) => {
    const myId = req.user.id;
    try {
        const [conversations] = await db.query(`
            SELECT c.id, c.name, 
                   p.id as partner_id, p.username as partner_username, p.profile_picture_url as partner_avatar,
                   (SELECT pm.content FROM private_messages pm WHERE pm.conversation_id = c.id ORDER BY pm.timestamp DESC LIMIT 1) as last_message,
                   (SELECT pm.timestamp FROM private_messages pm WHERE pm.conversation_id = c.id ORDER BY pm.timestamp DESC LIMIT 1) as last_message_time
            FROM conversations c
            JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
            JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
            JOIN users p ON cp2.user_id = p.id
            WHERE cp1.user_id = ? AND cp2.user_id != ?
            ORDER BY last_message_time DESC
        `, [myId, myId]);
        res.json(conversations);
    } catch (error) { res.status(500).json({ message: 'Erreur serveur' }); }
};

// @desc    Obtenir les messages d'une conversation privée
// @route   GET /api/conversations/:id/messages
// @access  Private
const getPrivateMessages = async (req, res) => {
    const conversationId = req.params.id;
    try {
        const [messages] = await db.query(`
            SELECT m.id, m.content, m.type, m.timestamp, u.id as user_id, u.username
            FROM private_messages m
            JOIN users u ON m.user_id = u.id
            WHERE m.conversation_id = ?
            ORDER BY m.timestamp ASC
            LIMIT 100
        `, [conversationId]);
        res.json(messages.map(msg => ({
            id: msg.id, content: msg.content, type: msg.type, timestamp: msg.timestamp,
            user: { id: msg.user_id, username: msg.username }
        })));
    } catch (error) { res.status(500).json({ message: 'Erreur serveur' }); }
};

module.exports = { getOrCreateConversation, getUserConversations, getPrivateMessages };