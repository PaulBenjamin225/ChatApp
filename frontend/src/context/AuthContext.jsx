// src/context/AuthContext.jsx - Version Corrigée et Simplifiée

import React, { createContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/axios'; // <-- CHANGEMENT : On importe notre client API !

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    // On garde le token dans l'état pour que les composants puissent réagir à ses changements
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        // La logique ici reste la même, mais l'appel est simplifié
        // L'intercepteur de apiClient s'occupe de mettre le token dans les headers
        if (token) {
            try {
                // --- CHANGEMENT : Utilisation de apiClient ---
                const res = await apiClient.get('/api/users/profile');
                setUser(res.data);
            } catch (error) {
                console.error("Token invalide ou expiré, déconnexion.", error);
                // Si le token est mauvais, on nettoie tout
                logout();
            }
        }
    }, [token]); // La dépendance à token est correcte

    useEffect(() => {
        const fetchUserOnLoad = async () => {
            // Pas de changement ici, la logique est déjà bonne
            if(token){
                await refreshUser(); 
            }
            setLoading(false);
        };
        fetchUserOnLoad();
    }, [refreshUser, token]); // On ajoute token en dépendance pour être explicite

    const login = async (email, password) => {
        // --- CHANGEMENT : Utilisation de apiClient ---
        const res = await apiClient.post('/api/auth/login', { email, password });
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        // On met à jour l'utilisateur directement avec les données de la réponse de login si elles sont là
        // ou on laisse le useEffect s'en charger. Le refreshUser est plus sûr.
        await refreshUser(); 
    };

    const register = async (userData) => {
        // --- CHANGEMENT : Utilisation de apiClient ---
        const res = await apiClient.post('/api/auth/register', userData);
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        await refreshUser();
    };

    // La fonction logout est maintenant beaucoup plus simple
    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        // Pas besoin de toucher aux headers d'axios, c'est géré ailleurs !
    };

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout, loading, refreshUser }}>
            {/* On s'assure de ne pas afficher l'app avant d'avoir vérifié le statut de connexion */}
            {!loading && children}
        </AuthContext.Provider>
    );
};

export default AuthContext;