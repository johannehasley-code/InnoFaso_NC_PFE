// // controllers/usersController.js
// const bcrypt = require('bcryptjs');
// const db     = require('../config/db');
// const { log } = require('../models/auditLog');

// // GET /api/users
// const getAll = async (req, res) => {
//   try {
//     const [rows] = await db.execute(
//       `SELECT u.id,u.nom,u.prenom,u.email,u.service,u.actif,
//               u.failed_attempts,u.locked_until,u.last_login,u.created_at,
//               r.name AS role, r.label AS role_label
//        FROM users u JOIN roles r ON u.role_id=r.id
//        WHERE u.actif=1
//        ORDER BY u.created_at DESC`
//     );
//     res.json({ success:true, data:rows });
//   } catch { res.status(500).json({ success:false, message:'Erreur serveur.' }); }
// };

// // GET /api/users/pending — inscriptions en attente (actif=0)
// const getPending = async (req, res) => {
//   try {
//     const [rows] = await db.execute(
//       `SELECT u.id,u.nom,u.prenom,u.email,u.service,u.created_at AS date_inscription,
//               r.label AS role_label
//        FROM users u JOIN roles r ON u.role_id=r.id
//        WHERE u.actif=0
//        ORDER BY u.created_at DESC`
//     );
//     res.json({ success:true, data:rows });
//   } catch { res.status(500).json({ success:false, message:'Erreur serveur.' }); }
// };

// // GET /api/users/:id
// const getById = async (req, res) => {
//   try {
//     const [rows] = await db.execute(
//       `SELECT u.id,u.nom,u.prenom,u.email,u.service,u.actif,
//               r.id AS role_id, r.name AS role, r.label AS role_label, r.permissions
//        FROM users u JOIN roles r ON u.role_id=r.id WHERE u.id=?`, [req.params.id]
//     );
//     if (!rows.length) return res.status(404).json({ success:false, message:'Introuvable.' });
//     res.json({ success:true, data:rows[0] });
//   } catch { res.status(500).json({ success:false, message:'Erreur serveur.' }); }
// };

// // POST /api/users
// const create = async (req, res) => {
//   const { nom,prenom,email,password,roleId,service } = req.body;
//   try {
//     const [ex] = await db.execute('SELECT id FROM users WHERE email=?',[email.toLowerCase()]);
//     if (ex.length) return res.status(409).json({ success:false, message:'Email déjà utilisé.' });
//     const hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS)||12);
//     const [r] = await db.execute(
//       'INSERT INTO users (nom,prenom,email,password_hash,role_id,service,actif) VALUES (?,?,?,?,?,?,1)',
//       [nom,prenom,email.toLowerCase(),hash,roleId,service]
//     );
//     await log({ userId:req.user.id, action:'CREATE_USER', targetTable:'users',
//                 targetId:r.insertId, newValue:{nom,prenom,email,roleId,service}, ipAddress:req.ip });
//     res.status(201).json({ success:true, message:'Utilisateur créé.', data:{ id:r.insertId } });
//   } catch(err) {
//     console.error(err);
//     res.status(500).json({ success:false, message:'Erreur serveur.' });
//   }
// };

// // PUT /api/users/:id
// const update = async (req, res) => {
//   const { nom,prenom,email,roleId,service,actif } = req.body;
//   try {
//     const [old] = await db.execute('SELECT * FROM users WHERE id=?',[req.params.id]);
//     if (!old.length) return res.status(404).json({ success:false, message:'Introuvable.' });
//     await db.execute(
//       'UPDATE users SET nom=?,prenom=?,email=?,role_id=?,service=?,actif=? WHERE id=?',
//       [nom,prenom,email,roleId,service,actif,req.params.id]
//     );
//     await log({ userId:req.user.id, action:'UPDATE_USER', targetTable:'users',
//                 targetId:parseInt(req.params.id), oldValue:old[0],
//                 newValue:{nom,prenom,email,roleId,service,actif}, ipAddress:req.ip });
//     res.json({ success:true, message:'Mis à jour.' });
//   } catch { res.status(500).json({ success:false, message:'Erreur serveur.' }); }
// };

// // PUT /api/users/:id/unlock
// const unlock = async (req, res) => {
//   try {
//     await db.execute('UPDATE users SET failed_attempts=0,locked_until=NULL WHERE id=?',[req.params.id]);
//     await log({ userId:req.user.id, action:'UNLOCK_USER', targetTable:'users',
//                 targetId:parseInt(req.params.id), ipAddress:req.ip });
//     res.json({ success:true, message:'Compte déverrouillé.' });
//   } catch { res.status(500).json({ success:false, message:'Erreur serveur.' }); }
// };

// // PUT /api/users/:id/password
// const changePassword = async (req, res) => {
//   const { password } = req.body;
//   try {
//     const hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS)||12);
//     await db.execute('UPDATE users SET password_hash=? WHERE id=?',[hash,req.params.id]);
//     await log({ userId:req.user.id, action:'CHANGE_PASSWORD', targetTable:'users',
//                 targetId:parseInt(req.params.id), ipAddress:req.ip });
//     res.json({ success:true, message:'Mot de passe modifié.' });
//   } catch { res.status(500).json({ success:false, message:'Erreur serveur.' }); }
// };

// // PUT /api/users/:id/activate — activer un compte + assigner rôle
// const activate = async (req, res) => {
//   const { roleId } = req.body;
//   try {
//     const [rows] = await db.execute('SELECT id,nom,prenom,email FROM users WHERE id=? AND actif=0',[req.params.id]);
//     if (!rows.length)
//       return res.status(404).json({ success:false, message:'Utilisateur introuvable ou déjà actif.' });
//     await db.execute('UPDATE users SET actif=1, role_id=? WHERE id=?',[roleId, req.params.id]);
//     await log({ userId:req.user.id, action:'ACTIVATE_USER', targetTable:'users',
//                 targetId:parseInt(req.params.id), newValue:{ roleId, activated_user: rows[0].email },
//                 ipAddress:req.ip });
//     res.json({ success:true, message:`Compte de ${rows[0].prenom} ${rows[0].nom} activé.` });
//   } catch { res.status(500).json({ success:false, message:'Erreur serveur.' }); }
// };

// // DELETE /api/users/:id/reject — rejeter une inscription
// const reject = async (req, res) => {
//   try {
//     const [rows] = await db.execute('SELECT email FROM users WHERE id=? AND actif=0',[req.params.id]);
//     if (!rows.length)
//       return res.status(404).json({ success:false, message:'Utilisateur introuvable ou déjà actif.' });
//     await db.execute('DELETE FROM users WHERE id=? AND actif=0',[req.params.id]);
//     await log({ userId:req.user.id, action:'REJECT_USER', targetTable:'users',
//                 targetId:parseInt(req.params.id), newValue:{ rejected_email: rows[0].email },
//                 ipAddress:req.ip });
//     res.json({ success:true, message:'Inscription rejetée.' });
//   } catch { res.status(500).json({ success:false, message:'Erreur serveur.' }); }
// };

// // GET /api/roles
// const getRoles = async (req, res) => {
//   try {
//     const [rows] = await db.execute('SELECT id,name,label FROM roles ORDER BY id');
//     res.json({ success:true, data:rows });
//   } catch { res.status(500).json({ success:false, message:'Erreur serveur.' }); }
// };

// // GET /api/audit-logs
// const getAuditLogs = async (req, res) => {
//   try {
//     const { getLogs } = require('../models/auditLog');
//     const logs = await getLogs(req.query);
//     res.json({ success:true, data:logs });
//   } catch { res.status(500).json({ success:false, message:'Erreur serveur.' }); }
// };

// module.exports = {
//   getAll, getPending, getById, create, update, unlock,
//   changePassword, activate, reject, getRoles, getAuditLogs
// };


import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { log } from '../models/auditLog.js';

export const getAll = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.id,u.nom,u.prenom,u.email,u.service,u.actif,
              u.failed_attempts,u.locked_until,u.last_login,u.created_at,
              r.name AS role, r.label AS role_label
       FROM users u JOIN roles r ON u.role_id=r.id
       WHERE u.actif=1 ORDER BY u.created_at DESC`
    );
    res.json({ success:true, data:rows });
  } catch { res.status(500).json({ success:false, message:'Erreur serveur.' }); }
};

export const getPending = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.id,u.nom,u.prenom,u.email,u.service,u.created_at AS date_inscription,
              r.label AS role_label
       FROM users u JOIN roles r ON u.role_id=r.id
       WHERE u.actif=0 ORDER BY u.created_at DESC`
    );
    res.json({ success:true, data:rows });
  } catch { res.status(500).json({ success:false, message:'Erreur serveur.' }); }
};

export const getById = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.id,u.nom,u.prenom,u.email,u.service,u.actif,
              r.id AS role_id, r.name AS role, r.label AS role_label, r.permissions
       FROM users u JOIN roles r ON u.role_id=r.id WHERE u.id=?`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success:false, message:'Introuvable.' });
    res.json({ success:true, data:rows[0] });
  } catch { res.status(500).json({ success:false, message:'Erreur serveur.' }); }
};

export const create = async (req, res) => {
  const { nom,prenom,email,password,roleId,service } = req.body;
  try {
    const [ex] = await pool.execute('SELECT id FROM users WHERE email=?',[email.toLowerCase()]);
    if (ex.length) return res.status(409).json({ success:false, message:'Email déjà utilisé.' });
    const hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS)||12);
    const [r] = await pool.execute(
      'INSERT INTO users (nom,prenom,email,password_hash,role_id,service,actif) VALUES (?,?,?,?,?,?,1)',
      [nom,prenom,email.toLowerCase(),hash,roleId,service]
    );
    await log({ userId:req.user.id, action:'CREATE_USER', targetTable:'users',
                targetId:r.insertId, newValue:{nom,prenom,email,roleId,service}, ipAddress:req.ip });
    res.status(201).json({ success:true, message:'Utilisateur créé.', data:{ id:r.insertId } });
  } catch(err) {
    console.error(err);
    res.status(500).json({ success:false, message:'Erreur serveur.' });
  }
};

export const update = async (req, res) => {
  const { nom,prenom,email,roleId,service,actif } = req.body;
  try {
    const [old] = await pool.execute('SELECT * FROM users WHERE id=?',[req.params.id]);
    if (!old.length) return res.status(404).json({ success:false, message:'Introuvable.' });
    await pool.execute(
      'UPDATE users SET nom=?,prenom=?,email=?,role_id=?,service=?,actif=? WHERE id=?',
      [nom,prenom,email,roleId,service,actif,req.params.id]
    );
    await log({ userId:req.user.id, action:'UPDATE_USER', targetTable:'users',
                targetId:parseInt(req.params.id), oldValue:old[0],
                newValue:{nom,prenom,email,roleId,service,actif}, ipAddress:req.ip });
    res.json({ success:true, message:'Mis à jour.' });
  } catch { res.status(500).json({ success:false, message:'Erreur serveur.' }); }
};

export const unlock = async (req, res) => {
  try {
    await pool.execute('UPDATE users SET failed_attempts=0,locked_until=NULL WHERE id=?',[req.params.id]);
    await log({ userId:req.user.id, action:'UNLOCK_USER', targetTable:'users',
                targetId:parseInt(req.params.id), ipAddress:req.ip });
    res.json({ success:true, message:'Compte déverrouillé.' });
  } catch { res.status(500).json({ success:false, message:'Erreur serveur.' }); }
};

export const changePassword = async (req, res) => {
  const { password } = req.body;
  try {
    const hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS)||12);
    await pool.execute('UPDATE users SET password_hash=? WHERE id=?',[hash,req.params.id]);
    await log({ userId:req.user.id, action:'CHANGE_PASSWORD', targetTable:'users',
                targetId:parseInt(req.params.id), ipAddress:req.ip });
    res.json({ success:true, message:'Mot de passe modifié.' });
  } catch { res.status(500).json({ success:false, message:'Erreur serveur.' }); }
};

export const activate = async (req, res) => {
  const { roleId } = req.body;
  try {
    const [rows] = await pool.execute(
      'SELECT id,nom,prenom,email FROM users WHERE id=? AND actif=0',[req.params.id]
    );
    if (!rows.length)
      return res.status(404).json({ success:false, message:'Utilisateur introuvable ou déjà actif.' });
    await pool.execute('UPDATE users SET actif=1, role_id=? WHERE id=?',[roleId, req.params.id]);
    await log({ userId:req.user.id, action:'ACTIVATE_USER', targetTable:'users',
                targetId:parseInt(req.params.id),
                newValue:{ roleId, activated_user: rows[0].email }, ipAddress:req.ip });
    res.json({ success:true, message:`Compte de ${rows[0].prenom} ${rows[0].nom} activé.` });
  } catch { res.status(500).json({ success:false, message:'Erreur serveur.' }); }
};

export const reject = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT email FROM users WHERE id=? AND actif=0',[req.params.id]
    );
    if (!rows.length)
      return res.status(404).json({ success:false, message:'Utilisateur introuvable ou déjà actif.' });
    await pool.execute('DELETE FROM users WHERE id=? AND actif=0',[req.params.id]);
    await log({ userId:req.user.id, action:'REJECT_USER', targetTable:'users',
                targetId:parseInt(req.params.id),
                newValue:{ rejected_email: rows[0].email }, ipAddress:req.ip });
    res.json({ success:true, message:'Inscription rejetée.' });
  } catch { res.status(500).json({ success:false, message:'Erreur serveur.' }); }
};

export const getRoles = async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id,name,label FROM roles ORDER BY id');
    res.json({ success:true, data:rows });
  } catch { res.status(500).json({ success:false, message:'Erreur serveur.' }); }
};

export const getAuditLogs = async (req, res) => {
  try {
    const { getLogs } = await import('../models/auditLog.js');
    const logs = await getLogs(req.query);
    res.json({ success:true, data:logs });
  } catch { res.status(500).json({ success:false, message:'Erreur serveur.' }); }
};