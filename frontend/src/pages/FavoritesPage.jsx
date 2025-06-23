// frontend/src/pages/FavoritesPage.jsx

import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { UserCard } from './UsersPage'; // On importe le composant UserCard
import './UsersPage.css'; // On réutilise le même style

const FavoritesPage = () => {
    const { token } = useContext(AuthContext);
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchFavorites = () => {
        if (!token) return;
        setLoading(true);
        axios.get('http://localhost:5000/api/favorites', { headers: { Authorization: `Bearer ${token}` } })
            .then(res => setFavorites(res.data))
            .catch(err => console.error("Erreur chargement favoris", err))
            .finally(() => setLoading(false));
    };

    useEffect(fetchFavorites, [token]);

    // Pour l'instant, le blocage sur cette page n'est pas implémenté
    const handleBlockUser = (userId) => {
        alert(`Blocage non implémenté ici (ID: ${userId})`);
    };

    // Pour le bouton "Favori", il faut le retirer ici
    const handleFavoriteAction = () => {
        // Cette fonction sera utilisée pour retirer un favori.
        // Après le retrait, on recharge la liste.
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
                        isFavorite={true} // On dit à la carte que c'est un favori
                        onFavoriteToggle={handleFavoriteAction}
                    />
                )) : <p>Vous n'avez ajouté aucun utilisateur à vos favoris.</p>}
            </main>
        </div>
    );
};

export default FavoritesPage;