// server.js
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const cron = require('node-cron');
const { lancerRapportAutomatique } = require('./controllers/exportController');


const app = express();

// ── Sécurité ─────────────────────────────────────────────────
app.use(helmet());
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'https://localhost:3000',
  'http://127.0.0.1:3000',
  'https://127.0.0.1:3000',
].filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  credentials: true,
  optionsSuccessStatus: 200,
}));
app.use(express.json({ limit:'10mb' }));
app.use(express.urlencoded({ extended:true }));
app.use(morgan('dev'));
app.use('/api/exports', require('./routes/exports'));
app.set('trust proxy', 1);

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/users',       require('./routes/users'));
app.use('/api/nc',          require('./routes/nc'));
app.use('/api/audit-logs',  require('./routes/auditLogs'));
app.use('/api/exports', require('./routes/exports'));

// ── Health ───────────────────────────────────────────────────
app.get('/api/health', (req,res) =>
  res.json({ status:'OK', app:'Innofaso API', time: new Date().toISOString() })
);

// ── 404 ──────────────────────────────────────────────────────
app.use((req,res) =>
  res.status(404).json({ success:false, message:`Route ${req.method} ${req.path} inconnue.` })
);

// ── Erreurs ──────────────────────────────────────────────────
app.use((err,req,res,next) => {
  console.error('❌', err.stack);
  res.status(500).json({ success:false, message:'Erreur interne.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Innofaso API → http://localhost:${PORT}`);
  console.log(`   Environnement : ${process.env.NODE_ENV}`);
  console.log(`   MySQL DB : ${process.env.DB_NAME}`);
});
cron.schedule('0 8 5 * *', () => lancerRapportAutomatique(),
  { timezone: 'Africa/Ouagadougou' });
module.exports = app;
