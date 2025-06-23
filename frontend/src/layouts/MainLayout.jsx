import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import '../App.css'; // On réutilise le style de base

const MainLayout = () => {
    return (
        // La grille principale de l'application est maintenant ici
        <div className="app-layout">
            <Sidebar />
            {/* L'Outlet est l'endroit où React Router affichera la page active (Tchat, Paramètres, etc.) */}
            <Outlet />
        </div>
    );
};

export default MainLayout;