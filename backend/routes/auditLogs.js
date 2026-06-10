// routes/auditLogs.js
const router = require('express').Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { getAuditLogs } = require('../controllers/usersController');

router.use(verifyToken);
router.get('/', requireRole('admin'), getAuditLogs);

module.exports = router;
