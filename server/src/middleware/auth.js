import jwt from 'jsonwebtoken';
import pool from '../db.js';

export const verifyToken = async (req, res, next) => {
  try {
    const header = req.headers['authorization'];
    const token  = header && header.split(' ')[1];
    if (!token) return res.status(401).json({ success:false, message:'Token manquant.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [rows]  = await pool.execute(
      `SELECT u.id,u.nom,u.prenom,u.email,u.actif,r.name AS role,r.permissions
       FROM users u JOIN roles r ON u.role_id=r.id WHERE u.id=?`,
      [decoded.userId]
    );
    if (!rows.length || !rows[0].actif)
      return res.status(401).json({ success:false, message:'Utilisateur introuvable ou désactivé.' });

    req.user = { ...rows[0], permissions: JSON.parse(rows[0].permissions||'{}') };
    next();
  } catch (err) {
    const msg = err.name==='TokenExpiredError' ? 'Token expiré.' : 'Token invalide.';
    return res.status(401).json({ success:false, message:msg });
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success:false, message:'Non authentifié.' });
  if (!roles.includes(req.user.role))
    return res.status(403).json({ success:false, message:`Rôle requis : ${roles.join(' ou ')}.` });
  next();
};

export const requirePermission = (perm) => (req, res, next) => {
  const p = req.user?.permissions || {};
  if (!p.all && !p[perm])
    return res.status(403).json({ success:false, message:`Permission requise : ${perm}.` });
  next();
};