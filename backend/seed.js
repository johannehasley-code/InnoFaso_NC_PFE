// seed.js — Exécuter UNE SEULE FOIS : npm run seed
require('dotenv').config();
const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const USERS = [
  { email: 'admin@innofaso.bf',      password: 'Innofaso@2026!' },
  { email: 'rq@innofaso.bf',         password: 'Innofaso@2026!' },
  { email: 'dg@innofaso.bf',         password: 'Innofaso@2026!' },
  { email: 'chef@innofaso.bf',       password: 'Innofaso@2026!' },
  { email: 'operateur@innofaso.bf',  password: 'Innofaso@2026!' },
];

async function seed() {
  const db = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'innofaso_db',
  });
  console.log('✅ Connecté à MySQL\n');

  for (const u of USERS) {
    const hash = await bcrypt.hash(u.password, 12);
    await db.execute('UPDATE users SET password_hash = ? WHERE email = ?', [hash, u.email]);
    console.log(`✅ ${u.email}`);
  }

  await db.end();
  console.log('\n🎉 Seed terminé ! Mot de passe de tous : Innofaso@2026!');
}

seed().catch(err => { console.error('❌', err.message); process.exit(1); });
