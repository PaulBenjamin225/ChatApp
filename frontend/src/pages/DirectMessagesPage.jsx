// frontend/src/pages/DirectMessagesPage.jsx

import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { formatRelative } from 'date-fns';
import { fr } from 'date-fns/locale';

import AuthContext from '../context/AuthContext';
import ChatWindow from '../components/ChatWindow';
import './DirectMessagesPage.css';

const socket = io('http://localhost:5000');

// Le composant ConversationItem n'a pas besoin de changer.
const ConversationItem = ({ conv, onSelect, isActive }) => {
    const getLastMessagePreview = () => {
        if (!conv.last_message) return "Démarrez la conversation";
        if (conv.last_message_type === 'image') return "📷 Image";
        if (conv.last_message_type === 'video') return "📹 Vidéo";
        if (conv.last_message_type === 'file') return "📎 Fichier";
        return conv.last_message;
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
    const { user, token } = useContext(AuthContext);
    const [conversations, setConversations] = useState([]);
    const [currentConversation, setCurrentConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    
    // LA SOLUTION : Utiliser une ref pour garder une référence "vivante" à la conversation active.
    const currentConversationRef = useRef(null);

    // Mettre à jour la ref chaque fois que l'état de la conversation change.
    useEffect(() => {
        currentConversationRef.current = currentConversation;
    }, [currentConversation]);

    // Fonction pour charger les conversations, réutilisable.
    const fetchConversations = () => {
        if (token) {
            axios.get('http://localhost:5000/api/conversations', { headers: { Authorization: `Bearer ${token}` } })
                 .then(res => setConversations(res.data))
                 .catch(err => console.error("Erreur chargement conversations", err));
        }
    };
    
    // Charger les conversations une seule fois au début.
    useEffect(fetchConversations, [token]);

    // L'écouteur Socket.IO. Il est créé une seule fois et ne se recrée JAMAIS.
    useEffect(() => {
        const privateMessageListener = (newMessage) => {
            console.log("[Socket Event] 'privateMessage' reçu. Données:", newMessage);
            
            // Rafraîchir la liste à gauche pour afficher le dernier message.
            fetchConversations();
            
            // LA CONDITION CLÉ : On utilise la ref, qui a TOUJOURS la bonne valeur.
            if (currentConversationRef.current && newMessage.conversation_id === currentConversationRef.current.id) {
                console.log("[Socket Event] Le message appartient à la conversation active. Mise à jour de l'UI.");
                setMessages(prevMessages => [...prevMessages, newMessage]);
            } else {
                console.log("[Socket Event] Le message n'est pas pour la conversation active. Pas de mise à jour de l'UI du tchat.");
            }
        };

        socket.on('privateMessage', privateMessageListener);

        // Nettoyage du listener quand le composant est détruit.
        return () => {
            socket.off('privateMessage', privateMessageListener);
        };
    }, []); // Le tableau de dépendances vide [] est la garantie que ce code ne s'exécute qu'une fois.

    const handleSelectConversation = async (conv) => {
        if (currentConversation?.id === conv.id) return;
        
        setCurrentConversation(conv); // Met à jour l'état ET la ref via l'autre useEffect.
        setMessages([]);
        socket.emit('joinConversation', { conversationId: String(conv.id) });
        
        const res = await axios.get(`http://localhost:5000/api/conversations/${conv.id}/messages`, { headers: { Authorization: `Bearer ${token}` } });
        setMessages(res.data);
    };

    const handleSendMessage = (content, type = 'text') => {
        if (content.trim() && currentConversation) {
            socket.emit('sendPrivateMessage', { 
                content, 
                userId: user.id, 
                conversationId: currentConversation.id, 
                type: 'text'
            });
        }
    };
    
    const handleFileUpload = async (file) => { if (!file || !currentConversation) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await axios.post('http://localhost:5000/api/upload', formData, { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` } });
            const { fileUrl, fileType } = res.data;
            let messageType = 'file';
            if (fileType.startsWith('image/')) messageType = 'image';
            if (fileType.startsWith('video/')) messageType = 'video';
            socket.emit('sendPrivateMessage', { content: fileUrl, userId: user.id, conversationId: currentConversation.id, type: messageType });
        } catch (error) { console.error(error); }
     };

    return (
        <div className="dm-page-layout">
            <div className="conversation-list-panel">
                <header><h2>Messages</h2></header>
                <div className="conversation-list">
                    {conversations.map(conv => (
                        <ConversationItem key={conv.id} conv={conv} onSelect={handleSelectConversation} isActive={currentConversation?.id === conv.id} />
                    ))}
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