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

console.log("DB_USER =", process.env.DB_USER);
console.log("DB_HOST =", process.env.DB_HOST);
console.log("DB_NAME =", process.env.DB_NAME);

console.log('HOST=', process.env.DB_HOST);
console.log('PORT=', process.env.DB_PORT);
console.log('DB=', process.env.DB_NAME);
console.log('USER=', process.env.DB_USER);

pool.query('SELECT DATABASE() AS db')
  .then(([rows]) => console.log('DATABASE=', rows))
  .catch(console.error);

pool.query('SHOW TABLES')
  .then(([rows]) => console.log('TABLES=', rows))
  .catch(console.error);