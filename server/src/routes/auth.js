import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import { login, logout, refresh, me, register, checkEmail } from '../controllers/authController.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

const limiter = rateLimit({ windowMs:15*60*1000, max:10,
  message:{ success:false, message:'Trop de tentatives. Réessayez dans 15 min.' } });

const registerLimiter = rateLimit({ windowMs:60*60*1000, max:5,
  message:{ success:false, message:'Trop d\'inscriptions. Réessayez dans 1h.' } });

const validate = (req,res,next) => {
  const e = validationResult(req);
  if (!e.isEmpty()) return res.status(422).json({ success:false, errors:e.array() });
  next();
};

router.post('/login', limiter,
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  validate, login);

router.post('/logout',  verifyToken, logout);
router.post('/refresh', refresh);
router.get('/me',       verifyToken, me);

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
  validate, register);

router.get('/check-email', checkEmail);

export default router;