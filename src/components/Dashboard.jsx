import { useState, useEffect, useCallback, useMemo } from 'react';
import { C, COULEUR_STATUT } from '../lib/theme.js';
import { api } from '../lib/api.js';
import { Btn, Carte, CarteKPI, BadgeStatut, BadgeCriticite, Vide } from './ui.jsx';
import {
  IFiche, IAlerte, ISms, ICloche, ICheck, IHorloge, IRecherche,
  IEclair, IUser, IService, IFleche, ICircuit, ICalendrier,
} from './Icones.jsx';

const ONGLETS = [
  { k: 'nc', l: 'Fiches', I: IFiche },
  { k: 'sms', l: 'Notifications SMS', I: ISms },
  { k: 'capa', l: 'Rappels CAPA', I: ICloche },
];

export default function Dashboard({ onOuvrir, onNouveau, rafraichir }) {
  const [ncs, setNcs] = useState([]);
  const [sms, setSms] = useState([]);
  const [rappels, setRappels] = useState([]);
  const [onglet, setOnglet] = useState('nc');
  const [detail, setDetail] = useState(null);
  const [msg, setMsg] = useState(null);
  const [q, setQ] = useState('');

  const charger = useCallback(async () => {
    const [n, s, r] = await Promise.all([api.listerNc(), api.sms(), api.rappels()]);
    setNcs([...n].reverse());
    setSms([...s].reverse());
    setRappels([...r].reverse());
  }, []);

  useEffect(() => { charger(); }, [charger, rafraichir]);

  const executerRappels = async () => {
    const r = await api.executerRappels(new Date().toISOString());
    setMsg(`${r.declenches} rappel(s) CAPA déclenché(s).`);
    setTimeout(() => setMsg(null), 4000);
    charger();
  };

  const stats = useMemo(() => ({
    total: ncs.length,
    ouvertes: ncs.filter((n) => n.statut === 'ouverte').length,
    enCours: ncs.filter((n) => n.statut === 'en_cours').length,
    cloturees: ncs.filter((n) => n.statut === 'cloturee').length,
    critiques: ncs.filter((n) => n.critique && n.statut !== 'cloturee').length,
  }), [ncs]);

  const repartition = useMemo(() => (
    ['brouillon', 'ouverte', 'en_cours', 'cloturee'].map((s) => ({
      s, n: ncs.filter((x) => x.statut === s).length,
    }))
  ), [ncs]);

  const ncsFiltrees = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return ncs;
    return ncs.filter((n) =>
      (n.numero || '').toLowerCase().includes(t) ||
      (n.intitule || '').toLowerCase().includes(t) ||
      (n.service || '').toLowerCase().includes(t));
  }, [ncs, q]);

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: 'clamp(20px,4vw,34px) clamp(16px,4vw,40px) 70px' }}>
      {/* Bandeau de section */}
      <div className="apparition" style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 'clamp(20px,3vw,26px)', fontWeight: 700, color: C.texte, margin: 0, letterSpacing: '-.01em' }}>
          Pilotage des non-conformités
        </h1>
        <p style={{ fontSize: 13.5, color: C.texteDoux, margin: '5px 0 0' }}>
          Suivi du cycle de vie, des affectations et des actions correctives — Système de management de la qualité.
        </p>
      </div>

      {/* Indicateurs */}
      <div className="apparition-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(178px,1fr))', gap: 14, marginBottom: 18 }}>
        <CarteKPI icone={<IFiche t={22} />} valeur={stats.total} label="Fiches au total" couleur={C.greenFonce} fond={C.greenBg} />
        <CarteKPI icone={<IFleche t={22} />} valeur={stats.ouvertes} label="Ouvertes" couleur={C.bleu} fond={C.bleuBg} />
        <CarteKPI icone={<IHorloge t={22} />} valeur={stats.enCours} label="En cours de traitement" couleur={C.orange} fond={C.orangeBg} />
        <CarteKPI icone={<ICheck t={22} />} valeur={stats.cloturees} label="Clôturées" couleur={C.greenFonce} fond={C.greenBg} />
        <CarteKPI icone={<IEclair t={22} />} valeur={stats.critiques} label="Critiques actives" couleur={C.rouge} fond={C.rougeBg} />
      </div>

      {/* Barre de répartition par statut */}
      {stats.total > 0 && (
        <div className="apparition-2" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.rGrand, padding: '16px 20px', marginBottom: 22, boxShadow: C.ombre }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: C.texteDoux, marginBottom: 10 }}>Répartition par statut</div>
          <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', background: C.bgVoile }}>
            {repartition.filter((r) => r.n > 0).map((r) => {
              const col = COULEUR_STATUT[r.s];
              return <div key={r.s} title={`${col.libelle} : ${r.n}`} style={{ width: `${(r.n / stats.total) * 100}%`, background: col.fg, opacity: 0.85 }} />;
            })}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', marginTop: 12 }}>
            {repartition.map((r) => {
              const col = COULEUR_STATUT[r.s];
              return (
                <span key={r.s} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: C.texteDoux }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: col.fg }} />
                  {col.libelle} <strong style={{ color: C.texte, fontFamily: C.policeMono }}>{r.n}</strong>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Onglets */}
      <div className="apparition-3" style={{ display: 'flex', gap: 7, marginBottom: 18, flexWrap: 'wrap' }}>
        {ONGLETS.map(({ k, l, I }) => {
          const compte = k === 'nc' ? ncs.length : k === 'sms' ? sms.length : rappels.length;
          const actif = onglet === k;
          return (
            <button key={k} onClick={() => setOnglet(k)} style={{
              padding: '9px 15px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 8,
              border: `1px solid ${actif ? C.green : C.border}`,
              background: actif ? C.green : C.surface, color: actif ? '#fff' : C.texteDoux,
              boxShadow: actif ? C.ombre : 'none', transition: 'all .15s',
            }}>
              <I t={16} /> {l}
              <span style={{
                fontFamily: C.policeMono, fontSize: 11.5, padding: '1px 7px', borderRadius: 20,
                background: actif ? 'rgba(255,255,255,.2)' : C.bgVoile, color: actif ? '#fff' : C.texteDoux,
              }}>{compte}</span>
            </button>
          );
        })}
      </div>

      {msg && (
        <div style={{ padding: '11px 15px', background: C.greenBg, color: C.greenFonce, borderRadius: 10, marginBottom: 16, fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 9, border: `1px solid ${C.greenBord}` }}>
          <ICheck t={17} /> {msg}
        </div>
      )}

      {/* --- Onglet Fiches --- */}
      {onglet === 'nc' && (
        <Carte
          titre="Registre des fiches"
          icone={<IFiche t={18} />}
          action={
            <div style={{ position: 'relative', width: 'min(280px, 46vw)' }}>
              <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: C.texteFaible, display: 'flex' }}><IRecherche t={16} /></span>
              <input
                value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (n°, intitulé, service)…"
                style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 8, border: `1px solid ${C.borderFort}`, fontSize: 13, outline: 'none', background: C.surfaceAlt }}
              />
            </div>
          }
        >
          {ncsFiltrees.length === 0 && (
            <Vide
              icone={<IFiche t={40} />}
              titre={q ? 'Aucun résultat' : 'Aucune fiche enregistrée'}
              texte={q ? 'Essayez d’autres mots-clés.' : 'Créez la première fiche de non-conformité pour démarrer le suivi.'}
            />
          )}
          {ncsFiltrees.length === 0 && !q && (
            <div style={{ textAlign: 'center', marginTop: -18, marginBottom: 8 }}>
              <Btn variant="primary" onClick={onNouveau}>Créer une fiche</Btn>
            </div>
          )}
          {ncsFiltrees.map((n) => (
            <div key={n.id} style={{ borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 2px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 13.5, color: C.texte, fontFamily: C.policeMono }}>{n.numero}</strong>
                    <BadgeCriticite criticite={n.criticite} />
                    {n.critique && n.statut !== 'cloturee' && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: C.rouge, fontWeight: 700, background: C.rougeBg, padding: '2px 7px', borderRadius: 5 }}>
                        <IEclair t={12} /> CRITIQUE
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13.5, color: C.texte, marginTop: 5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {n.intitule || '(sans intitulé)'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 5, fontSize: 12, color: C.texteDoux, flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><IService t={13} /> {n.service || '—'}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><IUser t={13} /> {n.assigneA ? n.assigneA.nom : 'Non assignée'}</span>
                  </div>
                </div>
                <BadgeStatut statut={n.statut} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setDetail(detail === n.id ? null : n.id)} style={{ background: detail === n.id ? C.greenBg : 'none', border: `1px solid ${detail === n.id ? C.greenBord : C.border}`, borderRadius: 8, padding: '7px 11px', fontSize: 12.5, cursor: 'pointer', color: detail === n.id ? C.greenFonce : C.texteDoux, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                    <ICircuit t={14} /> Traçabilité
                  </button>
                  <Btn variant="ghost" onClick={() => onOuvrir(n.id)}>Ouvrir</Btn>
                </div>
              </div>
              {detail === n.id && (
                <div style={{ padding: '4px 2px 18px' }}>
                  <Timeline historique={n.historique} evenements={n.evenements} />
                </div>
              )}
            </div>
          ))}
        </Carte>
      )}

      {/* --- Onglet SMS --- */}
      {onglet === 'sms' && (
        <Carte titre="Journal des notifications SMS" icone={<ISms t={18} />}>
          {sms.length === 0 && <Vide icone={<ISms t={40} />} titre="Aucune notification émise" texte="Les SMS d’assignation, d’alerte critique et de rappel apparaîtront ici." />}
          {sms.map((m) => (
            <div key={m.id} style={{ padding: '13px 2px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 13 }}>
              <span style={{ color: motifCouleur(m.meta?.motif), marginTop: 1, display: 'flex' }}>{motifIcone(m.meta?.motif)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12.5, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: motifCouleur(m.meta?.motif) }}>{libelleMotif(m.meta?.motif)}</span>
                  <span style={{ color: C.texteFaible, fontFamily: C.policeMono }}>{new Date(m.sentAt).toLocaleString('fr-FR')}</span>
                </div>
                <div style={{ fontSize: 12, color: C.texteDoux, margin: '2px 0 5px' }}>Destinataire : {m.to}</div>
                <div style={{ fontSize: 13.5, color: C.texte, lineHeight: 1.45 }}>{m.body}</div>
              </div>
            </div>
          ))}
        </Carte>
      )}

      {/* --- Onglet CAPA --- */}
      {onglet === 'capa' && (
        <Carte
          titre="Rappels CAPA à échéance (J-3)"
          icone={<ICloche t={18} />}
          action={<Btn variant="ghost" onClick={executerRappels}><IHorloge t={16} /> Contrôler les échéances</Btn>}
        >
          <p style={{ fontSize: 12.5, color: C.texteDoux, marginBottom: 16, lineHeight: 1.5, background: C.surfaceAlt, padding: '10px 13px', borderRadius: 9 }}>
            Le planificateur vérifie automatiquement les échéances chaque jour et notifie le responsable de chaque action arrivant à terme. Le bouton ci-dessus force un passage immédiat (utile pour la démonstration).
          </p>
          {rappels.length === 0 && <Vide icone={<ICalendrier t={40} />} titre="Aucun rappel déclenché" texte="Les actions correctives proches de leur échéance déclencheront un rappel ici." />}
          {rappels.map((r, i) => (
            <div key={i} style={{ padding: '13px 2px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 13 }}>
              <span style={{ color: C.orange, marginTop: 1, display: 'flex' }}><ICloche t={18} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5 }}>
                  <strong style={{ color: C.texte, fontFamily: C.policeMono }}>{r.numero}</strong>
                  <span style={{ color: C.texte }}> — {r.action}</span>
                </div>
                <div style={{ fontSize: 12.5, color: C.texteDoux, marginTop: 4, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><IUser t={13} /> {r.destinataire.nom} · {r.destinataire.tel}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><ICalendrier t={13} /> {r.echeance}</span>
                  <span style={{ fontWeight: 600, color: r.joursRestants <= 0 ? C.rouge : C.orange }}>J-{r.joursRestants}</span>
                </div>
              </div>
            </div>
          ))}
        </Carte>
      )}
    </div>
  );
}

function Timeline({ historique = [], evenements = [] }) {
  const evts = [
    ...historique.map((h) => ({ le: h.le, txt: `Transition : ${h.de ? libStatut(h.de) + ' → ' : ''}${libStatut(h.vers)} (${h.action}) par ${h.par}` })),
    ...evenements.map((e) => ({ le: e.le, txt: descriptionEvt(e) })),
  ].sort((a, b) => new Date(a.le) - new Date(b.le));

  return (
    <div style={{ margin: '4px 0', padding: '14px 16px', background: C.surfaceAlt, borderRadius: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.texteDoux, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.04em' }}>Journal d’audit</div>
      <div style={{ paddingLeft: 14, borderLeft: `2px solid ${C.greenBord}` }}>
        {evts.map((e, i) => (
          <div key={i} style={{ position: 'relative', paddingBottom: 11, fontSize: 12.5 }}>
            <span style={{ position: 'absolute', left: -19.5, top: 3, width: 9, height: 9, borderRadius: '50%', background: C.green, border: `2px solid ${C.surfaceAlt}` }} />
            <span style={{ color: C.texteFaible, fontFamily: C.policeMono }}>{new Date(e.le).toLocaleString('fr-FR')}</span>
            <span style={{ color: C.texte }}> — {e.txt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function libStatut(s) { return (COULEUR_STATUT[s] && COULEUR_STATUT[s].libelle) || s; }

function descriptionEvt(e) {
  if (e.type === 'notification_pilote') return `Notification pilote envoyée à ${e.destinataire?.nom}`;
  if (e.type === 'alerte_critique') return `Alerte critique → ${e.destinataire?.role} (${e.delaiMs} ms)`;
  if (e.type === 'alerte_critique_hors_delai') return `Alerte hors délai : ${e.detail}`;
  if (e.type === 'assignation_echec') return e.detail;
  return e.type;
}
function libelleMotif(m) {
  return { assignation_pilote: 'Assignation au pilote', alerte_critique: 'Alerte critique', rappel_capa: 'Rappel CAPA' }[m] || 'Notification';
}
function motifCouleur(m) {
  return { assignation_pilote: C.bleu, alerte_critique: C.rouge, rappel_capa: C.orange }[m] || C.texteDoux;
}
function motifIcone(m) {
  if (m === 'alerte_critique') return <IAlerte t={18} />;
  if (m === 'rappel_capa') return <ICloche t={18} />;
  if (m === 'assignation_pilote') return <IUser t={18} />;
  return <ISms t={18} />;
}
