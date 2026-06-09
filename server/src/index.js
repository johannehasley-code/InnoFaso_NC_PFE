// ============================================================================
//  index.js — Démarrage du serveur Innofaso NC
// ============================================================================

import 'dotenv/config';
import { creerApp } from './app.js';
import { demarrerPlanificateur } from './services/rappels.js';

const PORT = process.env.PORT || 4000;

// creerApp est asynchrone : elle initialise le store (connexion MySQL incluse).
const { app, store, sms, rappelsEnvoyes, journalRappels } = await creerApp();

// Planificateur de rappels CAPA J-3 : 1 passage par jour en production.
// En démo, on peut accélérer via DEMO_INTERVAL_MS (ex. 60000 = chaque minute).
const intervalleMs = process.env.DEMO_INTERVAL_MS
  ? Number(process.env.DEMO_INTERVAL_MS)
  : 24 * 60 * 60 * 1000;

const planificateur = demarrerPlanificateur({
  getNcs: () => store.listerNcs(), // renvoie une Promesse, gérée par le planificateur
  sms,
  rappelsEnvoyes,
  journalGlobal: journalRappels,
  intervalleMs,
});

const driver = (process.env.DB_DRIVER || 'memoire').toLowerCase() === 'mysql' ? 'MySQL' : 'mémoire';

const serveur = app.listen(PORT, () => {
  console.log(`✓ API Innofaso NC sur http://localhost:${PORT}`);
  console.log(`  Base de données : ${driver}`);
  console.log(`  Planificateur rappels CAPA : 1 passage / ${Math.round(intervalleMs / 1000)} s`);
});

process.on('SIGINT', async () => {
  planificateur.stop();
  await store.fermer();
  serveur.close(() => process.exit(0));
});
