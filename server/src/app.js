// ============================================================================
//  app.js — API HTTP (Express) au-dessus de l'orchestrateur.
//  Factory `creerApp` (asynchrone) pour faciliter les tests et l'init MySQL.
// ============================================================================

import express from 'express';
import { Orchestrateur } from './orchestrateur.js';
import { creerStore } from './store.js';
import { creerSmsProvider } from './services/sms.js';
import { listeServices } from './services/organisation.js';
import { traiterRappels } from './services/rappels.js';
import { WorkflowError } from './workflow.js';

export async function creerApp(deps = {}) {
  // Le store est résolu via la factory : MySQL en prod, mémoire en test.
  const store = deps.store || (await creerStore());
  const sms = deps.sms || creerSmsProvider();
  const rappelsEnvoyes = deps.rappelsEnvoyes || new Set();
  const journalRappels = deps.journalRappels || [];
  const orch = new Orchestrateur({ store, sms, rappelsEnvoyes, journalRappels });

  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // CORS simple (front Vite en dev sur un autre port).
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // Enveloppe les handlers async pour router les erreurs vers le middleware.
  const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

  app.get('/api/services', (req, res) => res.json(listeServices()));

  app.get('/api/nc', h(async (req, res) => {
    const ncs = await store.listerNcs();
    res.json(ncs.map((n) => orch.infos(n)));
  }));

  app.get('/api/nc/:id', h(async (req, res) => {
    const nc = await store.trouverNc(req.params.id);
    if (!nc) return res.status(404).json({ erreur: 'NC introuvable' });
    res.json(orch.infos(nc));
  }));

  app.post('/api/nc', h(async (req, res) => {
    const nc = await orch.creerNc(req.body || {}, { par: req.body?.par || 'émetteur' });
    res.status(201).json(orch.infos(nc));
  }));

  app.patch('/api/nc/:id', h(async (req, res) => {
    const nc = await orch.majNc(req.params.id, req.body || {});
    res.json(orch.infos(nc));
  }));

  app.post('/api/nc/:id/soumettre', h(async (req, res) => {
    const r = await orch.soumettre(req.params.id, { par: req.body?.par || 'émetteur' });
    res.json({
      nc: orch.infos(r.nc),
      assignation: r.assignation,
      alerte: { declenchee: r.alerte.declenchee, delaiMs: r.alerte.delaiMs, seuilMs: r.alerte.seuilMs },
    });
  }));

  app.post('/api/nc/:id/transition', h(async (req, res) => {
    const { action } = req.body || {};
    const r = await orch.transition(req.params.id, action, { par: req.body?.par || 'utilisateur' });
    res.json(orch.infos(r.nc));
  }));

  // Outbox SMS (consultable depuis le tableau de bord).
  app.get('/api/sms', (req, res) => res.json(sms.outbox || []));

  // Journal des rappels CAPA déclenchés.
  app.get('/api/rappels', (req, res) => res.json(journalRappels));

  // Endpoint de démo : force un passage du moteur de rappels à une date donnée.
  // (?date=ISO pour simuler le temps qui passe, sinon "maintenant").
  app.post('/api/rappels/executer', h(async (req, res) => {
    const maintenant = req.body?.date ? new Date(req.body.date) : new Date();
    const ncs = await store.listerNcs();
    const journal = await traiterRappels({ ncs, sms, maintenant, rappelsEnvoyes });
    journal.forEach((j) => journalRappels.push(j));
    res.json({ declenches: journal.length, journal });
  }));

  // Gestion d'erreurs métier vs technique.
  app.use((err, req, res, next) => {
    if (err instanceof WorkflowError) {
      return res.status(err.status || 409).json({ erreur: err.message, code: err.code });
    }
    console.error(err);
    res.status(500).json({ erreur: 'Erreur interne', detail: String(err.message || err) });
  });

  return { app, orch, store, sms, rappelsEnvoyes, journalRappels };
}
