// frontend/src/pages/ChatPage.jsx

import React, { useState, useEffect, useContext } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import RoomList from '../components/RoomList';
import ChatWindow from '../components/ChatWindow';
import RoomInfo from '../components/RoomInfo';

const socket = io('http://localhost:5000');

const ChatPage = () => {
    const { user, token } = useContext(AuthContext);
    const [rooms, setRooms] = useState([]);
    const [currentRoom, setCurrentRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);

    // Cet effet gère les listeners globaux
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

    // Cet effet gère le chargement des données et le fait de rejoindre une salle
    useEffect(() => {
        if (token && rooms.length === 0) {
            axios.get('http://localhost:5000/api/rooms', { headers: { Authorization: `Bearer ${token}` } })
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
        if (!user) return; // S'assurer que l'utilisateur est chargé

        // Quitter l'ancienne salle
        if (currentRoom) {
            socket.emit('leaveRoom', { roomId: currentRoom.id });
        }
        
        setCurrentRoom(room);
        setMessages([]);
        setOnlineUsers([]);
        
        // On renvoie l'objet utilisateur complet
        socket.emit('joinRoom', { user, roomId: room.id });
        
        try {
            const res = await axios.get(`http://localhost:5000/api/rooms/${room.id}/messages`, { headers: { Authorization: `Bearer ${token}` } });
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
            const res = await axios.post('http://localhost:5000/api/upload', formData, { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` } });
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