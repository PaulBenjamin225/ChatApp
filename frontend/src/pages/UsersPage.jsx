// frontend/src/pages/UsersPage.jsx

import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { FaSearch, FaStar, FaRegStar } from 'react-icons/fa';
import './UsersPage.css';

// Le composant UserCard est maintenant exporté pour être utilisé par FavoritesPage
export const UserCard = ({ user, onBlock, isFavorite, onFavoriteToggle }) => {
    const navigate = useNavigate();
    const { token } = useContext(AuthContext);

    const handleStartConversation = async () => {
        try {
            await axios.post('http://localhost:5000/api/conversations', { partnerId: user.id }, { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            navigate('/dms');
        } catch (error) {
            console.error(error);
            alert("Impossible de démarrer la conversation.");
        }
    };
    
    const handleToggleFavorite = async () => {
        const action = isFavorite ? 'delete' : 'post';
        const url = `http://localhost:5000/api/favorites/${user.id}`;
        
        try {
            if (action === 'post') {
                await axios.post(url, {}, { headers: { Authorization: `Bearer ${token}` } });
            } else {
                await axios.delete(url, { headers: { Authorization: `Bearer ${token}` } });
            }
            
            if(onFavoriteToggle) {
                onFavoriteToggle(); // Appelle la fonction passée en prop pour rafraîchir l'état parent
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
    const { token } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    const [favoriteStatus, setFavoriteStatus] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchUsersAndFavorites = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const usersRes = await axios.get(`http://localhost:5000/api/users/search`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { keyword: searchTerm }
            });
            setUsers(usersRes.data);

            if (usersRes.data.length > 0) {
                const userIds = usersRes.data.map(u => u.id);
                const favsRes = await axios.post(`http://localhost:5000/api/favorites/status`, { userIds }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
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
            await axios.post(`http://localhost:5000/api/users/block/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
            fetchUsersAndFavorites(); // Recharger la liste pour retirer l'utilisateur
        } catch (err) { alert("Le blocage a échoué."); }
    };
    
    const handleFavoriteToggle = () => {
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