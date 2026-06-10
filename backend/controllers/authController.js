// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const db     = require('../config/db');
const { log } = require('../models/auditLog');

const MAX  = parseInt(process.env.MAX_LOGIN_ATTEMPTS)  || 5;
const LOCK = parseInt(process.env.LOCK_DURATION_MINUTES)|| 15;

const makeTokens = (user) => {
  const payload = { userId:user.id, role:user.role, email:user.email };
  const accessToken  = jwt.sign(payload, process.env.JWT_SECRET,
                                { expiresIn: process.env.JWT_EXPIRES_IN || '30m' });
  const refreshToken = jwt.sign({ userId:user.id, jti:uuid() },
                                process.env.JWT_REFRESH_SECRET,
                                { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
  return { accessToken, refreshToken };
};

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;
  const ip = req.ip; const ua = req.headers['user-agent'];
  try {
    const [rows] = await db.execute(
      `SELECT u.*,r.name AS role,r.label AS role_label,r.permissions
       FROM users u JOIN roles r ON u.role_id=r.id
       WHERE u.email=?`, [email.toLowerCase().trim()]
    );
    if (!rows.length) {
      await log({ action:'LOGIN_FAILED_UNKNOWN', ipAddress:ip, userAgent:ua, newValue:{email} });
      return res.status(401).json({ success:false, message:'Email ou mot de passe incorrect.' });
    }
    const u = rows[0];

    if (!u.actif) {
      // Message spécifique si compte en attente de validation
      const msg = u.password_hash !== 'SEED_REQUIRED'
        ? 'Votre compte est en attente de validation par un administrateur. Vous serez notifié(e) dès l\'activation.'
        : 'Compte désactivé. Contactez l\'administrateur.';
      return res.status(403).json({ success:false, message:msg, pendingValidation: true });
    }

    if (u.locked_until && new Date(u.locked_until) > new Date()) {
      const rem = Math.ceil((new Date(u.locked_until)-new Date())/60000);
      await log({ userId:u.id, action:'LOGIN_BLOCKED', ipAddress:ip });
      return res.status(423).json({ success:false,
        message:`Compte verrouillé. Réessayez dans ${rem} minute(s).` });
    }

    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) {
      const att = u.failed_attempts + 1;
      const lockUntil = att >= MAX
        ? new Date(Date.now() + LOCK*60000).toISOString().slice(0,19).replace('T',' ')
        : null;
      await db.execute('UPDATE users SET failed_attempts=?,locked_until=? WHERE id=?',[att,lockUntil,u.id]);
      await log({ userId:u.id, action:'LOGIN_FAILED', ipAddress:ip, newValue:{attempts:att} });
      const msg = lockUntil
        ? `Compte verrouillé pour ${LOCK} minutes.`
        : `Mot de passe incorrect. ${MAX-att} tentative(s) restante(s).`;
      return res.status(401).json({ success:false, message:msg });
    }

    const { accessToken, refreshToken } = makeTokens(u);
    const exp = new Date(Date.now()+7*24*3600*1000).toISOString().slice(0,19).replace('T',' ');
    await db.execute('INSERT INTO refresh_tokens (user_id,token,expires_at) VALUES (?,?,?)',
                     [u.id, refreshToken, exp]);
    await db.execute('UPDATE users SET failed_attempts=0,locked_until=NULL,last_login=NOW() WHERE id=?',[u.id]);
    await log({ userId:u.id, action:'LOGIN_SUCCESS', ipAddress:ip, userAgent:ua });

    return res.json({ success:true, message:'Connexion réussie.', data:{
      accessToken, refreshToken,
      user:{ id:u.id, nom:u.nom, prenom:u.prenom, email:u.email,
             role:u.role, roleLabel:u.role_label, service:u.service,
             permissions: JSON.parse(u.permissions||'{}') }
    }});
  } catch(err) {
    console.error(err);
    return res.status(500).json({ success:false, message:'Erreur serveur.' });
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  const { refreshToken } = req.body;
  try {
    if (refreshToken)
      await db.execute('UPDATE refresh_tokens SET revoked=1 WHERE token=?',[refreshToken]);
    if (req.user) await log({ userId:req.user.id, action:'LOGOUT', ipAddress:req.ip });
    return res.json({ success:true, message:'Déconnexion réussie.' });
  } catch { return res.status(500).json({ success:false, message:'Erreur serveur.' }); }
};

// POST /api/auth/refresh
const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(401).json({ success:false, message:'Refresh token manquant.' });
  try {
    const [rows] = await db.execute(
      `SELECT rt.*,u.email,r.name AS role FROM refresh_tokens rt
       JOIN users u ON rt.user_id=u.id JOIN roles r ON u.role_id=r.id
       WHERE rt.token=? AND rt.revoked=0 AND rt.expires_at>NOW()`, [refreshToken]
    );
    if (!rows.length)
      return res.status(401).json({ success:false, message:'Refresh token invalide ou expiré.' });
    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const row = rows[0];
    const accessToken = jwt.sign(
      { userId:row.user_id, role:row.role, email:row.email },
      process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN||'30m' }
    );
    return res.json({ success:true, data:{ accessToken } });
  } catch { return res.status(401).json({ success:false, message:'Refresh token invalide.' }); }
};

// GET /api/auth/me
const me = async (req, res) => res.json({ success:true, data:{
  id:req.user.id, nom:req.user.nom, prenom:req.user.prenom,
  email:req.user.email, role:req.user.role, service:req.user.service,
  permissions:req.user.permissions
}});

// ── NOUVEAU : POST /api/auth/register ────────────────────────
const register = async (req, res) => {
  const { nom, prenom, email, password, service } = req.body;
  const ip = req.ip;
  const ua = req.headers['user-agent'];
  try {
    // Vérifier si email déjà pris
    const [existing] = await db.execute(
      'SELECT id FROM users WHERE email=?', [email.toLowerCase().trim()]
    );
    if (existing.length)
      return res.status(409).json({ success:false,
        message:'Cet email est déjà utilisé. Connectez-vous ou utilisez un autre email.' });

    // Rôle par défaut : opérateur
    const [roles] = await db.execute("SELECT id FROM roles WHERE name='operateur' LIMIT 1");
    if (!roles.length)
      return res.status(500).json({ success:false, message:'Configuration rôles manquante.' });

    // Hash mot de passe
    const hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS)||12);

    // Créer utilisateur avec actif=0 (en attente de validation admin)
    const [result] = await db.execute(
      `INSERT INTO users (nom,prenom,email,password_hash,role_id,service,actif)
       VALUES (?,?,?,?,?,?,0)`,
      [nom.trim(), prenom.trim(), email.toLowerCase().trim(), hash, roles[0].id, service?.trim()||null]
    );

    await log({ action:'USER_REGISTERED', targetTable:'users', targetId:result.insertId,
                newValue:{nom,prenom,email,service}, ipAddress:ip, userAgent:ua });

    return res.status(201).json({ success:true,
      message:'Compte créé avec succès ! Un administrateur doit valider votre accès avant connexion.',
      data:{ id:result.insertId, nom, prenom, email:email.toLowerCase() }
    });
  } catch(err) {
    console.error('register error:', err);
    return res.status(500).json({ success:false, message:'Erreur serveur.' });
  }
};

// ── NOUVEAU : GET /api/auth/check-email ──────────────────────
const checkEmail = async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ success:false, message:'Email requis.' });
  try {
    const [rows] = await db.execute(
      'SELECT id FROM users WHERE email=?', [email.toLowerCase().trim()]
    );
    return res.json({ success:true, exists: rows.length > 0 });
  } catch { return res.status(500).json({ success:false, message:'Erreur serveur.' }); }
};

module.exports = { login, logout, refresh, me, register, checkEmail };
