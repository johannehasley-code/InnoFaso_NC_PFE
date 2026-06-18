// routes/auditLogs.js
const router = require('express').Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { getAuditLogs } = require('../controllers/usersController');

router.use(verifyToken);
router.get('/', requireRole('admin'), getAuditLogs);

module.exports = router;

export const getLogs = async ({ userId, action, limit=100, offset=0 }) => {
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
  const [rows] = await pool.execute(q, p);
  return rows;
};