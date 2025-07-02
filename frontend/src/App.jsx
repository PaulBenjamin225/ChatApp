// frontend/src/App.jsx
import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthContext from './context/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatPage from './pages/ChatPage';
import SettingsPage from './pages/SettingsPage';
import UsersPage from './pages/UsersPage';
import DirectMessagesPage from './pages/DirectMessagesPage';
import FavoritesPage from './pages/FavoritesPage'; 

// Layout
import MainLayout from './layouts/MainLayout';

import './App.css';

const PrivateRoute = ({ children }) => {
    const { user, loading } = useContext(AuthContext);
    if (loading) return <div>Chargement...</div>;
    return user ? children : <Navigate to="/login" />;
};

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                
                <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
                    <Route index element={<ChatPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="users" element={<UsersPage />} />
                    
                    {/* ▼▼▼ LA CORRECTION FINALE EST ICI ▼▼▼ */}
                    
                    {/* 1. Route pour la page des messages SANS conversation sélectionnée */}
                    <Route path="dms" element={<DirectMessagesPage />} />
                    
                    {/* 2. Route pour la page des messages AVEC une conversation sélectionnée */}
                    <Route path="dms/:conversationId" element={<DirectMessagesPage />} />
                    
                    {/* Le reste de vos routes */}
                    <Route path="bookmarks" element={<FavoritesPage />} /> 
                </Route>
            </Routes>
        </Router>
    );
}

export default App;