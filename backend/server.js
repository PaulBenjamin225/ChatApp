// chat-backend/server.js

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const roomRoutes = require('./routes/roomRoutes');
const moderationRoutes = require('./routes/moderationRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/favorites', favoriteRoutes);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "http://localhost:5173" } });


// --- LOGIQUE POUR LES ROOMS PUBLIQUES (INCHANGÉE) ---
let onlineUsers = {};

io.on('connection', (socket) => {
    
    socket.on('updateMyUserInfo', ({ user }) => {
        console.log(`[Info] Mise à jour des infos pour l'utilisateur ID: ${user.id}`);
        for (const roomId in onlineUsers) {
            const userIndex = onlineUsers[roomId].findIndex(u => u.id === user.id);
            if (userIndex !== -1) {
                onlineUsers[roomId][userIndex] = user;
                io.to(roomId).emit('updateUserList', onlineUsers[roomId]);
            }
        }
    });

    socket.on('joinRoom', ({ user, roomId }) => {
        socket.join(roomId);
        if (!onlineUsers[roomId]) onlineUsers[roomId] = [];
        const userIndex = onlineUsers[roomId].findIndex(u => u.id === user.id);
        if (userIndex === -1) onlineUsers[roomId].push(user);
        else onlineUsers[roomId][userIndex] = user;
        io.to(roomId).emit('updateUserList', onlineUsers[roomId]);
        socket.currentRoom = roomId;
        socket.currentUser = user;
    });

    socket.on('leaveRoom', ({ roomId }) => {
        socket.leave(roomId);
        if (socket.currentUser && onlineUsers[roomId]) {
            onlineUsers[roomId] = onlineUsers[roomId].filter(u => u.id !== socket.currentUser.id);
            io.to(roomId).emit('updateUserList', onlineUsers[roomId]);
        }
    });

    socket.on('sendMessage', async ({ content, userId, roomId, type = 'text' }) => {
        const user = socket.currentUser;
        if (user && content) {
            try {
                const [result] = await db.query('INSERT INTO messages (content, type, user_id, room_id) VALUES (?, ?, ?, ?)', [content, type, userId, roomId]);
                const messageData = { id: result.insertId, content, type, timestamp: new Date(), user: { id: userId, username: user.username, profile_picture_url: user.profile_picture_url } };
                io.to(roomId).emit('message', messageData);
            } catch(error) { console.error(error); }
        }
    });


    socket.on('joinConversation', ({ conversationId }) => {
        console.log(`[Socket] Utilisateur ${socket.id} a rejoint la conversation ${conversationId}`);
        socket.join(String(conversationId));
    });

    socket.on('sendPrivateMessage', async (payload) => {
        console.log("--- [BACKEND] Événement 'sendPrivateMessage' REÇU ---");
        console.log("Payload reçu:", payload);

        const { content, userId, conversationId, type = 'text' } = payload;
        
        if (!content || !userId || !conversationId) {
            console.error('[BACKEND] ERREUR FATALE: Payload invalide ou incomplet. Annulation.');
            return; 
        }

        try {
            // ÉTAPE 1: Insertion dans la table 'private_messages'.
            const insertMessageQuery = `
                INSERT INTO private_messages (content, type, user_id, conversation_id) 
                VALUES (?, ?, ?, ?)
            `;
            const [result] = await db.query(insertMessageQuery, [content, type, userId, conversationId]);
            const newMessageId = result.insertId;

            console.log(`[DB] Message privé ${newMessageId} sauvegardé.`);

            // ÉTAPE 2: Mise à jour de la conversation parente.
            const updateConvQuery = `
                UPDATE conversations 
                SET last_message = ?, last_message_type = ?, last_message_time = NOW()
                WHERE id = ?
            `;
            const previewContent = type !== 'text' ? `Fichier (${type})` : content.substring(0, 100);
            await db.query(updateConvQuery, [previewContent, type, conversationId]);
            console.log(`[DB] Conversation ${conversationId} mise à jour.`);

            // ÉTAPE 3: Récupération du message complet pour la diffusion.
            const getMessageQuery = `
                SELECT 
                    pm.id, pm.content, pm.type, pm.created_at AS timestamp,
                    pm.conversation_id,
                    u.id AS user_id, 
                    u.username, 
                    u.avatar
                FROM private_messages pm
                JOIN users u ON pm.user_id = u.id
                WHERE pm.id = ?
            `;
            const [rows] = await db.query(getMessageQuery, [newMessageId]);
            
            if (rows.length === 0) throw new Error("Impossible de récupérer le message privé après insertion.");
            
            const dbMessage = rows[0];
            const formattedMessage = {
                id: dbMessage.id, content: dbMessage.content, type: dbMessage.type,
                timestamp: dbMessage.timestamp, conversation_id: dbMessage.conversation_id,
                user: { id: dbMessage.user_id, username: dbMessage.username, avatar: dbMessage.avatar }
            };
            
            // ÉTAPE 4: Diffusion du message complet.
            io.to(String(conversationId)).emit('privateMessage', formattedMessage);
            console.log(`[Socket] Message ${formattedMessage.id} diffusé à la conv ${conversationId}. Cycle complet réussi.`);

        } catch (error) {
            console.error("--- [BACKEND] ERREUR DANS LE BLOC TRY/CATCH de 'sendPrivateMessage' ---");
            console.error(error); // AFFICHE L'ERREUR SQL EXACTE SI ELLE EXISTE
        }
    });


    // --- GESTION DE LA DÉCONNEXION ---
    socket.on('disconnect', () => {
        console.log(`[Socket] Utilisateur ${socket.id} déconnecté.`);
        const user = socket.currentUser;
        const roomId = socket.currentRoom;
        if (user && roomId && onlineUsers[roomId]) {
            onlineUsers[roomId] = onlineUsers[roomId].filter(u => u.id !== user.id);
            io.to(roomId).emit('updateUserList', onlineUsers[roomId]);
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));