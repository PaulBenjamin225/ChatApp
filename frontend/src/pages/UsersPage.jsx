// frontend/src/pages/UsersPage.jsx 

import React, { useState, useEffect, useContext } from 'react';
import apiClient from '../api/axios'; // <-- On importe notre client API
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext'; // On en a encore besoin pour le token de UsersPage
import { FaSearch, FaStar, FaRegStar } from 'react-icons/fa';
import './UsersPage.css';


export const UserCard = ({ user, onBlock, isFavorite, onFavoriteToggle }) => {
    const navigate = useNavigate();
    // Le token n'est plus nécessaire ici, apiClient le gère !

    const handleStartConversation = async () => {
        try {
            // ---  Utilisation de apiClient ---
            await apiClient.post('/api/conversations', { partnerId: user.id });
            navigate('/dms');
        } catch (error) {
            console.error(error);
            alert("Impossible de démarrer la conversation.");
        }
    };
    
    const handleToggleFavorite = async () => {
        const action = isFavorite ? 'delete' : 'post';
        const url = `/api/favorites/${user.id}`; // URL simplifiée
        
        try {
            if (action === 'post') {
                // ---  Utilisation de apiClient ---
                await apiClient.post(url, {});
            } else {
                // ---  Utilisation de apiClient ---
                await apiClient.delete(url);
            }
            if(onFavoriteToggle) {
                onFavoriteToggle();
            }
        } catch (error) {
            console.error(error);
            alert("L'opération sur les favoris a échoué.");
        }
    };
    
    return (
        <div className="user-card">
            <button className="favorite-button" onClick={handleToggleFavorite}>
                {isFavorite ? <FaStar color="#ffc107" /> : <FaRegStar />}
            </button>
            <img src={user.profile_picture_url || `https://i.pravatar.cc/100?u=${user.id}`} alt={user.username} className="user-card-avatar" />
            <h3 className="user-card-name">{user.username}</h3>
            <p className="user-card-age-gender">{user.age ? `${user.age} ans` : ''} {user.gender && user.gender !== 'Non précisé' ? `(${user.gender})` : ''}</p>
            <p className="user-card-intent"><strong>Cherche:</strong> {user.relationship_intent || 'Non spécifié'}</p>
            <div className="user-card-actions">
                <button className="action-button message" onClick={handleStartConversation}>Message</button>
                <button className="action-button block" onClick={() => onBlock(user.id)}>Bloquer</button>
            </div>
        </div>
    );
};

const UsersPage = () => {
    const { token } = useContext(AuthContext); // On le garde ici pour le useEffect dépendant du token
    const [users, setUsers] = useState([]);
    const [favoriteStatus, setFavoriteStatus] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchUsersAndFavorites = async () => {
        if (!token) return;
        setLoading(true);
        try {
            // ---  Utilisation de apiClient ---
            const usersRes = await apiClient.get(`/api/users/search`, {
                params: { keyword: searchTerm }
            });
            setUsers(usersRes.data);

            if (usersRes.data.length > 0) {
                const userIds = usersRes.data.map(u => u.id);
                // --- Utilisation de apiClient ---
                const favsRes = await apiClient.post(`/api/favorites/status`, { userIds });
                setFavoriteStatus(favsRes.data);
            } else {
                setFavoriteStatus({});
            }
        } catch (err) { 
            console.error("Erreur lors du chargement des utilisateurs ou des favoris", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timerId = setTimeout(() => {
            fetchUsersAndFavorites();
        }, 500);
        return () => clearTimeout(timerId);
    }, [token, searchTerm]);

    const handleBlockUser = async (userId) => {
        if (!window.confirm("Êtes-vous sûr de vouloir bloquer cet utilisateur ?")) return;
        try {
            // ---  Utilisation de apiClient ---
            await apiClient.post(`/api/users/block/${userId}`, {});
            fetchUsersAndFavorites();
        } catch (err) { alert("Le blocage a échoué."); }
    };
    
    const handleFavoriteToggle = () => {
        // Simple rafraîchissement
        fetchUsersAndFavorites();
    };

    return (
        <div className="users-page-container">
            <header className="users-page-header">
                <h1>Découvrir d'autres membres</h1>
                <div className="search-container">
                    <FaSearch className="search-icon" />
                    <input type="text" placeholder="Rechercher par nom d'utilisateur..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
            </header>
            <main className="users-grid">
                {loading ? <p>Chargement...</p> : users.length > 0 ? 
                 users.map(user => (
                    <UserCard 
                        key={user.id} 
                        user={user} 
                        onBlock={handleBlockUser}
                        isFavorite={favoriteStatus[user.id] || false}
                        onFavoriteToggle={handleFavoriteToggle}
                    />
                 )) : <p>Aucun utilisateur trouvé pour cette recherche.</p>}
            </main>
        </div>
    );
};

export default UsersPage;