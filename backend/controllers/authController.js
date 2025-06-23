// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Fonction pour générer un token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Inscrire un nouvel utilisateur
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { username, email, password, age, gender, relationship_intent } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Veuillez remplir tous les champs obligatoires' });
    }

    try {
        // Vérifier si l'utilisateur existe déjà
        let [userExists] = await db.query('SELECT email FROM users WHERE email = ? OR username = ?', [email, username]);
        if (userExists.length > 0) {
            return res.status(400).json({ message: 'Cet utilisateur existe déjà' });
        }

        // Hacher le mot de passe
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Créer l'utilisateur
        const [result] = await db.query(
            'INSERT INTO users (username, email, password, age, gender, relationship_intent) VALUES (?, ?, ?, ?, ?, ?)',
            [username, email, hashedPassword, age, gender, relationship_intent]
        );
        
        const newUser_id = result.insertId;

        // Récupérer l'utilisateur créé pour renvoyer ses infos
        const [newUser] = await db.query('SELECT id, username, email, role FROM users WHERE id = ?', [newUser_id]);

        if (newUser.length > 0) {
            res.status(201).json({
                id: newUser[0].id,
                username: newUser[0].username,
                email: newUser[0].email,
                role: newUser[0].role,
                token: generateToken(newUser[0].id),
            });
        } else {
            res.status(400).json({ message: 'Données utilisateur invalides' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur du serveur' });
    }
};

// @desc    Authentifier un utilisateur & obtenir un token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (users.length > 0) {
            const user = users[0];
            const isMatch = await bcrypt.compare(password, user.password);

            if (isMatch) {
                res.json({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    token: generateToken(user.id),
                });
            } else {
                res.status(401).json({ message: 'Email ou mot de passe incorrect' });
            }
        } else {
            res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur du serveur' });
    }
};

module.exports = { registerUser, loginUser };