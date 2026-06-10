// routes/exports.js  — Sprint 8
const router = require('express').Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const C = require('../controllers/exportController');

router.use(verifyToken);

// 3.2.3 — Recherche multicritère (F11)
router.get('/nc',                    C.searchNC);

// 3.2.1 — Export PDF fiche NC individuelle (F10)
router.get('/nc/:id/pdf',            C.exportNcPDF);

// 3.2.2 — Export Excel liste NC avec filtres (F10)
router.get('/nc/excel',              requireRole('rq','admin','responsable_service'), C.exportNcExcel);

// 3.2.4 — Rapport mensuel manuel (F15)
router.get('/rapport-mensuel',       requireRole('rq','admin'), C.exportRapportMensuel);

// Statistiques tableau de bord
router.get('/stats',                 requireRole('rq','admin','direction'), C.getExportStats);

module.exports = router;
