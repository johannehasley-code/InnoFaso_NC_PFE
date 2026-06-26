import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import pool from '../config/db.js';
import { log } from '../models/auditLog.js';


const MAX  = parseInt(process.env.MAX_LOGIN_ATTEMPTS)   || 5;
const LOCK = parseInt(process.env.LOCK_DURATION_MINUTES) || 15;

const makeTokens = (user) => {
  const payload = { userId:user.id, role:user.role, email:user.email };
  const accessToken  = jwt.sign(payload, process.env.JWT_SECRET,
                                { expiresIn: process.env.JWT_EXPIRES_IN || '1h' });
  const refreshToken = jwt.sign({ userId:user.id, jti:uuid() },
                                process.env.JWT_REFRESH_SECRET,
                                { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
  return { accessToken, refreshToken };
};

// export const login = async (req, res) => {
//   const { email, password } = req.body;
//   const ip = req.ip; const ua = req.headers['user-agent'];
//   try {
//     const [rows] = await pool.execute(
//       `SELECT u.*,r.name AS role,r.label AS role_label,r.permissions
//        FROM users u JOIN roles r ON u.role_id=r.id
//        WHERE u.email=?`, [email.toLowerCase().trim()]
//     );
//     if (!rows.length) {
//       await log({ action:'LOGIN_FAILED_UNKNOWN', ipAddress:ip, userAgent:ua, newValue:{email} });
//       return res.status(401).json({ success:false, message:'Email ou mot de passe incorrect.' });
//     }
//     const u = rows[0];
//     if (!u.actif)
//       return res.status(403).json({ success:false,
//         message:'Compte en attente de validation par un administrateur.', pendingValidation:true });

//     if (u.locked_until && new Date(u.locked_until) > new Date()) {
//       const rem = Math.ceil((new Date(u.locked_until)-new Date())/60000);
//       return res.status(423).json({ success:false,
//         message:`Compte verrouillé. Réessayez dans ${rem} minute(s).` });
//     }

//     const ok = await bcrypt.compare(password, u.password_hash);
//     if (!ok) {
//       const att = u.failed_attempts + 1;
//       const lockUntil = att >= MAX
//         ? new Date(Date.now()+LOCK*60000).toISOString().slice(0,19).replace('T',' ') : null;
//       await pool.execute('UPDATE users SET failed_attempts=?,locked_until=? WHERE id=?',[att,lockUntil,u.id]);
//       const msg = lockUntil ? `Compte verrouillé pour ${LOCK} minutes.`
//         : `Mot de passe incorrect. ${MAX-att} tentative(s) restante(s).`;
//       return res.status(401).json({ success:false, message:msg });
//     }

//     const { accessToken, refreshToken } = makeTokens(u);
//     const exp = new Date(Date.now()+7*24*3600*1000).toISOString().slice(0,19).replace('T',' ');
//     await pool.execute('INSERT INTO refresh_tokens (user_id,token,expires_at) VALUES (?,?,?)',
//                        [u.id, refreshToken, exp]);
//     await pool.execute('UPDATE users SET failed_attempts=0,locked_until=NULL,last_login=NOW() WHERE id=?',[u.id]);
//     await log({ userId:u.id, action:'LOGIN_SUCCESS', ipAddress:ip, userAgent:ua });

//     return res.json({ success:true, message:'Connexion réussie.', data:{
//       accessToken, refreshToken,
//       user:{ id:u.id, nom:u.nom, prenom:u.prenom, email:u.email,
//              role:u.role, roleLabel:u.role_label, service:u.service,
//              permissions: JSON.parse(u.permissions||'{}') }
//     }});
//   } catch(err) {
//     console.error(err);
//     return res.status(500).json({ success:false, message:'Erreur serveur.' });
//   }
// };


export const login = async (req, res) => {
  const { email, password } = req.body;
  const ip = req.ip;
  const ua = req.headers['user-agent'];

  try {
    console.log('================ LOGIN DEBUG ================');
    console.log('DB utilisée :', process.env.DB_NAME);
    console.log('Email reçu :', email);

    const [tables] = await pool.execute('SHOW TABLES');
    console.log('Tables disponibles :', tables);

    const [rows] = await pool.execute(
      `SELECT u.*, r.name AS role, r.label AS role_label, r.permissions
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.email = ?`,
      [email.toLowerCase().trim()]
    );

    console.log('Nombre d’utilisateurs trouvés :', rows.length);

    if (!rows.length) {
      await log({
        action: 'LOGIN_FAILED_UNKNOWN',
        ipAddress: ip,
        userAgent: ua,
        newValue: { email }
      });

      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect.'
      });
    }

    const u = rows[0];

    if (!u.actif) {
      return res.status(403).json({
        success: false,
        message: 'Compte en attente de validation par un administrateur.',
        pendingValidation: true
      });
    }

    if (u.locked_until && new Date(u.locked_until) > new Date()) {
      const rem = Math.ceil(
        (new Date(u.locked_until) - new Date()) / 60000
      );

      return res.status(423).json({
        success: false,
        message: `Compte verrouillé. Réessayez dans ${rem} minute(s).`
      });
    }

    console.log('Vérification du mot de passe...');

    const ok = await bcrypt.compare(password, u.password_hash);

    console.log('Mot de passe valide :', ok);

    if (!ok) {
      const att = u.failed_attempts + 1;

      const lockUntil =
        att >= MAX
          ? new Date(Date.now() + LOCK * 60000)
              .toISOString()
              .slice(0, 19)
              .replace('T', ' ')
          : null;

      await pool.execute(
        'UPDATE users SET failed_attempts=?, locked_until=? WHERE id=?',
        [att, lockUntil, u.id]
      );

      const msg = lockUntil
        ? `Compte verrouillé pour ${LOCK} minutes.`
        : `Mot de passe incorrect. ${MAX - att} tentative(s) restante(s).`;

      return res.status(401).json({
        success: false,
        message: msg
      });
    }

    console.log('Création des tokens...');

    const { accessToken, refreshToken } = makeTokens(u);

    const exp = new Date(Date.now() + 7 * 24 * 3600 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');

    await pool.execute(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [u.id, refreshToken, exp]
    );

    await pool.execute(
      'UPDATE users SET failed_attempts=0, locked_until=NULL, last_login=NOW() WHERE id=?',
      [u.id]
    );

    await log({
      userId: u.id,
      action: 'LOGIN_SUCCESS',
      ipAddress: ip,
      userAgent: ua
    });

    console.log('Connexion réussie');

    return res.json({
      success: true,
      message: 'Connexion réussie.',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: u.id,
          nom: u.nom,
          prenom: u.prenom,
          email: u.email,
          role: u.role,
          roleLabel: u.role_label,
          service: u.service,
          permissions: JSON.parse(u.permissions || '{}')
        }
      }
    });
  } catch (err) {
    console.error('============== ERREUR LOGIN ==============');
    console.error(err);
    console.error('==========================================');

    return res.status(500).json({
      success: false,
      message: 'Erreur serveur.',
      error: err.message
    });
  }
};

export const logout = async (req, res) => {
  const { refreshToken } = req.body;
  try {
    if (refreshToken)
      await pool.execute('UPDATE refresh_tokens SET revoked=1 WHERE token=?',[refreshToken]);
    if (req.user) await log({ userId:req.user.id, action:'LOGOUT', ipAddress:req.ip });
    return res.json({ success:true, message:'Déconnexion réussie.' });
  } catch { return res.status(500).json({ success:false, message:'Erreur serveur.' }); }
};

export const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(401).json({ success:false, message:'Refresh token manquant.' });
  try {
    const [rows] = await pool.execute(
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
      process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN||'1h' }
    );
    return res.json({ success:true, data:{ accessToken } });
  } catch { return res.status(401).json({ success:false, message:'Refresh token invalide.' }); }
};

export const me = async (req, res) => res.json({ success:true, data:{
  id:req.user.id, nom:req.user.nom, prenom:req.user.prenom,
  email:req.user.email, role:req.user.role, service:req.user.service,
  permissions:req.user.permissions
}});

export const register = async (req, res) => {
  const { nom, prenom, email, password, service } = req.body;
  const ip = req.ip; const ua = req.headers['user-agent'];
  try {
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email=?', [email.toLowerCase().trim()]
    );
    if (existing.length)
      return res.status(409).json({ success:false,
        message:'Cet email est déjà utilisé.' });

    const [roles] = await pool.execute("SELECT id FROM roles WHERE name='operateur' LIMIT 1");
    if (!roles.length)
      return res.status(500).json({ success:false, message:'Configuration rôles manquante.' });

    const hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS)||12);
    const [result] = await pool.execute(
      `INSERT INTO users (nom,prenom,email,password_hash,role_id,service,actif)
       VALUES (?,?,?,?,?,?,0)`,
      [nom.trim(), prenom.trim(), email.toLowerCase().trim(), hash, roles[0].id, service?.trim()||null]
    );
    await log({ action:'USER_REGISTERED', targetTable:'users', targetId:result.insertId,
                newValue:{nom,prenom,email,service}, ipAddress:ip, userAgent:ua });

    return res.status(201).json({ success:true,
      message:'Compte créé ! Un administrateur doit valider votre accès.',
      data:{ id:result.insertId, nom, prenom, email:email.toLowerCase() }
    });
  } catch(err) {
    console.error('register error:', err);
    return res.status(500).json({ success:false, message:'Erreur serveur.' });
  }
};

export const checkEmail = async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ success:false, message:'Email requis.' });
  try {
    const [rows] = await pool.execute(
      'SELECT id FROM users WHERE email=?', [email.toLowerCase().trim()]
    );
    return res.json({ success:true, exists: rows.length > 0 });
  } catch { return res.status(500).json({ success:false, message:'Erreur serveur.' }); }
};