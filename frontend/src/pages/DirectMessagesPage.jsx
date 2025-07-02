// frontend/src/pages/DirectMessagesPage.jsx

import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Nécessaire pour la persistance
import axios from 'axios';
import io from 'socket.io-client';
import { formatRelative } from 'date-fns';
import { fr } from 'date-fns/locale';

import AuthContext from '../context/AuthContext';
import ChatWindow from '../components/ChatWindow';
import './DirectMessagesPage.css';

const socket = io('http://localhost:5000');

// Ce composant est correct, on n'y touche pas.
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
    // Hooks pour le routage, le contexte et l'état
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

    // --- LOGIQUE DE CHARGEMENT (SIMPLIFIÉE) ---

    // 1. Fonction pour charger la liste des conversations
    const fetchConversations = () => {
        if (token) {
            axios.get('http://localhost:5000/api/conversations', { headers: { Authorization: `Bearer ${token}` } })
                .then(res => setConversations(res.data || [])) // On prend les données telles quelles
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
            const res = await axios.get(`http://localhost:5000/api/conversations/${conv.id}/messages`, { headers: { Authorization: `Bearer ${token}` } });
            // SIMPLIFICATION MAJEURE : On ne transforme plus les messages. On fait confiance à l'API.
            setMessages(res.data || []);
        } catch (error) {
            console.error("Erreur chargement messages:", error);
        }
    };

    // --- GESTION DES EFFETS (useEffect) ---

    // Charge la liste des conversations au démarrage
    useEffect(() => {
        fetchConversations();
    }, [token]);

    // Charge les messages quand l'URL change (clic sur une conversation ou retour sur la page)
    useEffect(() => {
        if (conversationId && conversations.length > 0) {
            const activeConv = conversations.find(c => String(c.id) === conversationId);
            if (activeConv && currentConversation?.id !== activeConv.id) {
                loadMessages(activeConv);
            }
        }
    }, [conversationId, conversations]); // Dépend de l'ID dans l'URL et de la liste chargée

    // Met en place le listener Socket.IO une seule fois
    useEffect(() => {
        const privateMessageListener = (newMessage) => {
            // On rafraîchit la liste (pour l'aperçu et l'ordre)
            fetchConversations();
            // Si le message est pour la conversation active, on l'ajoute.
            if (currentConversationRef.current && String(newMessage.conversation_id) === String(currentConversationRef.current.id)) {
                // SIMPLIFICATION MAJEURE : On ne transforme plus le message. Le backend l'a déjà fait.
                setMessages(prev => [...prev, newMessage]);
            }
        };
        socket.on('privateMessage', privateMessageListener);
        return () => { socket.off('privateMessage', privateMessageListener); };
    }, []); // Dépendance vide, c'est correct.

    // --- GESTION DES ACTIONS UTILISATEUR ---

    // Quand on clique sur une conversation, on change juste l'URL. Le useEffect s'occupera du reste.
    const handleSelectConversation = (conv) => {
        navigate(`/dms/${conv.id}`);
    };

    // Quand on envoie un message texte
    const handleSendMessage = (content, type = 'text') => {
        if (!content.trim() || !currentConversation || !user) return;
        
        socket.emit('sendPrivateMessage', { content, userId: user.id, conversationId: currentConversation.id, type });

        // Mise à jour optimiste : le seul endroit où on crée un objet message.
        // Il DOIT avoir la même structure que ce que le backend envoie.
        const optimisticMessage = {
            id: `temp-${Date.now()}`,
            content: content,
            type: type,
            timestamp: new Date().toISOString(),
            user: { id: user.id, username: user.username, avatar: user.avatar }
        };
        setMessages(prev => [...prev, optimisticMessage]);
        
        // Mettre à jour la liste à gauche pour la réactivité
        setConversations(prev => prev.map(c => 
            c.id === currentConversation.id ? { ...c, last_message: content, last_message_time: optimisticMessage.timestamp, last_message_type: type } : c
        ).sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time)));
    };
    
    // Quand on envoie un fichier
    const handleFileUpload = async (file) => {
        if (!file || !currentConversation || !user) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await axios.post('http://localhost:5000/api/upload', formData, { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` } });
            const { fileUrl, fileType } = res.data;
            const messageType = fileType.startsWith('image/') ? 'image' : (fileType.startsWith('video/') ? 'video' : 'file');
            // On réutilise handleSendMessage pour envoyer le message de type fichier
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