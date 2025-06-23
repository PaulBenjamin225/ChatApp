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


let onlineUsers = {};

io.on('connection', (socket) => {
    
    // NOUVELLE FONCTION CLÉ : Quand un utilisateur se met à jour
    socket.on('updateMyUserInfo', ({ user }) => {
        console.log(`[Info] Mise à jour des infos pour l'utilisateur ID: ${user.id}`);
        // Mettre à jour l'utilisateur dans toutes les listes où il se trouve
        for (const roomId in onlineUsers) {
            const userIndex = onlineUsers[roomId].findIndex(u => u.id === user.id);
            if (userIndex !== -1) {
                onlineUsers[roomId][userIndex] = user;
                // Envoyer la liste mise à jour à la salle concernée
                io.to(roomId).emit('updateUserList', onlineUsers[roomId]);
            }
        }
    });

    socket.on('joinRoom', ({ user, roomId }) => {
        socket.join(roomId);
        
        if (!onlineUsers[roomId]) {
            onlineUsers[roomId] = [];
        }
        
        const userIndex = onlineUsers[roomId].findIndex(u => u.id === user.id);
        if (userIndex === -1) {
            onlineUsers[roomId].push(user);
        } else {
            // S'il est déjà là, on met à jour ses infos (au cas où il a changé de photo)
            onlineUsers[roomId][userIndex] = user;
        }

        io.to(roomId).emit('updateUserList', onlineUsers[roomId]);

        socket.currentRoom = roomId;
        socket.currentUser = user; // Important pour les autres événements
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
                const messageData = {
                    id: result.insertId, content, type, timestamp: new Date(),
                    user: { id: userId, username: user.username, profile_picture_url: user.profile_picture_url }
                };
                io.to(roomId).emit('message', messageData);
            } catch(error) { console.error(error); }
        }
    });

    // ... (Logique des DMs, etc. - collez votre logique fonctionnelle ici)
    socket.on('joinConversation', ({ conversationId }) => { socket.join(String(conversationId)); });
    socket.on('sendPrivateMessage', async ({ content, userId, conversationId, type = 'text' }) => {
        const user = socket.currentUser;
        if (user && content) {
            try {
                const [result] = await db.query('INSERT INTO private_messages (content, type, user_id, conversation_id) VALUES (?, ?, ?, ?)', [content, type, userId, conversationId]);
                const messageData = { 
                    id: result.insertId, content, type, timestamp: new Date(), conversation_id: conversationId, 
                    user: { id: userId, username: user.username } };
                io.to(String(conversationId)).emit('privateMessage', messageData);
            } catch (error) { console.error(error); }
        }
    });

    socket.on('disconnect', () => {
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