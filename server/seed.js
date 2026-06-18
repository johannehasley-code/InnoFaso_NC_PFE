import 'dotenv/config';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const USERS = [
  { email: 'admin@innofaso.bf',  password: 'Innofaso@2026!', role: 'admin' },
  { email: 'rq@innofaso.bf',     password: 'Innofaso@2026!', role: 'rq' },
  { email: 'dg@innofaso.bf',     password: 'Innofaso@2026!', role: 'direction' },
  { email: 'chef@innofaso.bf',   password: 'Innofaso@2026!', role: 'responsable_service' },
];

const conn = await mysql.createConnection({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 3307,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'innofaso_nc',
});

for (const u of USERS) {
  const hash = await bcrypt.hash(u.password, 12);
  const [roles] = await conn.execute('SELECT id FROM roles WHERE name=? LIMIT 1', [u.role]);
  if (!roles.length) { console.warn('Role introuvable: ' + u.role); continue; }
  await conn.execute(
    'INSERT INTO users (nom, prenom, email, password_hash, role_id, actif) VALUES (?,?,?,?,?,1) ON DUPLICATE KEY UPDATE password_hash=?, actif=1',
    [u.role, u.role, u.email, hash, roles[0].id, hash]
  );
  console.log('OK ' + u.email);
}

await conn.end();
console.log('Seed termine.');
