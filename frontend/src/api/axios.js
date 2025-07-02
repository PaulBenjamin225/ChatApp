// frontend/src/api/axios.js

import axios from 'axios';

// On récupère l'URL de l'API depuis les variables d'environnement de Vite
const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// C'est la partie magique : l'intercepteur
// Il s'exécute AVANT chaque requête envoyée par apiClient
apiClient.interceptors.request.use(
  (config) => {
    // On récupère le token depuis le localStorage
    const token = localStorage.getItem('token');
    if (token) {
      // Si un token existe, on l'ajoute au header Authorization
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // En cas d'erreur de configuration, on la rejette
    return Promise.reject(error);
  }
);

export default apiClient;