// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Récupérer le token de l'en-tête
            token = req.headers.authorization.split(' ')[1];

            // Vérifier le token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Récupérer l'utilisateur depuis la BDD (sans le mot de passe) et l'attacher à la requête
            const [rows] = await db.query('SELECT id, username, email, role FROM users WHERE id = ?', [decoded.id]);
            if (rows.length === 0) {
                 return res.status(401).json({ message: 'Non autorisé, utilisateur non trouvé' });
            }
            req.user = rows[0];

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Non autorisé, token invalide' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Non autorisé, pas de token' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Accès refusé, rôle administrateur requis' });
    }
};

module.exports = { protect, admin };