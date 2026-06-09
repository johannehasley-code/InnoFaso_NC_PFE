// ============================================================================
//  rappels.js — Rappels automatiques CAPA à J-3
//  Pour chaque action CAPA non terminée dont l'échéance tombe dans la fenêtre
//  [maintenant ; maintenant + 3 jours], on envoie un rappel SMS au responsable
//  de l'action — une seule fois (idempotence via la clé du rappel).
// ============================================================================

const JOUR_MS = 24 * 60 * 60 * 1000;
export const FENETRE_RAPPEL_JOURS = 3;

// Clé unique d'un rappel pour éviter les doublons : NC + index action + échéance.
export function cleRappel(nc, idxAction, action) {
  return `${nc.id}:${idxAction}:${action.echeance}`;
}

function joursRestants(echeanceISO, maintenant) {
  const ech = new Date(echeanceISO).getTime();
  return Math.ceil((ech - maintenant.getTime()) / JOUR_MS);
}

// FONCTION PURE : calcule la liste des rappels à envoyer à l'instant `maintenant`.
// `rappelsEnvoyes` est un Set de clés déjà traitées (idempotence).
// Renvoie [{ nc, idxAction, action, responsable, joursRestants, cle }]
export function rappelsADeclencher(ncs, maintenant = new Date(), rappelsEnvoyes = new Set()) {
  const aEnvoyer = [];
  for (const nc of ncs) {
    // On ne rappelle pas sur une fiche clôturée/verrouillée.
    if (nc.statut === 'cloturee') continue;
    const actions = (nc.capa && nc.capa.actions) || [];
    actions.forEach((action, idx) => {
      if (!action.echeance) return;
      const termine = action.statut === 'terminee' || action.statut === 'realisee';
      if (termine) return;
      const jr = joursRestants(action.echeance, maintenant);
      // Fenêtre : échéance dans 0..3 jours (J-3 jusqu'au jour J).
      if (jr < 0 || jr > FENETRE_RAPPEL_JOURS) return;
      const cle = cleRappel(nc, idx, action);
      if (rappelsEnvoyes.has(cle)) return;
      aEnvoyer.push({
        nc,
        idxAction: idx,
        action,
        responsable: action.responsable,
        joursRestants: jr,
        cle,
      });
    });
  }
  return aEnvoyer;
}

// Effectue les envois SMS pour les rappels dus et marque les clés comme traitées.
export async function traiterRappels({ ncs, sms, maintenant = new Date(), rappelsEnvoyes }) {
  const dus = rappelsADeclencher(ncs, maintenant, rappelsEnvoyes);
  const journal = [];
  for (const r of dus) {
    const dest = r.responsable;
    if (!dest || !dest.tel) {
      rappelsEnvoyes.add(r.cle); // évite de boucler sur une action mal renseignée
      continue;
    }
    const corps =
      `RAPPEL CAPA — NC ${r.nc.numero} : action « ${r.action.libelle} » ` +
      `échéance le ${r.action.echeance} (J-${r.joursRestants}). Responsable : ${dest.nom}.`;
    const m = await sms.send({
      to: dest.tel,
      body: corps,
      meta: { ncId: r.nc.id, motif: 'rappel_capa', echeance: r.action.echeance },
    });
    rappelsEnvoyes.add(r.cle);
    journal.push({
      ncId: r.nc.id,
      numero: r.nc.numero,
      action: r.action.libelle,
      destinataire: dest,
      echeance: r.action.echeance,
      joursRestants: r.joursRestants,
      smsId: m.id,
      le: m.sentAt,
    });
  }
  return journal;
}

// Planificateur : exécute traiterRappels à intervalle régulier (1x/jour en prod).
// Retourne un handle { stop() }. Pour les démos, on peut réduire l'intervalle.
export function demarrerPlanificateur({ getNcs, sms, rappelsEnvoyes, journalGlobal, intervalleMs = JOUR_MS }) {
  const tick = async () => {
    const ncs = await getNcs(); // getNcs peut être asynchrone (MySQL)
    const journal = await traiterRappels({
      ncs,
      sms,
      maintenant: new Date(),
      rappelsEnvoyes,
    });
    journal.forEach((j) => journalGlobal.push(j));
  };
  const timer = setInterval(tick, intervalleMs);
  if (timer.unref) timer.unref();
  return { stop: () => clearInterval(timer), tick };
}
