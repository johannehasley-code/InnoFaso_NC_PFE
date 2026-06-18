// // routes/users.js
// const router = require('express').Router();
// const { verifyToken, requireRole } = require('../middleware/auth');
// const C = require('../controllers/usersController');

// router.use(verifyToken);

// // ── Gestion utilisateurs actifs ──────────────────────────────
// router.get('/',                  requireRole('admin','rq'), C.getAll);
// router.get('/roles/list',        C.getRoles);
// router.get('/:id',               requireRole('admin','rq'), C.getById);
// router.post('/',                 requireRole('admin'),       C.create);
// router.put('/:id',               requireRole('admin'),       C.update);
// router.put('/:id/unlock',        requireRole('admin','rq'), C.unlock);
// router.put('/:id/password',      requireRole('admin'),       C.changePassword);

// // ── Inscriptions en attente ───────────────────────────────────
// router.get('/pending/list',      requireRole('admin','rq'), C.getPending);
// router.put('/:id/activate',      requireRole('admin','rq'), C.activate);
// router.delete('/:id/reject',     requireRole('admin'),       C.reject);

// module.exports = router;


import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { getAll, getPending, getById, create, update,
         unlock, changePassword, activate, reject, getRoles, getAuditLogs }
  from '../controllers/usersController.js';

const router = Router();
router.use(verifyToken);

router.get('/',             requireRole('admin','rq'), getAll);
router.get('/roles/list',   getRoles);
router.get('/pending/list', requireRole('admin','rq'), getPending);
router.get('/audit-logs',   requireRole('admin','rq'), getAuditLogs);
router.get('/:id',          requireRole('admin','rq'), getById);
router.post('/',            requireRole('admin'),       create);
router.put('/:id',          requireRole('admin'),       update);
router.put('/:id/unlock',   requireRole('admin','rq'), unlock);
router.put('/:id/password', requireRole('admin'),       changePassword);
router.put('/:id/activate', requireRole('admin','rq'), activate);
router.delete('/:id/reject',requireRole('admin'),       reject);

export default router;