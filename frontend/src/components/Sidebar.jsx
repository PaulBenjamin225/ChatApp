// frontend/src/components/Sidebar.jsx
import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { FaHome, FaBookmark, FaCommentDots, FaUsers, FaCog, FaSignOutAlt } from 'react-icons/fa';
import './Sidebar.css';
import AuthContext from '../context/AuthContext';

const Sidebar = () => {
    // On récupère l'utilisateur COMPLET depuis le contexte
    const { user, logout } = useContext(AuthContext);

    return (
        <div className="sidebar">
            {/* On utilise la vraie photo de profil de l'utilisateur connecté */}
            <div className="sidebar-logo">
                <img 
                    src={user?.profile_picture_url || `https://i.pravatar.cc/48?u=${user?.id}`} 
                    alt="Mon profil"
                    className="logo-image" 
                />
            </div>
            <nav className="sidebar-nav">
                <NavLink to="/" className="nav-item" end><FaHome /></NavLink>
                <NavLink to="/bookmarks" className="nav-item"><FaBookmark /></NavLink>
                <NavLink to="/dms" className="nav-item"><FaCommentDots /></NavLink>
                <NavLink to="/users" className="nav-item"><FaUsers /></NavLink>
                <NavLink to="/settings" className="nav-item"><FaCog /></NavLink>
            </nav>
            <div className="sidebar-logout">
                <button onClick={logout} className="nav-item logout-btn"><FaSignOutAlt /></button>
            </div>
        </div>
    );
};

export default Sidebar;