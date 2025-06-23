// config/db.js
const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test de la connexion
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Erreur de connexion à la base de données:', err.stack);
        return;
    }
    console.log('Connecté à la base de données MySQL avec l\'ID ' + connection.threadId);
    connection.release(); // Libérer la connexion
});

// Exporter une version "promise" du pool pour utiliser async/await
module.exports = pool.promise();