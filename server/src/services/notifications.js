import { piloteDuService, RQ, DG } from './organisation.js';

const SEUIL_ALERTE_CRITIQUE_MS = 30_000;

export function estCritique(nc) {
  return nc.criticite === 'critique' || nc.classification === 'critique';
}

export function assignerEtNotifierPilote(nc, { sms }) {
  const pilote = piloteDuService(nc.service);
  const evenements = [];

  if (!pilote) {
    evenements.push({
      type: 'assignation_echec',
      le: new Date().toISOString(),
      detail: `Aucun pilote défini pour le service « ${nc.service} ».`,
    });
    return { assigne: null, evenements, promesses: [] };
  }

  nc.assigneA = pilote;
  const corps =
    `INNOFASO QUALITE — Nouvelle NC ${nc.numero} qui vous est assignée ` +
    `(service ${nc.service}). Intitulé : ${nc.intitule}. Merci de la prendre en charge.`;

  const dest = pilote.email || pilote.tel;
  const p = sms
    .send({ to: dest, body: corps, meta: { ncId: nc.id, motif: 'assignation_pilote', nom: pilote.nom } })
    .then((m) => {
      evenements.push({
        type: 'notification_pilote',
        le: m.sentAt,
        destinataire: pilote,
        canal: 'email',
        smsId: m.id,
      });
      return m;
    });

  return { assigne: pilote, evenements, promesses: [p] };
}

export async function alerterSiCritique(nc, { sms, origineMs = Date.now() }) {
  if (!estCritique(nc)) return { declenchee: false, delaiMs: 0, evenements: [] };

  const destinataires = [RQ, DG];
  const corps =
    `ALERTE NC CRITIQUE — ${nc.numero} (service ${nc.service}). ` +
    `${nc.intitule}. Émise par ${nc.emetteur}. Intervention immédiate requise.`;

  const envois = await Promise.all(
    destinataires.map((d) =>
      sms.send({ to: d.email || d.tel, body: corps, meta: { ncId: nc.id, motif: 'alerte_critique', role: d.role, nom: d.nom } }),
    ),
  );

  const finMs = Date.now();
  const delaiMs = finMs - origineMs;

  const evenements = envois.map((m, i) => ({
    type: 'alerte_critique',
    le: m.sentAt,
    destinataire: destinataires[i],
    canal: 'email',
    smsId: m.id,
    delaiMs,
  }));

  if (delaiMs > SEUIL_ALERTE_CRITIQUE_MS) {
    evenements.push({
      type: 'alerte_critique_hors_delai',
      le: new Date().toISOString(),
      detail: `Délai d'émission ${delaiMs} ms > seuil ${SEUIL_ALERTE_CRITIQUE_MS} ms.`,
    });
  }

  return { declenchee: true, delaiMs, seuilMs: SEUIL_ALERTE_CRITIQUE_MS, destinataires, evenements };
}

export { SEUIL_ALERTE_CRITIQUE_MS };