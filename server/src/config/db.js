// src/config/db.js
import 'dotenv/config';
import mysql from 'mysql2/promise';


console.log({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER
});

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'innofaso_nc',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
});

pool.getConnection()
  .then(conn => { console.log('✅ MySQL connecté :', process.env.DB_NAME); conn.release(); })
  .catch(err => { console.error('❌ Erreur MySQL complète :', err); process.exit(1); });

export default pool;