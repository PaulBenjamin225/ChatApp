import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { formatRelative } from 'date-fns';
import { fr } from 'date-fns/locale';

import apiClient from '../api/axios'; // client API centralisé
import AuthContext from '../context/AuthContext';
import ChatWindow from '../components/ChatWindow';
import './DirectMessagesPage.css';

// Connexion Socket.IO dynamique 
const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const socket = io(VITE_API_URL);

// Le composant ConversationItem 
const ConversationItem = ({ conv, onSelect, isActive }) => {
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
    const { user, token } = useContext(AuthContext); // token n'est pas utilisé directement, mais sa présence garantit que apiClient est authentifié
    const [conversations, setConversations] = useState([]);
    const [currentConversation, setCurrentConversation] = useState(null);
    const [messages, setMessages] = useState([]);
   

    // --- LOGIQUE DE CHARGEMENT DES DONNÉES (STABILISÉE AVEC useCallback) ---

    const fetchConversations = useCallback(async () => {
        if (!token) return; // On garde la garde pour éviter les appels non authentifiés
        try {
            const res = await apiClient.get('/api/conversations');
            setConversations(res.data || []);
        } catch (err) {
            console.error("Erreur chargement conversations", err);
        }
    }, [token]);

    const loadMessages = useCallback(async (convId) => {
        if (!convId || !token) return;
        try {
            const res = await apiClient.get(`/api/conversations/${convId}/messages`);
            setMessages(res.data || []);
        } catch (error) {
            console.error("Erreur chargement messages:", error);
        }
    }, [token]);

    // --- GESTION DES EFFETS (useEffect) ---

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    useEffect(() => {
        if (conversationId && conversations.length > 0) {
            const activeConv = conversations.find(c => String(c.id) === conversationId);
            if (activeConv) {
                setCurrentConversation(activeConv);
                loadMessages(conversationId);
            }
        }
    }, [conversationId, conversations, loadMessages]);

    // --- GESTION DES SOCKETS ---

    // Gère l'entrée/sortie des rooms de conversation
    useEffect(() => {
        if (conversationId) {
            socket.emit('joinConversation', { conversationId });
        }
    }, [conversationId]);

    // Gère la réception des messages entrants
    useEffect(() => {
        const privateMessageListener = (newMessage) => {
            // Met à jour la liste des conversations à gauche (aperçu, ordre)
            fetchConversations();

            // Vérifie si le message appartient à la conversation actuellement affichée
            const currentConvId = window.location.pathname.split('/').pop();
            if (String(newMessage.conversation_id) === currentConvId) {
                setMessages(prev => [...prev, newMessage]);
            }
        };

        socket.on('privateMessage', privateMessageListener);

        return () => {
            socket.off('privateMessage', privateMessageListener);
        };
    }, [fetchConversations]); // Dépend de fetchConversations pour la mise à jour

    // --- GESTION DES ACTIONS UTILISATEUR ---

    const handleSelectConversation = (conv) => {
        navigate(`/dms/${conv.id}`);
    };

    // CORRECTION APPLIQUÉE ICI : suppression de la mise à jour optimiste
    const handleSendMessage = (content, type = 'text') => {
        if (!content.trim() || !currentConversation || !user) return;
        
        socket.emit('sendPrivateMessage', { content, userId: user.id, conversationId: currentConversation.id, type });
        
        setConversations(prev => prev.map(c => 
            c.id === currentConversation.id ? { ...c, last_message: content, last_message_time: new Date().toISOString(), last_message_type: type } : c
        ).sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time)));
    };
    
    const handleFileUpload = async (file) => {
        if (!file || !currentConversation || !user) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await apiClient.post('/api/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            const { fileUrl, fileType } = res.data;
            const messageType = fileType.startsWith('image/') ? 'image' : (fileType.startsWith('video/') ? 'video' : 'file');
            handleSendMessage(fileUrl, messageType);
        } catch (error) { 
            console.error(error); 
        }
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