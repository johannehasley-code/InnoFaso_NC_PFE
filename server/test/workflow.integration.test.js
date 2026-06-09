// ============================================================================
//  workflow.integration.test.js
//  Tests d'intégration du cycle de vie complet d'une NC, de l'assignation
//  automatique, de l'alerte critique chronométrée et des rappels CAPA.
//  Exécution : npm test (node:test, sans dépendance externe).
// ============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Orchestrateur } from '../src/orchestrateur.js';
import { Store } from '../src/store.js';
import { MockSmsProvider } from '../src/services/sms.js';
import { SEUIL_ALERTE_CRITIQUE_MS } from '../src/services/notifications.js';
import { traiterRappels, rappelsADeclencher } from '../src/services/rappels.js';
import { piloteDuService, RQ, DG } from '../src/services/organisation.js';
import { WorkflowError } from '../src/workflow.js';

function nouvelEnv() {
  process.env.NODE_ENV = 'test';
  const store = new Store();
  const sms = new MockSmsProvider();
  const rappelsEnvoyes = new Set();
  const orch = new Orchestrateur({ store, sms, rappelsEnvoyes });
  return { store, sms, rappelsEnvoyes, orch };
}

function dansNjours(n) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// --- 1. Transitions fonctionnelles et tracées + verrouillage post-clôture ----
test('cycle de vie complet brouillon -> ouverte -> en_cours -> cloturee, tracé', async () => {
  const { orch } = nouvelEnv();
  let nc = await orch.creerNc({
    emetteur: 'SEGDA Saadia', service: 'production', intitule: 'Défaut de couture lot 42',
  });
  assert.equal(nc.statut, 'brouillon');

  ({ nc } = await orch.soumettre(nc.id));
  assert.equal(nc.statut, 'ouverte');

  ({ nc } = await orch.transition(nc.id, 'prendre_en_charge'));
  assert.equal(nc.statut, 'en_cours');

  // On renseigne la vérification d'efficacité (garde-fou de clôture).
  await orch.majNc(nc.id, { cloture: { efficacite: 'Efficace', preuves: 'PV de contrôle' } });
  ({ nc } = await orch.transition(nc.id, 'cloturer'));
  assert.equal(nc.statut, 'cloturee');

  // L'historique trace chaque transition dans l'ordre.
  const actions = nc.historique.map((h) => h.action);
  assert.deepEqual(actions, ['creation', 'soumettre', 'prendre_en_charge', 'cloturer']);
  assert.ok(nc.clotureeLe, 'date de clôture renseignée');
});

test('verrouillage post-clôture : transitions et édition refusées', async () => {
  const { orch } = nouvelEnv();
  let nc = await orch.creerNc({ emetteur: 'X', service: 'qualite', intitule: 'Test' });
  ({ nc } = await orch.soumettre(nc.id));
  ({ nc } = await orch.transition(nc.id, 'prendre_en_charge'));
  await orch.majNc(nc.id, { cloture: { efficacite: 'Efficace' } });
  ({ nc } = await orch.transition(nc.id, 'cloturer'));

  await assert.rejects(() => orch.transition(nc.id, 'prendre_en_charge'), WorkflowError);
  await assert.rejects(() => orch.majNc(nc.id, { intitule: 'modif interdite' }), /verrouill/i);
});

test('transition illégale refusée (sauter une étape)', async () => {
  const { orch } = nouvelEnv();
  const nc = await orch.creerNc({ emetteur: 'X', service: 'qualite', intitule: 'Test' });
  // brouillon -> cloturer interdit
  await assert.rejects(() => orch.transition(nc.id, 'cloturer'), WorkflowError);
});

test('garde-fou de soumission : champs obligatoires', async () => {
  const { orch } = nouvelEnv();
  const nc = await orch.creerNc({ intitule: 'sans service ni émetteur' });
  await assert.rejects(() => orch.soumettre(nc.id), WorkflowError);
});

// --- 2. Assignation automatique au pilote + notification ---------------------
test('soumission -> assignation auto au pilote du service + notification SMS', async () => {
  const { orch, sms } = nouvelEnv();
  let nc = await orch.creerNc({ emetteur: 'BAKO Hakira', service: 'logistique', intitule: 'Colis manquant' });
  ({ nc } = await orch.soumettre(nc.id));

  const pilote = piloteDuService('logistique');
  assert.equal(nc.assigneA.tel, pilote.tel, 'NC assignée au pilote logistique');

  const notif = sms.outbox.find((m) => m.meta.motif === 'assignation_pilote');
  assert.ok(notif, 'le pilote a reçu un SMS de notification');
  assert.equal(notif.to, pilote.tel);
});

// --- 3. Alerte SMS critique au RQ + DG en < 30 s -----------------------------
test('NC critique -> SMS au RQ et au DG, émis en moins de 30 s', async () => {
  const { orch, sms } = nouvelEnv();
  let nc = await orch.creerNc({
    emetteur: 'YAMBOGO Brice', service: 'production',
    intitule: 'Contamination produit', criticite: 'critique',
  });
  let alerte;
  ({ nc, alerte } = await orch.soumettre(nc.id));

  assert.equal(alerte.declenchee, true);
  assert.ok(alerte.delaiMs < SEUIL_ALERTE_CRITIQUE_MS, `délai ${alerte.delaiMs}ms < 30000ms`);

  const tels = sms.outbox.filter((m) => m.meta.motif === 'alerte_critique').map((m) => m.to);
  assert.ok(tels.includes(RQ.tel), 'RQ alerté');
  assert.ok(tels.includes(DG.tel), 'DG alerté');
});

test('NC non critique -> aucune alerte RQ/DG', async () => {
  const { orch, sms } = nouvelEnv();
  let nc = await orch.creerNc({ emetteur: 'X', service: 'production', intitule: 'Mineure', criticite: 'faible' });
  let alerte;
  ({ nc, alerte } = await orch.soumettre(nc.id));
  assert.equal(alerte.declenchee, false);
  assert.equal(sms.outbox.filter((m) => m.meta.motif === 'alerte_critique').length, 0);
});

// --- 4. Rappels CAPA J-3 aux bons destinataires ------------------------------
test('rappel CAPA déclenché à J-3 au responsable de l’action', async () => {
  const { orch, sms, rappelsEnvoyes } = nouvelEnv();
  const resp = { nom: 'COMPAORE Boukary', tel: '+22670000004' };
  let nc = await orch.creerNc({ emetteur: 'X', service: 'maintenance', intitule: 'Action corrective' });
  ({ nc } = await orch.soumettre(nc.id));
  await orch.transition(nc.id, 'prendre_en_charge');
  await orch.majNc(nc.id, {
    capa: { actions: [
      { libelle: 'Remplacer la pièce', responsable: resp, echeance: dansNjours(3), statut: 'en_cours' },
      { libelle: 'Échéance lointaine', responsable: resp, echeance: dansNjours(10), statut: 'en_cours' },
    ] },
  });

  const journal = await traiterRappels({
    ncs: await orch.store.listerNcs(), sms, maintenant: new Date(), rappelsEnvoyes,
  });

  // Seule l'action à J-3 doit déclencher un rappel.
  assert.equal(journal.length, 1);
  assert.equal(journal[0].destinataire.tel, resp.tel);
  const rappelSms = sms.outbox.find((m) => m.meta.motif === 'rappel_capa');
  assert.ok(rappelSms && rappelSms.to === resp.tel, 'rappel envoyé au bon responsable');
});

test('idempotence : pas de double rappel pour la même action', async () => {
  const { orch, sms, rappelsEnvoyes } = nouvelEnv();
  const resp = { nom: 'R', tel: '+22675000000' };
  let nc = await orch.creerNc({ emetteur: 'X', service: 'maintenance', intitule: 'A' });
  ({ nc } = await orch.soumettre(nc.id));
  await orch.transition(nc.id, 'prendre_en_charge');
  await orch.majNc(nc.id, { capa: { actions: [{ libelle: 'Act', responsable: resp, echeance: dansNjours(2), statut: 'en_cours' }] } });

  await traiterRappels({ ncs: await orch.store.listerNcs(), sms, maintenant: new Date(), rappelsEnvoyes });
  await traiterRappels({ ncs: await orch.store.listerNcs(), sms, maintenant: new Date(), rappelsEnvoyes });

  assert.equal(sms.outbox.filter((m) => m.meta.motif === 'rappel_capa').length, 1);
});

test('aucun rappel sur action terminée ou NC clôturée', async () => {
  const { orch } = nouvelEnv();
  const resp = { nom: 'R', tel: '+22675000001' };
  let nc = await orch.creerNc({ emetteur: 'X', service: 'maintenance', intitule: 'A' });
  ({ nc } = await orch.soumettre(nc.id));
  await orch.transition(nc.id, 'prendre_en_charge');
  await orch.majNc(nc.id, { capa: { actions: [{ libelle: 'Faite', responsable: resp, echeance: dansNjours(1), statut: 'terminee' }] } });

  const dus = rappelsADeclencher(await orch.store.listerNcs(), new Date(), new Set());
  assert.equal(dus.length, 0, 'action terminée -> pas de rappel');
});
