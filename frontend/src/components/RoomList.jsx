// src/components/RoomList.jsx
import React from 'react';
import { FaSearch } from 'react-icons/fa';
import './RoomList.css';

const RoomList = ({ rooms, currentRoom, onRoomSelect, onlineUsers }) => {
    return (
        <div className="room-list-container">
            <div className="room-list-header">
                {/* User profile section can be added here */}
                <div className="search-bar">
                    <FaSearch className="search-icon" />
                    <input type="text" placeholder="Chercher une personne ou un message" />
                </div>
            </div>

            <div className="online-users-section">
                <h3>En ligne</h3>
                <div className="online-users-list">
                    {onlineUsers.map(user => (
                        <div key={user.id} className="online-user-avatar">
                            <img src={user?.profile_picture_url ||`https://i.pravatar.cc/40?u=${user.id}`} alt={user.username} />
                            <span className="online-dot"></span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="messages-section">
                <h3>Salles de Tchat</h3>
                <div className="room-items">
                    {rooms.map(room => (
                        <div 
                            key={room.id} 
                            className={`room-item ${currentRoom?.id === room.id ? 'active' : ''}`}
                            onClick={() => onRoomSelect(room)}
                        >
                            <div className="room-avatar-placeholder">{room.name.charAt(0)}</div>
                            <div className="room-item-details">
                                <span className="room-name">{room.name}</span>
                                <span className="room-description">{room.description}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RoomList;