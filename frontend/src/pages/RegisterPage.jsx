// src/pages/RegisterPage.jsx
import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const RegisterPage = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { register } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await register({ username, email, password });
            navigate('/');
        } catch (error) {
            console.error('Erreur d\'inscription', error);
            alert('Erreur lors de l\'inscription. Cet email ou pseudo est peut-être déjà pris.');
        }
    };

    return (
        <div className="auth-container">
            <form className="auth-form" onSubmit={handleSubmit}>
                <h2>Inscription</h2>
                 <div className="form-group">
                    <label htmlFor="username">Nom d'utilisateur</label>
                    <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Mot de passe</label>
                    <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <button type="submit">S'inscrire</button>
                 <p className="switch-auth">
                    Déjà un compte ? <Link to="/login">Connectez-vous</Link>
                </p>
            </form>
        </div>
    );
};

export default RegisterPage;