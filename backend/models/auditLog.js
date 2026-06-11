// models/auditLog.js
const db = require('../config/db');

const log = async ({ userId=null, action, targetTable=null, targetId=null,
                     oldValue=null, newValue=null, ipAddress=null, userAgent=null }) => {
  try {
    await db.execute(
      `INSERT INTO audit_logs (user_id,action,target_table,target_id,old_value,new_value,ip_address,user_agent)
       VALUES (?,?,?,?,?,?,?,?)`,
      [ userId, action, targetTable, targetId,
        oldValue  ? JSON.stringify(oldValue)  : null,
        newValue  ? JSON.stringify(newValue)  : null,
        ipAddress, userAgent ]
    );
  } catch (err) {
    console.error('⚠️  auditLog error:', err.message);
  }
};

const getLogs = async ({ userId, action, limit=100, offset=0 }) => {
  let q = `SELECT al.*, u.nom, u.prenom, u.email, r.name AS role
           FROM audit_logs al
           LEFT JOIN users u ON al.user_id = u.id
           LEFT JOIN roles r ON u.role_id  = r.id
           WHERE 1=1`;
  const p = [];
  if (userId) { q += ' AND al.user_id = ?'; p.push(userId); }
  if (action)  { q += ' AND al.action LIKE ?'; p.push(`%${action}%`); }
  q += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
  p.push(parseInt(limit), parseInt(offset));
  const [rows] = await db.execute(q, p);
  return rows;
};

module.exports = { log, getLogs };
