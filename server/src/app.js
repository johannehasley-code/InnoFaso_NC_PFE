import express from 'express';
import { Orchestrateur } from './orchestrateur.js';
import { creerStore } from './store.js';
import { creerSmsProvider } from './services/sms.js';
import { listeServices } from './services/organisation.js';
import { traiterRappels } from './services/rappels.js';
import { WorkflowError } from './workflow.js';
import authRouter from './routes/auth.js';
import { verifyToken } from './middleware/auth.js';
import usersRouter from './routes/users.js';
import exportsRouter from './routes/exports.js';

export async function creerApp(deps = {}) {
  const store = deps.store || (await creerStore());
  const sms = deps.sms || creerSmsProvider();
  const rappelsEnvoyes = deps.rappelsEnvoyes || new Set();
  const journalRappels = deps.journalRappels || [];
  const orch = new Orchestrateur({ store, sms, rappelsEnvoyes, journalRappels });

  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/exports', exportsRouter);

  app.get('/api/audit-logs', verifyToken, h(async (req, res) => {
    const { getLogs } = await import('./models/auditLog.js');
    const logs = await getLogs(req.query);
    res.json({ success: true, data: logs });
  }));

  app.get('/api/services', (req, res) => res.json(listeServices()));

  app.get('/api/nc', verifyToken, h(async (req, res) => {
    const ncs = await store.listerNcs();
    res.json(ncs.map((n) => orch.infos(n)));
  }));

  app.get('/api/nc/:id', verifyToken, h(async (req, res) => {
    const nc = await store.trouverNc(req.params.id);
    if (!nc) return res.status(404).json({ erreur: 'NC introuvable' });
    res.json(orch.infos(nc));
  }));

  app.post('/api/nc', verifyToken, h(async (req, res) => {
    const nc = await orch.creerNc(req.body || {}, { par: req.user?.email || 'émetteur' });
    res.status(201).json(orch.infos(nc));
  }));

  app.patch('/api/nc/:id', verifyToken, h(async (req, res) => {
    const nc = await orch.majNc(req.params.id, req.body || {});
    res.json(orch.infos(nc));
  }));

  app.post('/api/nc/:id/soumettre', verifyToken, h(async (req, res) => {
    const r = await orch.soumettre(req.params.id, { par: req.user?.email || 'émetteur' });
    res.json({
      nc: orch.infos(r.nc),
      assignation: r.assignation,
      alerte: { declenchee: r.alerte.declenchee, delaiMs: r.alerte.delaiMs, seuilMs: r.alerte.seuilMs },
    });
  }));

  app.post('/api/nc/:id/transition', verifyToken, h(async (req, res) => {
    const { action } = req.body || {};
    const r = await orch.transition(req.params.id, action, { par: req.user?.email || 'utilisateur' });
    res.json(orch.infos(r.nc));
  }));

  app.get('/api/sms', verifyToken, (req, res) => res.json(sms.outbox || []));
  app.get('/api/rappels', verifyToken, (req, res) => res.json(journalRappels));

  app.post('/api/rappels/executer', verifyToken, h(async (req, res) => {
    const maintenant = req.body?.date ? new Date(req.body.date) : new Date();
    const ncs = await store.listerNcs();
    const journal = await traiterRappels({ ncs, sms, maintenant, rappelsEnvoyes });
    journal.forEach((j) => journalRappels.push(j));
    res.json({ declenches: journal.length, journal });
  }));

  app.post('/api/nc/:id/transferer', verifyToken, h(async (req, res) => {
    const nc = await store.trouverNc(req.params.id);
    if (!nc) return res.status(404).json({ erreur: 'NC introuvable' });
    const { destinataire, copies = [], message = '' } = req.body || {};
    if (!destinataire) return res.status(400).json({ erreur: 'Destinataire principal requis' });

    const lienApplication = process.env.APP_URL || 'http://localhost:5173';
    const corps = `INNOFASO QUALITE — Transfert de la fiche ${nc.numero}\nIntitulé : ${nc.intitule || 'Contrôle'}\n\nConsulter la fiche : ${lienApplication}\n\n${message}`;
    const tousDestinataires = [destinataire, ...copies.filter(Boolean)];
    const envois = await Promise.all(
      tousDestinataires.map((mail) =>
        sms.send({ to: mail, body: corps, meta: { ncId: nc.numero, motif: 'transfert_fiche', nom: mail } })
          .catch((e) => ({ erreur: e.message, to: mail })),
      ),
    );
    res.json({ envoyes: envois.length, envois });
  }));

  app.use((err, req, res, next) => {
    if (err instanceof WorkflowError)
      return res.status(err.status || 409).json({ erreur: err.message, code: err.code });
    console.error(err);
    res.status(500).json({ erreur: 'Erreur interne', detail: String(err.message || err) });
  });

  return { app, orch, store, sms, rappelsEnvoyes, journalRappels };
}