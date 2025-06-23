// src/components/RoomInfo.jsx
import React from 'react';
import './RoomInfo.css';

const RoomInfo = ({ room, onlineUsers }) => {
    if (!room) {
        return <div className="room-info-container"></div>; // Empty placeholder
    }

    return (
        <div className="room-info-container">
            <div className="info-header">
                <h3>Infos de la Salle</h3>
            </div>
            <div className="info-section">
                <h4>{room.name}</h4>
                <p>{room.description}</p>
            </div>
            <div className="info-section">
                <h4>Membres en ligne ({onlineUsers.length})</h4>
                <ul className="online-members-list">
                    {onlineUsers.map(user => (
                        <li key={user.id} className="member-item">
                            <img src={user?.profile_picture_url ||`https://i.pravatar.cc/32?u=${user.id}`} alt={user.username} />
                            <span>{user.username}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default RoomInfo;