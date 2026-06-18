// ============================================================================
//  workflow.js — Machine à états des Fiches de Non-Conformité (FNC)
//  Cycle de vie : ouverte -> en_cours -> cloturee
//  Verrouillage post-clôture : aucune transition ni édition possible.
// ============================================================================

export const STATUTS = {
  OUVERTE: 'ouverte',
  EN_COURS: 'en_cours',
  CLOTUREE: 'cloturee',
};

export const LIBELLE_STATUT = {
  ouverte: 'Ouverte',
  en_cours: 'En cours',
  cloturee: 'Clôturée',
};

// Ordre logique du cycle de vie (utilisé pour l'affichage de la frise).
export const ORDRE_STATUTS = [
  STATUTS.OUVERTE,
  STATUTS.EN_COURS,
  STATUTS.CLOTUREE,
];

// Définition des transitions autorisées : action -> {from, to, guard?}
export const TRANSITIONS = {
  prendre_en_charge: {
    from: [STATUTS.OUVERTE],
    to: STATUTS.EN_COURS,
    label: 'Prendre en charge',
    guard: () => true,
  },
  cloturer: {
    from: [STATUTS.EN_COURS],
    to: STATUTS.CLOTUREE,
    label: 'Clôturer la NC',
    // On ne clôture que si la vérification d'efficacité est renseignée.
    guard: (nc) => Boolean(nc.cloture && nc.cloture.efficacite),
    guardMessage:
      "La vérification d'efficacité (étape Clôture) doit être renseignée avant clôture.",
  },
};

// Statuts à partir desquels la fiche est verrouillée (lecture seule).
export function estVerrouillee(nc) {
  return nc.statut === STATUTS.CLOTUREE;
}

// Renvoie la liste des actions de transition jouables depuis le statut courant.
export function transitionsDisponibles(nc) {
  return Object.entries(TRANSITIONS)
    .filter(([, t]) => t.from.includes(nc.statut))
    .map(([action, t]) => ({ action, to: t.to, label: t.label }));
}

// Erreur métier dédiée pour distinguer les 4xx workflow des 500.
export class WorkflowError extends Error {
  constructor(message, code = 'WORKFLOW_INVALID') {
    super(message);
    this.name = 'WorkflowError';
    this.code = code;
    this.status = 409;
  }
}

// Applique une transition. Retourne {nc, transition} ou lève WorkflowError.
export function appliquerTransition(nc, action, { par = 'système' } = {}) {
  const t = TRANSITIONS[action];
  if (!t) {
    throw new WorkflowError(`Action de transition inconnue : « ${action} ».`, 'ACTION_INCONNUE');
  }
  if (estVerrouillee(nc)) {
    throw new WorkflowError(
      `Fiche clôturée et verrouillée : aucune transition n'est autorisée.`,
      'VERROUILLEE',
    );
  }
  if (!t.from.includes(nc.statut)) {
    throw new WorkflowError(
      `Transition « ${action} » impossible depuis le statut « ${LIBELLE_STATUT[nc.statut]} ».`,
      'TRANSITION_INVALIDE',
    );
  }
  if (t.guard && !t.guard(nc)) {
    throw new WorkflowError(t.guardMessage || 'Conditions de transition non remplies.', 'GARDE_NON_SATISFAITE');
  }

  const horodatage = new Date().toISOString();
  const entreeHistorique = {
    de: nc.statut,
    vers: t.to,
    action,
    par,
    le: horodatage,
  };

  const ncMaj = {
    ...nc,
    statut: t.to,
    majLe: horodatage,
    historique: [...(nc.historique || []), entreeHistorique],
  };

  if (t.to === STATUTS.CLOTUREE) {
    ncMaj.clotureeLe = horodatage;
    ncMaj.verrouillee = true;
  }

  return { nc: ncMaj, transition: entreeHistorique };
}