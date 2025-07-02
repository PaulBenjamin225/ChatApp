// frontend/src/pages/DirectMessagesPage.jsx - Version Corrigée

import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { formatRelative } from 'date-fns';
import { fr } from 'date-fns/locale';

import apiClient from '../api/axios'; // <-- CHANGEMENT : On importe notre client API
import AuthContext from '../context/AuthContext';
import ChatWindow from '../components/ChatWindow';
import './DirectMessagesPage.css';

// --- CHANGEMENT N°1 : Connexion Socket.IO dynamique ---
const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const socket = io(VITE_API_URL);

// Le composant ConversationItem reste inchangé
const ConversationItem = ({ conv, onSelect, isActive }) => {
    // ... (code du composant inchangé)
    const getLastMessagePreview = () => {
        if (!conv.last_message) return "Démarrez la conversation";
        if (conv.last_message_type === 'image') return "📷 Image";
        if (conv.last_message_type === 'video') return "📹 Vidéo";
        if (conv.last_message_type === 'file') return "📎 Fichier";
        const preview = conv.last_message || "";
        return preview.length > 30 ? `${preview.substring(0, 27)}...` : preview;
    };
    
    return (
        <div className={`conversation-item ${isActive ? 'active' : ''}`} onClick={() => onSelect(conv)}>
            <img src={conv.partner_avatar || `https://i.pravatar.cc/50?u=${conv.partner_id}`} alt={conv.partner_username} />
            <div className="conversation-details">
                <span className="partner-name">{conv.partner_username}</span>
                <span className="last-message-preview">{getLastMessagePreview()}</span>
            </div>
            {conv.last_message_time && (
                <span className="last-message-time">
                    {formatRelative(new Date(conv.last_message_time), new Date(), { locale: fr })}
                </span>
            )}
        </div>
    );
};

const DirectMessagesPage = () => {
    const { conversationId } = useParams();
    const navigate = useNavigate();
    const { user, token } = useContext(AuthContext);
    const [conversations, setConversations] = useState([]);
    const [currentConversation, setCurrentConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const currentConversationRef = useRef(null);

    useEffect(() => {
        currentConversationRef.current = currentConversation;
    }, [currentConversation]);

    // 1. Fonction pour charger la liste des conversations
    const fetchConversations = () => {
        if (token) {
            // --- CHANGEMENT N°2.1 : Utilisation de apiClient ---
            apiClient.get('/api/conversations')
                .then(res => setConversations(res.data || []))
                .catch(err => console.error("Erreur chargement conversations", err));
        }
    };

    // 2. Fonction pour charger les messages d'une conversation
    const loadMessages = async (conv) => {
        if (!conv || !token) return;
        setCurrentConversation(conv);
        setMessages([]);
        socket.emit('joinConversation', { conversationId: String(conv.id) });
        try {
            // --- CHANGEMENT N°2.2 : Utilisation de apiClient ---
            const res = await apiClient.get(`/api/conversations/${conv.id}/messages`);
            setMessages(res.data || []);
        } catch (error) {
            console.error("Erreur chargement messages:", error);
        }
    };

    // Charge la liste des conversations au démarrage
    useEffect(() => {
        fetchConversations();
    }, [token]);

    // Charge les messages quand l'URL change
    useEffect(() => {
        if (conversationId && conversations.length > 0) {
            const activeConv = conversations.find(c => String(c.id) === conversationId);
            if (activeConv && currentConversation?.id !== activeConv.id) {
                loadMessages(activeConv);
            }
        }
    }, [conversationId, conversations]);

    // Met en place le listener Socket.IO
    useEffect(() => {
        const privateMessageListener = (newMessage) => {
            fetchConversations();
            if (currentConversationRef.current && String(newMessage.conversation_id) === String(currentConversationRef.current.id)) {
                setMessages(prev => [...prev, newMessage]);
            }
        };
        socket.on('privateMessage', privateMessageListener);
        return () => { socket.off('privateMessage', privateMessageListener); };
    }, []);

    const handleSelectConversation = (conv) => {
        navigate(`/dms/${conv.id}`);
    };

    const handleSendMessage = (content, type = 'text') => {
        if (!content.trim() || !currentConversation || !user) return;
        socket.emit('sendPrivateMessage', { content, userId: user.id, conversationId: currentConversation.id, type });
        const optimisticMessage = {
            id: `temp-${Date.now()}`,
            content: content,
            type: type,
            timestamp: new Date().toISOString(),
            user: { id: user.id, username: user.username, avatar: user.avatar }
        };
        setMessages(prev => [...prev, optimisticMessage]);
        setConversations(prev => prev.map(c => 
            c.id === currentConversation.id ? { ...c, last_message: content, last_message_time: optimisticMessage.timestamp, last_message_type: type } : c
        ).sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time)));
    };
    
    const handleFileUpload = async (file) => {
        if (!file || !currentConversation || !user) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            // --- CHANGEMENT N°2.3 : Utilisation de apiClient ---
            const res = await apiClient.post('/api/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            const { fileUrl, fileType } = res.data;
            const messageType = fileType.startsWith('image/') ? 'image' : (fileType.startsWith('video/') ? 'video' : 'file');
            handleSendMessage(fileUrl, messageType);
        } catch (error) { console.error(error); }
    };

    return (
        <div className="dm-page-layout">
            <div className="conversation-list-panel">
                <header><h2>Messages</h2></header>
                <div className="conversation-list">
                    {conversations.length > 0 ? (
                        conversations.map(conv => (
                            <ConversationItem key={conv.id} conv={conv} onSelect={handleSelectConversation} isActive={currentConversation?.id === conv.id} />
                        ))
                    ) : (
                        <div className="no-conversations-placeholder">Aucune conversation.</div>
                    )}
                </div>
            </div>
            <div className="dm-chat-window">
                 <ChatWindow 
                  room={currentConversation ? { name: currentConversation.partner_username } : null}
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  onFileUpload={handleFileUpload}
                  currentUser={user}
                 />
            </div>
        </div>
    );
};

export default DirectMessagesPage;