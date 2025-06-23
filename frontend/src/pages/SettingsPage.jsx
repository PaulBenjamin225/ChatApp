// frontend/src/pages/SettingsPage.jsx

import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { FaCamera } from 'react-icons/fa';
import './SettingsPage.css';

// Le composant BlockedUsersList reste identique.
const BlockedUsersList = ({ token }) => { /* ... Collez le code de BlockedUsersList ici ... */ };
const BlockedUsersListComponent = ({ token }) => {
    const [blockedUsers, setBlockedUsers] = useState([]);
    const fetchBlockedUsers = async () => { try { const res = await axios.get('http://localhost:5000/api/users/blocked', { headers: { Authorization: `Bearer ${token}` } }); setBlockedUsers(res.data); } catch (error) { console.error("Erreur chargement utilisateurs bloqués", error); } };
    useEffect(() => { if (token) fetchBlockedUsers(); }, [token]);
    const handleUnblock = async (userId) => { try { await axios.delete(`http://localhost:5000/api/users/unblock/${userId}`, { headers: { Authorization: `Bearer ${token}` } }); fetchBlockedUsers(); } catch (error) { alert('Le déblocage a échoué.'); } };
    return (
        <div className="blocked-users-section">
            <h2>Utilisateurs Bloqués</h2>
            {blockedUsers.length > 0 ? (
                <ul className="blocked-users-list">
                    {blockedUsers.map(user => (
                        <li key={user.id} className="blocked-user-item">
                            <img src={user.profile_picture_url || `https://i.pravatar.cc/40?u=${user.id}`} alt={user.username} />
                            <span>{user.username}</span>
                            <button onClick={() => handleUnblock(user.id)} className="unblock-button">Débloquer</button>
                        </li>
                    ))}
                </ul>
            ) : (<p>Vous n'avez bloqué aucun utilisateur.</p>)}
        </div>
    );
};


const SettingsPage = () => {
    // MODIFIÉ : On récupère refreshUser depuis le contexte
    const { user, token, refreshUser } = useContext(AuthContext);
    const [profileData, setProfileData] = useState({
        age: '', gender: 'Non précisé', interests: '',
        relationship_intent: 'Non précisé', location: '',
        profile_picture_url: ''
    });
    const [statusMessage, setStatusMessage] = useState('');
    const fileInputRef = useRef(null);

    // MODIFIÉ : On utilise l'objet 'user' du contexte pour remplir le formulaire
    // Cela garantit que le formulaire est toujours synchronisé avec le contexte global
    useEffect(() => {
        if (user) {
            setProfileData({
                age: user.age || '',
                gender: user.gender || 'Non précisé',
                interests: user.interests || '',
                relationship_intent: user.relationship_intent || 'Non précisé',
                location: user.location || '',
                profile_picture_url: user.profile_picture_url || ''
            });
        }
    }, [user]); // Cet effet se déclenchera chaque fois que l'utilisateur du contexte change

    const handleChange = (e) => setProfileData({ ...profileData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatusMessage('Enregistrement...');
        try {
            await axios.put('http://localhost:5000/api/users/profile', profileData, { headers: { Authorization: `Bearer ${token}` } });
            await refreshUser(); // Rafraîchir le contexte après la mise à jour des infos texte aussi
            setStatusMessage('Profil enregistré avec succès !');
        } catch (error) { setStatusMessage('Erreur lors de l\'enregistrement.'); }
        setTimeout(() => setStatusMessage(''), 3000);
    };

    const handlePictureClick = () => fileInputRef.current.click();

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        setStatusMessage('Téléchargement de la photo...');
        try {
            await axios.post('http://localhost:5000/api/users/profile/picture', formData, {
                headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
            });
            
            // LA CORRECTION CLÉ : On appelle refreshUser() pour mettre à jour le contexte global
            await refreshUser();
            
            setStatusMessage('Photo mise à jour !');
        } catch (error) {
            console.error("Erreur d'upload de la photo", error);
            setStatusMessage("L'upload a échoué.");
        }
        e.target.value = null;
        setTimeout(() => setStatusMessage(''), 3000);
    };

    return (
        <div className="settings-page-container">
            <div className="settings-content">
                <div className="profile-header">
                    <div className="profile-picture-container" onClick={handlePictureClick}>
                        <img 
                            src={profileData.profile_picture_url || `https://i.pravatar.cc/150?u=${user?.id}`} 
                            alt="Profil" 
                            className="profile-picture"
                        />
                        <div className="profile-picture-overlay"> <FaCamera /> <span>Changer</span> </div>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg, image/gif" style={{ display: 'none' }} />
                    </div>
                    <div className="profile-header-info">
                        <h1>{user?.username}</h1>
                        <p>Mettez à jour vos informations pour de meilleures correspondances.</p>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="settings-form">
                    {/* Le formulaire est inchangé */}
                    <div className="form-group">
                        <label htmlFor="age">Âge</label>
                        <input type="number" id="age" name="age" value={profileData.age} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="gender">Genre</label>
                        <select id="gender" name="gender" value={profileData.gender} onChange={handleChange}>
                            <option value="Non précisé">Non précisé</option><option value="Homme">Homme</option><option value="Femme">Femme</option><option value="Autre">Autre</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="location">Localisation (ville, pays)</label>
                        <input type="text" id="location" name="location" value={profileData.location} onChange={handleChange} placeholder="Ex: Paris, France"/>
                    </div>
                    <div className="form-group">
                        <label htmlFor="relationship_intent">Intention Relationnelle</label>
                        <select id="relationship_intent" name="relationship_intent" value={profileData.relationship_intent} onChange={handleChange}>
                            <option value="Non précisé">Non précisé</option><option value="Amis">Amis</option><option value="Rencontres">Rencontres</option><option value="Connaissances">Connaissances</option><option value="Mariage">Mariage</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="interests">Centres d'intérêt (séparés par des virgules)</label>
                        <textarea id="interests" name="interests" value={profileData.interests} onChange={handleChange} placeholder="Ex: Cinéma, randonnée, jeux vidéo"></textarea>
                    </div>
                    <button type="submit" className="save-button">Enregistrer les modifications</button>
                    {statusMessage && <p className="status-message">{statusMessage}</p>}
                </form>
                <hr className="divider" />
                <BlockedUsersListComponent token={token} />
            </div>
        </div>
    );
};

export default SettingsPage;