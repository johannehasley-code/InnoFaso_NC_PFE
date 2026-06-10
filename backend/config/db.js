// config/db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'innofaso_db',
  waitForConnections: true,
  connectionLimit:    10,
  charset:            'utf8mb4',
});

// Test connexion au démarrage
pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL connecté :', process.env.DB_NAME);
    conn.release();
  })
  .catch(err => {
    console.error('❌ Erreur MySQL :', err.message);
    console.error('   → Vérifiez que XAMPP est démarré + que innofaso_db existe dans phpMyAdmin');
    process.exit(1);
  });

module.exports = pool;
