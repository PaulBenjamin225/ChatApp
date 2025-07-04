// frontend/src/pages/ChatPage.jsx 

import React, { useState, useEffect, useContext } from 'react';
import io from 'socket.io-client';
import apiClient from '../api/axios'; //  client API centralisé
import AuthContext from '../context/AuthContext';
import RoomList from '../components/RoomList';
import ChatWindow from '../components/ChatWindow';
import RoomInfo from '../components/RoomInfo';

// --- Connexion Socket.IO dynamique ---
// On récupère l'URL de l'API depuis les variables d'environnement.
const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const socket = io(VITE_API_URL);

const ChatPage = () => {
    const { user, token } = useContext(AuthContext); // token est toujours utile pour savoir si l'utilisateur est connecté
    const [rooms, setRooms] = useState([]);
    const [currentRoom, setCurrentRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);

    // Cet effet gère les listeners globaux (aucune modification ici)
    useEffect(() => {
        const updateUserListListener = (users) => { setOnlineUsers(users); };
        const messageListener = (newMessage) => { setMessages((prev) => [...prev, newMessage]); };
        
        socket.on('updateUserList', updateUserListListener);
        socket.on('message', messageListener);

        return () => {
            socket.off('updateUserList', updateUserListListener);
            socket.off('message', messageListener);
        };
    }, []);

    // Cet effet gère le chargement des données
    useEffect(() => {
        // --- Utilisation de apiClient ---
        // L'URL de base et le header d'autorisation sont gérés automatiquement !
        if (token && rooms.length === 0) {
            apiClient.get('/api/rooms')
                .then(res => {
                    setRooms(res.data);
                    if (res.data.length > 0 && !currentRoom) {
                        handleRoomSelect(res.data[0]);
                    }
                });
        }
    }, [token, rooms.length]);

    const handleRoomSelect = async (room) => {
        if (currentRoom?.id === room.id) return;
        if (!user) return;

        if (currentRoom) {
            socket.emit('leaveRoom', { roomId: currentRoom.id });
        }
        
        setCurrentRoom(room);
        setMessages([]);
        setOnlineUsers([]);
        
        socket.emit('joinRoom', { user, roomId: room.id });
        
        try {
            // --- Utilisation de apiClient ---
            const res = await apiClient.get(`/api/rooms/${room.id}/messages`);
            setMessages(res.data);
        } catch (error) {
            console.error("Erreur chargement messages", error);
        }
    };
    
    const handleSendMessage = (content) => {
        if (content.trim() && currentRoom) {
            socket.emit('sendMessage', { content, userId: user.id, roomId: currentRoom.id, type: 'text' });
        }
    };

    const handleFileUpload = async (file) => {
        if (!file || !currentRoom) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            // ---  Utilisation de apiClient ---
            // Le token est géré automatiquement, on a juste besoin de spécifier le Content-Type pour les fichiers.
            const res = await apiClient.post('/api/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            const { fileUrl, fileType } = res.data;
            let messageType = 'file';
            if (fileType.startsWith('image/')) messageType = 'image';
            if (fileType.startsWith('video/')) messageType = 'video';
            socket.emit('sendMessage', { content: fileUrl, userId: user.id, roomId: currentRoom.id, type: messageType });
        } catch (error) { console.error(error); }
    };

    return (
        <>
            <RoomList rooms={rooms} currentRoom={currentRoom} onRoomSelect={handleRoomSelect} onlineUsers={onlineUsers} />
            <ChatWindow 
                room={currentRoom} 
                messages={messages} 
                onSendMessage={handleSendMessage}
                onFileUpload={handleFileUpload}
                currentUser={user}
            />
            <RoomInfo room={currentRoom} onlineUsers={onlineUsers} />
        </>
    );
};

export default ChatPage;