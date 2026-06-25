import pool from '../db.js';

export const log = async ({ userId=null, action, targetTable=null, targetId=null,
  oldValue=null, newValue=null, ipAddress=null, userAgent=null }) => {
  try {
    await pool.execute(
      `INSERT INTO audit_logs (user_id,action,target_table,target_id,old_value,new_value,ip_address,user_agent)
       VALUES (?,?,?,?,?,?,?,?)`,
      [ userId, action, targetTable, targetId,
        oldValue  ? JSON.stringify(oldValue)  : null,
        newValue  ? JSON.stringify(newValue)  : null,
        ipAddress, userAgent ]
    );
  } catch (err) {
    console.error('auditLog error:', err.message);
  }
};

export const getLogs = async ({ userId, action, limit=100, offset=0 }) => {
  let q = `SELECT al.*, u.nom, u.prenom, u.email, r.name AS role
           FROM audit_logs al
           LEFT JOIN users u ON al.user_id = u.id
           LEFT JOIN roles r ON u.role_id  = r.id
           WHERE 1=1`;
  const p = [];
  if (userId) { q += ' AND al.user_id = ?'; p.push(userId); }
  if (action)  { q += ' AND al.action LIKE ?'; p.push(`%${action}%`); }

  // ✅ FIX : LIMIT/OFFSET injectés directement (sécurisés en entiers),
  // car mysql2 plante souvent avec LIMIT ?/OFFSET ? en prepared statement (erreur 500).
  const safeLimit  = Math.min(Math.max(parseInt(limit)  || 100, 1), 1000);
  const safeOffset = Math.max(parseInt(offset) || 0, 0);
  q += ` ORDER BY al.created_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;

  const [rows] = await pool.execute(q, p);
  return rows;
};