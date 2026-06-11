// routes/auth.js
const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { login, logout, refresh, me, register, checkEmail } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

const limiter = rateLimit({ windowMs:15*60*1000, max:10,
  message:{ success:false, message:'Trop de tentatives. Réessayez dans 15 min.' } });

const registerLimiter = rateLimit({ windowMs:60*60*1000, max:5,
  message:{ success:false, message:'Trop d\'inscriptions depuis cette IP. Réessayez dans 1h.' } });

const validate = (req,res,next) => {
  const e = validationResult(req);
  if (!e.isEmpty()) return res.status(422).json({ success:false, errors:e.array() });
  next();
};

// Connexion
router.post('/login',   limiter,
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  validate, login);

// Déconnexion
router.post('/logout',  verifyToken, logout);

// Refresh token
router.post('/refresh', refresh);

// Profil connecté
router.get('/me',       verifyToken, me);

// ── NOUVEAU : Inscription ────────────────────────────────────
router.post('/register', registerLimiter,
  [
    body('nom').notEmpty().withMessage('Nom requis.'),
    body('prenom').notEmpty().withMessage('Prénom requis.'),
    body('email').isEmail().withMessage('Email invalide.').normalizeEmail(),
    body('password')
      .isLength({ min:8 }).withMessage('8 caractères minimum.')
      .matches(/[A-Z]/).withMessage('Au moins une majuscule.')
      .matches(/[0-9]/).withMessage('Au moins un chiffre.'),
    body('service').optional().trim(),
  ],
  validate, register
);

// ── NOUVEAU : Vérifier si email existe ───────────────────────
router.get('/check-email', checkEmail);

module.exports = router;
