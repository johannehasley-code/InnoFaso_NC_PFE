// routes/users.js
const router = require('express').Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const C = require('../controllers/usersController');

router.use(verifyToken);

// ── Gestion utilisateurs actifs ──────────────────────────────
router.get('/',                  requireRole('admin','rq'), C.getAll);
router.get('/roles/list',        C.getRoles);
router.get('/:id',               requireRole('admin','rq'), C.getById);
router.post('/',                 requireRole('admin'),       C.create);
router.put('/:id',               requireRole('admin'),       C.update);
router.put('/:id/unlock',        requireRole('admin','rq'), C.unlock);
router.put('/:id/password',      requireRole('admin'),       C.changePassword);

// ── Inscriptions en attente ───────────────────────────────────
router.get('/pending/list',      requireRole('admin','rq'), C.getPending);
router.put('/:id/activate',      requireRole('admin','rq'), C.activate);
router.delete('/:id/reject',     requireRole('admin'),       C.reject);

module.exports = router;
