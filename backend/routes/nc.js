// routes/nc.js
const router = require('express').Router();
const { verifyToken, requireRole, requirePermission } = require('../middleware/auth');
const C = require('../controllers/ncController');

router.use(verifyToken);
router.get('/stats', requireRole('rq','direction','admin'), C.getStats);
router.get('/',      requirePermission('view_own_nc'),      C.getAll);
router.get('/:id',   requirePermission('view_own_nc'),      C.getById);
router.post('/',     requirePermission('create_nc'),        C.create);
router.put('/:id/statut', requirePermission('update_nc'),  C.updateStatut);

module.exports = router;
