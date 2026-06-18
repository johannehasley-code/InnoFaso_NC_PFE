// ============================================================================
//  orchestrateur.js — Logique métier de haut niveau (utilisée par l'API ET
//  par les tests d'intégration, garantissant qu'on teste le vrai code).
// ============================================================================

import {
  STATUTS,
  appliquerTransition,
  transitionsDisponibles,
  estVerrouillee,
  WorkflowError,
} from './workflow.js';
import {
  assignerEtNotifierPilote,
  alerterSiCritique,
  estCritique,
} from './services/notifications.js';
import { nouvelId } from './store.js';

export class Orchestrateur {
  constructor({ store, sms, rappelsEnvoyes = new Set(), journalRappels = [] }) {
    this.store = store;
    this.sms = sms;
    this.rappelsEnvoyes = rappelsEnvoyes;
    this.journalRappels = journalRappels;
  }

  // Création d'une NC : démarre directement en statut OUVERTE (pas de brouillon).
  // Assigne immédiatement le pilote du service et déclenche l'alerte critique si besoin.
  async creerNc(donnees = {}, { par = 'émetteur' } = {}) {
    const maintenant = new Date().toISOString();
    const origineMs = Date.now();
    const nc = {
      id: nouvelId(),
      numero: await this.store.genererNumero(),
      statut: STATUTS.OUVERTE,
      creeLe: maintenant,
      majLe: maintenant,
      // Identification
      emetteur: donnees.emetteur || '',
      service: donnees.service || '',
      intitule: donnees.intitule || '',
      description: donnees.description || '',
      // Caractérisation
      criticite: donnees.criticite || 'moyenne',
      classification: donnees.classification || '',
      typeObjet: donnees.typeObjet || [],
      // Analyse / CAPA / clôture
      analyse: donnees.analyse || { cinqM: {}, cinqPourquoi: [] },
      capa: donnees.capa || { actions: [] },
      cloture: donnees.cloture || null,
      // Affectation & traçabilité
      assigneA: null,
      historique: [
        { de: null, vers: STATUTS.OUVERTE, action: 'creation', par, le: maintenant },
      ],
      evenements: [],
    };

    const { assigne, evenements: evPilote, promesses } = assignerEtNotifierPilote(nc, { sms: this.sms });
    nc.evenements.push(...evPilote);

    const alerte = await alerterSiCritique(nc, { sms: this.sms, origineMs });
    nc.evenements.push(...alerte.evenements);

    await Promise.all(promesses);

    return this.store.ajouterNc(nc);
  }

  // Mise à jour de champs — interdite si verrouillée (post-clôture).
  async majNc(id, patch, { par = 'utilisateur' } = {}) {
    const nc = await this.store.trouverNc(id);
    if (!nc) throw new WorkflowError('NC introuvable.', 'INTROUVABLE');
    if (estVerrouillee(nc)) {
      throw new WorkflowError('Fiche clôturée et verrouillée : édition impossible.', 'VERROUILLEE');
    }
    const champsAutorises = [
      'emetteur', 'service', 'intitule', 'description', 'criticite',
      'classification', 'typeObjet', 'analyse', 'capa', 'cloture',
    ];
    for (const [k, v] of Object.entries(patch)) {
      if (champsAutorises.includes(k)) nc[k] = v;
    }
    nc.majLe = new Date().toISOString();
    return this.store.remplacerNc(nc);
  }

  // Transition générique (prendre_en_charge, cloturer).
  async transition(id, action, { par = 'utilisateur' } = {}) {
    const nc = await this.store.trouverNc(id);
    if (!nc) throw new WorkflowError('NC introuvable.', 'INTROUVABLE');
    const { nc: ncMaj, transition } = appliquerTransition(nc, action, { par });
    await this.store.remplacerNc(ncMaj);
    return { nc: ncMaj, transition };
  }

  infos(nc) {
    return {
      ...nc,
      critique: estCritique(nc),
      verrouillee: estVerrouillee(nc),
      transitionsDisponibles: transitionsDisponibles(nc),
    };
  }
}