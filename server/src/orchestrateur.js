// // ============================================================================
// //  orchestrateur.js — Logique métier de haut niveau (utilisée par l'API ET
// //  par les tests d'intégration, garantissant qu'on teste le vrai code).
// // ============================================================================

// import {
//   STATUTS,
//   appliquerTransition,
//   transitionsDisponibles,
//   estVerrouillee,
//   WorkflowError,
// } from './workflow.js';
// import {
//   assignerEtNotifierPilote,
//   alerterSiCritique,
//   estCritique,
// } from './services/notifications.js';
// import { nouvelId } from './store.js';

// export class Orchestrateur {
//   constructor({ store, sms, rappelsEnvoyes = new Set(), journalRappels = [] }) {
//     this.store = store;
//     this.sms = sms;
//     this.rappelsEnvoyes = rappelsEnvoyes;
//     this.journalRappels = journalRappels;
//   }

//   // Création d'une NC en statut BROUILLON. Aucune assignation ni alerte
//   // tant que la fiche n'a pas été soumise explicitement.
//   async creerNc(donnees = {}, { par = 'émetteur' } = {}) {
//     const maintenant = new Date().toISOString();
//     const nc = {
//       id: nouvelId(),
//       numero: await this.store.genererNumero(),
//       statut: STATUTS.BROUILLON,
//       creeLe: maintenant,
//       majLe: maintenant,
//       // Identification
//       emetteur: donnees.emetteur || '',
//       service: donnees.service || '',
//       intitule: donnees.intitule || '',
//       description: donnees.description || '',
//       // Caractérisation
//       criticite: donnees.criticite || 'moyenne',
//       classification: donnees.classification || '',
//       typeObjet: donnees.typeObjet || [],
//       // Analyse / CAPA / clôture
//       analyse: donnees.analyse || { cinqM: {}, cinqPourquoi: [] },
//       capa: donnees.capa || { actions: [] },
//       cloture: donnees.cloture || null,
//       // Affectation & traçabilité
//       assigneA: null,
//       historique: [
//         { de: null, vers: STATUTS.BROUILLON, action: 'creation', par, le: maintenant },
//       ],
//       evenements: [],
//     };
//     return this.store.ajouterNc(nc);
//   }

//   // Mise à jour de champs — interdite si verrouillée (post-clôture).
//   async majNc(id, patch, { par = 'utilisateur' } = {}) {
//     const nc = await this.store.trouverNc(id);
//     if (!nc) throw new WorkflowError('NC introuvable.', 'INTROUVABLE');
//     if (estVerrouillee(nc)) {
//       throw new WorkflowError('Fiche clôturée et verrouillée : édition impossible.', 'VERROUILLEE');
//     }
//     const champsAutorises = [
//       'emetteur', 'service', 'intitule', 'description', 'criticite',
//       'classification', 'typeObjet', 'analyse', 'capa', 'cloture',
//     ];
//     for (const [k, v] of Object.entries(patch)) {
//       if (champsAutorises.includes(k)) nc[k] = v;
//     }
//     nc.majLe = new Date().toISOString();
//     return this.store.remplacerNc(nc);
//   }

//   // SOUMISSION : brouillon -> ouverte, déclenche assignation + alerte critique.
//   // Retourne { nc, assignation, alerte } avec le délai d'alerte mesuré.
//   async soumettre(id, { par = 'émetteur' } = {}) {
//     let nc = await this.store.trouverNc(id);
//     if (!nc) throw new WorkflowError('NC introuvable.', 'INTROUVABLE');

//     const origineMs = Date.now();

//     const { nc: ncOuverte } = appliquerTransition(nc, 'soumettre', { par });
//     nc = ncOuverte;

//     const { assigne, evenements: evPilote, promesses } = assignerEtNotifierPilote(nc, { sms: this.sms });
//     nc.evenements.push(...evPilote);

//     const alerte = await alerterSiCritique(nc, { sms: this.sms, origineMs });
//     nc.evenements.push(...alerte.evenements);

//     await Promise.all(promesses);

//     await this.store.remplacerNc(nc);
//     return { nc, assignation: { assigne }, alerte };
//   }

//   // Transition générique (prendre_en_charge, cloturer).
//   async transition(id, action, { par = 'utilisateur' } = {}) {
//     const nc = await this.store.trouverNc(id);
//     if (!nc) throw new WorkflowError('NC introuvable.', 'INTROUVABLE');
//     const { nc: ncMaj, transition } = appliquerTransition(nc, action, { par });
//     await this.store.remplacerNc(ncMaj);
//     return { nc: ncMaj, transition };
//   }

//   infos(nc) {
//     return {
//       ...nc,
//       critique: estCritique(nc),
//       verrouillee: estVerrouillee(nc),
//       transitionsDisponibles: transitionsDisponibles(nc),
//     };
//   }
// }


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

  // Création d'une NC en statut BROUILLON. Aucune assignation ni alerte
  // tant que la fiche n'a pas été soumise explicitement.
  async creerNc(donnees = {}, { par = 'émetteur' } = {}) {
    const maintenant = new Date().toISOString();
    const nc = {
      id: nouvelId(),
      numero: await this.store.genererNumero(),
      statut: STATUTS.BROUILLON,
      creeLe: maintenant,
      majLe: maintenant,
      emetteur: donnees.emetteur || '',
      service: donnees.service || '',
      intitule: donnees.intitule || '',
      description: donnees.description || '',
      criticite: donnees.criticite || 'moyenne',
      classification: donnees.classification || '',
      typeObjet: donnees.typeObjet || [],
      analyse: donnees.analyse || { cinqM: {}, cinqPourquoi: [] },
      capa: donnees.capa || { actions: [] },
      cloture: donnees.cloture || null,
      assigneA: null,
      historique: [
        { de: null, vers: STATUTS.BROUILLON, action: 'creation', par, le: maintenant },
      ],
      evenements: [],
    };
    return this.store.ajouterNc(nc);
  }

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

  // SOUMISSION : brouillon -> ouverte, déclenche assignation + alerte critique.
  async soumettre(id, { par = 'émetteur' } = {}) {
    let nc = await this.store.trouverNc(id);
    if (!nc) throw new WorkflowError('NC introuvable.', 'INTROUVABLE');

    const origineMs = Date.now();

    const { nc: ncOuverte } = appliquerTransition(nc, 'soumettre', { par });
    nc = ncOuverte;

    const { assigne, evenements: evPilote, promesses } = assignerEtNotifierPilote(nc, { sms: this.sms });
    nc.evenements.push(...evPilote);

    const alerte = await alerterSiCritique(nc, { sms: this.sms, origineMs });
    nc.evenements.push(...alerte.evenements);

    await Promise.all(promesses);

    await this.store.remplacerNc(nc);
    return { nc, assignation: { assigne }, alerte };
  }

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