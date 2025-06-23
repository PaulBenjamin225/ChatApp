// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useCallback } from 'react'; // Importer useCallback
import axios from 'axios';

const AuthContext = createContext();

const API_URL_AUTH = 'http://localhost:5000/api/auth';
const API_URL_USERS = 'http://localhost:5000/api/users';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    // Mettre le token dans les headers par défaut d'axios
    if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete axios.defaults.headers.common['Authorization'];
    }
    
    // NOUVEAU : Fonction pour rafraîchir les données de l'utilisateur
    // On utilise useCallback pour s'assurer que la fonction ne se recrée pas inutilement
    const refreshUser = useCallback(async () => {
        if (token) {
            try {
                const res = await axios.get(`${API_URL_USERS}/profile`);
                // On récupère toutes les infos de l'utilisateur, y compris la nouvelle URL de la photo
                setUser(res.data);
                console.log("Données utilisateur rafraîchies:", res.data);
            } catch (error) {
                console.error("Token invalide ou expiré, déconnexion forcée");
                // Si le refresh échoue (ex: token expiré), on déconnecte l'utilisateur
                logout();
            }
        }
    }, [token]);

    useEffect(() => {
        const fetchUserOnLoad = async () => {
            await refreshUser(); // On utilise la nouvelle fonction ici aussi au chargement
            setLoading(false);
        };
        fetchUserOnLoad();
    }, [refreshUser]); // Dépend de refreshUser

    const login = async (email, password) => {
        const res = await axios.post(`${API_URL_AUTH}/login`, { email, password });
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        // On récupère le profil complet après la connexion
        await refreshUser();
    };

    const register = async (userData) => {
        const res = await axios.post(`${API_URL_AUTH}/register`, userData);
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        // On récupère le profil complet après l'inscription
        await refreshUser();
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        delete axios.defaults.headers.common['Authorization'];
    };

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout, loading, refreshUser }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export default AuthContext;