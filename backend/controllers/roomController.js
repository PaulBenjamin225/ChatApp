// chat-backend/controllers/roomController.js

const db = require('../config/db');

// @desc    Lister toutes les salles
// @route   GET /api/rooms
// @access  Private
const getRooms = async (req, res) => {
    try {
        const [rooms] = await db.query('SELECT id, name, description FROM rooms');
        res.json(rooms);
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// @desc    Créer une salle (Admin)
// @route   POST /api/rooms
// @access  Admin
const createRoom = async (req, res) => {
    const { name, description } = req.body;
    try {
        const [result] = await db.query('INSERT INTO rooms (name, description) VALUES (?, ?)', [name, description]);
        res.status(201).json({ id: result.insertId, name, description });
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// @desc    Obtenir les messages d'une salle
// @route   GET /api/rooms/:id/messages
// @access  Private
const getRoomMessages = async (req, res) => {
    const roomId = req.params.id;
    try {
        const [messagesFromDb] = await db.query(
            `SELECT m.id, m.content, m.type, m.timestamp, u.id as user_id, u.username 
             FROM messages m
             JOIN users u ON m.user_id = u.id
             WHERE m.room_id = ? 
             ORDER BY m.timestamp ASC
             LIMIT 50`,
            [roomId]
        );
        
        const messages = messagesFromDb.map(msg => ({
            id: msg.id,
            content: msg.content,
            type: msg.type, // On inclut le type
            timestamp: msg.timestamp,
            user: {
                id: msg.user_id,
                username: msg.username
            }
        }));

        res.json(messages);

    } catch (error) {
        console.error("Erreur de chargement des messages:", error)
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

module.exports = { getRooms, createRoom, getRoomMessages };