// frontend/src/pages/FavoritesPage.jsx - Version Corrigée

import React, { useState, useEffect, useContext } from 'react';
// import axios from 'axios'; // <-- CHANGEMENT : On n'a plus besoin d'importer axios ici
import apiClient from '../api/axios'; // <-- CHANGEMENT : On importe notre client API centralisé
import AuthContext from '../context/AuthContext';
import { UserCard } from './UsersPage';
import './UsersPage.css';

const FavoritesPage = () => {
    const { token } = useContext(AuthContext);
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchFavorites = () => {
        if (!token) return;
        setLoading(true);
        
        // --- CHANGEMENT : Utilisation de apiClient ---
        // L'URL et le header d'autorisation sont gérés automatiquement.
        apiClient.get('/api/favorites')
            .then(res => setFavorites(res.data))
            .catch(err => console.error("Erreur chargement favoris", err))
            .finally(() => setLoading(false));
    };

    useEffect(fetchFavorites, [token]);

    const handleBlockUser = (userId) => {
        alert(`Blocage non implémenté ici (ID: ${userId})`);
    };

    const handleFavoriteAction = () => {
        // Cette fonction est appelée après qu'un utilisateur a été retiré des favoris
        // depuis le composant UserCard. On rafraîchit simplement la liste.
        fetchFavorites();
    };

    return (
        <div className="users-page-container">
            <header className="users-page-header">
                <h1>Mes Favoris</h1>
                <p>Retrouvez ici les utilisateurs que vous avez marqués.</p>
            </header>
            <main className="users-grid">
                {loading ? <p>Chargement...</p> : 
                 favorites.length > 0 ? 
                 favorites.map(user => (
                    <UserCard 
                        key={user.id} 
                        user={user} 
                        onBlock={handleBlockUser} 
                        isFavorite={true} // On dit à la carte que l'utilisateur est déjà un favori
                        onFavoriteToggle={handleFavoriteAction}
                    />
                )) : <p>Vous n'avez ajouté aucun utilisateur à vos favoris.</p>}
            </main>
        </div>
    );
};

export default FavoritesPage;