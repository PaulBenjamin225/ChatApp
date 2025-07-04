// chat-backend/server.js - Version Complète et Corrigée pour Déploiement

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

// Assurez-vous que le fichier db.js utilise les variables d'environnement (process.env)
const db = require('./config/db'); 
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const roomRoutes = require('./routes/roomRoutes');
const moderationRoutes = require('./routes/moderationRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');

const app = express();

// --- CORRECTION : Configuration CORS centralisée et dynamique ---
// L'URL du front-end est récupérée depuis les variables d'environnement.
// Si la variable n'est pas définie (ex: en local), elle utilise "http://localhost:5173".
const frontendURL = process.env.FRONTEND_URL || "http://localhost:5173";

console.log(`[CORS] Autorisation des requêtes HTTP depuis : ${frontendURL}`);
app.use(cors({ origin: frontendURL }));

app.use(express.json());

// --- POINT D'ATTENTION : Stockage de fichiers sur Render ---
// Le système de fichiers de Render n'est pas persistant. Les fichiers téléchargés dans le dossier
// 'uploads' seront supprimés à chaque redéploiement ou redémarrage du service.
// Pour une application en production, il est fortement recommandé d'utiliser un service
// de stockage externe comme Amazon S3, Google Cloud Storage ou Cloudinary.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Déclaration des routes de l'API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/favorites', favoriteRoutes);

const server = http.createServer(app);

// --- CORRECTION : Configuration CORS pour Socket.IO ---
// On utilise la même URL que pour les requêtes HTTP pour assurer la cohérence.
const io = new Server(server, { 
    cors: { 
        origin: frontendURL,
        methods: ["GET", "POST"]
    } 
});

// --- Logique Socket.IO ---

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
            } catch(error) { 
                console.error("Erreur lors de l'insertion du message public :", error); 
            }
        }
    });

    socket.on('joinConversation', ({ conversationId }) => {
        console.log(`[Socket] Utilisateur ${socket.id} a rejoint la conversation ${conversationId}`);
        socket.join(String(conversationId));
    });

    socket.on('sendPrivateMessage', async (payload) => {
        console.log("[BACKEND] Événement 'sendPrivateMessage' reçu avec le payload:", payload);

        const { content, userId, conversationId, type = 'text' } = payload;
        
        if (!content || !userId || !conversationId) {
            console.error('[BACKEND] ERREUR : Payload invalide pour sendPrivateMessage. Annulation.');
            return; 
        }

        try {
            // Étape 1: Insérer le message dans la base de données
            const insertMessageQuery = 'INSERT INTO private_messages (content, type, user_id, conversation_id) VALUES (?, ?, ?, ?)';
            const [result] = await db.query(insertMessageQuery, [content, type, userId, conversationId]);
            const newMessageId = result.insertId;

            // Étape 2: Mettre à jour la conversation avec le dernier message
            const updateConvQuery = 'UPDATE conversations SET last_message = ?, last_message_type = ?, last_message_time = NOW() WHERE id = ?';
            const previewContent = type !== 'text' ? `Fichier (${type})` : content.substring(0, 100);
            await db.query(updateConvQuery, [previewContent, type, conversationId]);
            
            // Étape 3: Récupérer le message complet avec les informations de l'utilisateur
            const getMessageQuery = `
                SELECT 
                    pm.id, pm.content, pm.type, pm.timestamp,
                    pm.conversation_id,
                    u.id AS user_id, 
                    u.username, 
                    u.profile_picture_url AS avatar -- On sélectionne la bonne colonne et on lui donne l'alias 'avatar'
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
            
            // Étape 4: Diffuser le message aux clients dans la bonne conversation
            io.to(String(conversationId)).emit('privateMessage', formattedMessage);
            console.log(`[Socket] Message privé ${formattedMessage.id} diffusé à la conv ${conversationId}.`);

        } catch (error) {
            console.error("--- ERREUR CRITIQUE DANS 'sendPrivateMessage' ---", error);
        }
    });

    // Gestion de la déconnexion
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

// --- Démarrage du serveur (BONNE PRATIQUE) ---
// Utilise le port fourni par Render, ou 5000 par défaut pour le développement local.
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Serveur démarré et à l'écoute sur le port ${PORT}`));