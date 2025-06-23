// frontend/src/components/ChatWindow.jsx

import React, { useState, useRef, useEffect } from 'react';
import { FaPhone, FaVideo, FaEllipsisV, FaPaperclip, FaSmile, FaPaperPlane } from 'react-icons/fa';
import { format } from 'date-fns';
import Picker from 'emoji-picker-react';
import './ChatWindow.css';

const MessageContent = ({ type, content }) => {
    if (type === 'image') {
        return <img src={content} alt="Pièce jointe" className="message-image" />;
    }
    if (type === 'video') {
        return <video src={content} controls className="message-video"></video>;
    }
    // Pour un lien de fichier, on peut le rendre cliquable
    if (type === 'file') {
        return <a href={content} target="_blank" rel="noopener noreferrer">{content.split('/').pop()}</a>
    }
    // Pour 'text'
    return <>{content}</>;
};

const Message = ({ msg, isMe }) => {
    if (msg.user.username === 'Système') {
        return <div className="message-wrapper system"><div className="message-content">{msg.content}</div></div>;
    }
    return (
        <div className={`message-wrapper ${isMe ? 'sent' : 'received'}`}>
            <div className={`message-content ${msg.type}`}>
                {!isMe && <span className="message-sender">{msg.user.username}</span>}
                <MessageContent type={msg.type} content={msg.content} />
                <span className="message-timestamp">{format(new Date(msg.timestamp), 'HH:mm')}</span>
            </div>
        </div>
    );
};

const ChatWindow = ({ room, messages, onSendMessage, onFileUpload, currentUser }) => {
    const [input, setInput] = useState('');
    const [showPicker, setShowPicker] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const onEmojiClick = (emojiData) => { setInput(prev => prev + emojiData.emoji); };
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        onSendMessage(input);
        setInput('');
        setShowPicker(false);
    };

    const handleAttachmentClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            onFileUpload(file);
        }
        // Réinitialiser la valeur pour pouvoir sélectionner le même fichier à nouveau
        e.target.value = null;
    };

    if (!room) return <div className="chat-window-placeholder">Sélectionnez une salle pour commencer à discuter</div>;

    return (
        <div className="chat-window-container">
            <header className="chat-header">
                <div className="chat-header-info"><h2>{room.name}</h2></div>
                <div className="chat-header-actions"><FaPhone /> <FaVideo /> <FaEllipsisV /></div>
            </header>
            <main className="chat-messages">
                {messages.map((msg) => <Message key={msg.id} msg={msg} isMe={currentUser && msg.user.id === currentUser.id} />)}
                <div ref={messagesEndRef} />
            </main>
            <footer className="chat-input-area">
                {showPicker && <div className="emoji-picker-container"><Picker onEmojiClick={onEmojiClick} /></div>}
                <form onSubmit={handleSend} className="chat-form">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                    <button type="button" className="icon-btn" onClick={handleAttachmentClick}><FaPaperclip /></button>
                    <button type="button" className="icon-btn" onClick={() => setShowPicker(!showPicker)}><FaSmile /></button>
                    <input type="text" placeholder="Écrire un message" value={input} onChange={(e) => setInput(e.target.value)} onFocus={() => setShowPicker(false)} />
                    <button type="submit" className="send-btn"><FaPaperPlane /></button>
                </form>
            </footer>
        </div>
    );
};

export default ChatWindow;