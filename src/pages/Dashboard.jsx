// // src/pages/Dashboard.jsx
// import { useEffect, useState } from 'react';
// import { C } from '../lib/theme.js';
// import { api } from '../lib/api.js';
// import { CarteKPI, Carte } from '../components/ui.jsx';
// import { IFiche, IAlerte, IEclair, ICheck, IHorloge, ICircuit } from '../components/Icones.jsx';

// export default function Dashboard({ onOuvrir, onNouveau, rafraichir }) {
//   const [stats, setStats] = useState(null);
//   const [ncs,   setNcs]   = useState([]);

//   useEffect(() => {
//     api.listerNc().then(setNcs).catch(() => {});
//   }, [rafraichir]);

//   // Calcul stats locales à partir des NC
//   useEffect(() => {
//     if (!ncs.length) return;
//     const total     = ncs.length;
//     const ouvertes  = ncs.filter(n => n.statut === 'ouverte').length;
//     const enCours   = ncs.filter(n => n.statut === 'en_cours').length;
//     const cloturees = ncs.filter(n => n.statut === 'cloturee').length;
//     const critiques = ncs.filter(n => n.criticite === 'critique').length;
//     setStats({ total, ouvertes, enCours, cloturees, critiques });
//   }, [ncs]);

//   const SPRINTS = [
//     { sprint: 'Sprint 3', status: 'Terminé',  desc: 'Auth JWT · RBAC · Audit Logs',             c: C.green },
//     { sprint: 'Sprint 4', status: 'En cours', desc: 'Formulaire NC Digital (F01/F02/F03)',        c: C.orange },
//     { sprint: 'Sprint 5', status: 'À venir',  desc: 'Workflow traitement NC (F04/F05/F06)',       c: C.gris },
//     { sprint: 'Sprint 6', status: 'À venir',  desc: 'Analyse 5M, CAPA et Clôture (F07/F08)',     c: C.gris },
//   ];

//   const CRITICITES = [
//     { v: 'faible',   l: 'Faible',   c: C.green },
//     { v: 'moyenne',  l: 'Moyenne',  c: C.bleu },
//     { v: 'elevee',   l: 'Élevée',   c: C.orange },
//     { v: 'critique', l: 'Critique', c: C.rouge },
//   ];

//   return (
//     <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(20px,4vw,32px) clamp(16px,4vw,40px)' }}>

//       {/* KPIs */}
//       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginBottom: 28 }}>
//         <CarteKPI icone={<IFiche t={22}/>}   valeur={stats?.total     ?? '…'} label="Total NC"       couleur={C.bleu}      fond={C.bleuBg} />
//         <CarteKPI icone={<IAlerte t={22}/>}  valeur={stats?.ouvertes  ?? '…'} label="NC Ouvertes"    couleur={C.rouge}     fond={C.rougeBg} />
//         <CarteKPI icone={<IHorloge t={22}/>} valeur={stats?.enCours   ?? '…'} label="En cours"       couleur={C.orange}    fond={C.orangeBg} />
//         <CarteKPI icone={<IEclair t={22}/>}  valeur={stats?.critiques ?? '…'} label="NC Critiques"   couleur={C.rouge}     fond={C.rougeBg} />
//         <CarteKPI icone={<ICheck t={22}/>}   valeur={stats?.cloturees ?? '…'} label="NC Clôturées"   couleur={C.green}     fond={C.greenBg} />
//       </div>

//       <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr', gap: 18, marginBottom: 18 }}>

//         {/* Répartition criticité */}
//         <Carte titre="Répartition par criticité" icone={<IEclair t={16}/>}>
//           {ncs.length === 0
//             ? <p style={{ color: C.texteFaible, fontSize: 13 }}>Aucune NC enregistrée.</p>
//             : <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
//                 {CRITICITES.map(({ v, l, c }) => {
//                   const n   = ncs.filter(nc => nc.criticite === v).length;
//                   const pct = ncs.length ? Math.round((n / ncs.length) * 100) : 0;
//                   return (
//                     <div key={v}>
//                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
//                         <span style={{ color: C.texte, fontWeight: 600 }}>{l}</span>
//                         <span style={{ color: C.texteDoux, fontFamily: C.policeMono }}>{n} ({pct}%)</span>
//                       </div>
//                       <div style={{ height: 7, background: C.bgVoile, borderRadius: 4, overflow: 'hidden' }}>
//                         <div style={{ height: '100%', width: `${pct}%`, background: c, borderRadius: 4, transition: 'width .4s' }} />
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//           }
//         </Carte>

        
//       </div>

//       {/* Dernières NC */}
//       <Carte titre="Dernières non-conformités" icone={<IFiche t={16}/>}
//         action={
//           <button onClick={onNouveau} style={{ background: C.green, color: '#fff', border: 'none',
//             borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
//             display: 'flex', alignItems: 'center', gap: 6 }}>
//             + Nouvelle NC
//           </button>
//         }>
//         {ncs.length === 0
//           ? <p style={{ color: C.texteFaible, fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Aucune NC enregistrée.</p>
//           : <div style={{ overflowX: 'auto' }}>
//               <table style={{ width: '100%', borderCollapse: 'collapse' }}>
//                 <thead>
//                   <tr>
//                     {['Numéro', 'Statut', 'Criticité', 'Émetteur', 'Date'].map(h => (
//                       <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12,
//                         color: C.texteDoux, borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>{h}</th>
//                     ))}
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {ncs.slice(0, 8).map((nc, i) => (
//                     <tr key={nc.id} onClick={() => onOuvrir(nc.id)}
//                       style={{ cursor: 'pointer', background: i % 2 === 0 ? '#fff' : C.surfaceAlt,
//                         transition: 'background .12s' }}
//                       onMouseEnter={e => e.currentTarget.style.background = C.greenBg}
//                       onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : C.surfaceAlt}>
//                       <td style={TD}><span style={{ fontFamily: C.policeMono, color: C.green, fontWeight: 600 }}>{nc.numero}</span></td>
//                       <td style={TD}><StatutBadge s={nc.statut} /></td>
//                       <td style={TD}><CritBadge c={nc.criticite} /></td>
//                       <td style={{ ...TD, color: C.texteDoux }}>{nc.emetteur || '—'}</td>
//                       <td style={{ ...TD, color: C.texteFaible, fontSize: 12, fontFamily: C.policeMono }}>
//                         {nc.creeLe ? new Date(nc.creeLe).toLocaleDateString('fr-FR') : '—'}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//         }
//       </Carte>
//     </div>
//   );
// }

// const TD = { padding: '10px 12px', fontSize: 13, borderBottom: `1px solid #F3F4F6`, verticalAlign: 'middle' };

// function StatutBadge({ s }) {
//   const MAP = {
//     brouillon: { c: C.gris,   bg: '#eef0ed' },
//     ouverte:   { c: C.bleu,   bg: C.bleuBg },
//     en_cours:  { c: C.orange, bg: C.orangeBg },
//     cloturee:  { c: C.green,  bg: C.greenBg },
//   };
//   const m = MAP[s] || MAP.brouillon;
//   return (
//     <span style={{ background: m.bg, color: m.c, padding: '2px 9px',
//       borderRadius: 10, fontSize: 12, fontWeight: 600 }}>{s}</span>
//   );
// }

// function CritBadge({ c }) {
//   const MAP = {
//     faible:   { c: C.green,  bg: C.greenBg },
//     moyenne:  { c: C.bleu,   bg: C.bleuBg },
//     elevee:   { c: C.orange, bg: C.orangeBg },
//     critique: { c: C.rouge,  bg: C.rougeBg },
//   };
//   const m = MAP[c] || MAP.moyenne;
//   return (
//     <span style={{ background: m.bg, color: m.c, padding: '2px 9px',
//       borderRadius: 5, fontSize: 11.5, fontWeight: 600, fontFamily: C.policeMono }}>{c || '—'}</span>
//   );
// }




// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { C } from '../lib/theme.js';
import { api } from '../lib/api.js';
import { CarteKPI, Carte, BadgeStatut, BadgeCriticite } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  IFiche, IAlerte, IEclair, ICheck, IHorloge, ICircuit,
  IPlus, IService,
} from '../components/Icones.jsx';

export default function Dashboard({ onOuvrir, onNouveau, rafraichir }) {
  const { user }  = useAuth();
  const [ncs,     setNcs]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.listerNc()
      .then(data => setNcs(Array.isArray(data) ? data : data.ncs || data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [rafraichir]);

  const stats = {
    total:     ncs.length,
    ouvertes:  ncs.filter(n => n.statut === 'ouverte').length,
    enCours:   ncs.filter(n => n.statut === 'en_cours').length,
    cloturees: ncs.filter(n => n.statut === 'cloturee').length,
    brouillon: ncs.filter(n => n.statut === 'brouillon').length,
    critiques: ncs.filter(n => n.criticite === 'critique').length,
  };

  const tauxCloture = stats.total > 0 ? Math.round((stats.cloturees / stats.total) * 100) : 0;

  const CRITICITES = [
    { v: 'critique', l: 'Critique', c: C.rouge,  bg: C.rougeBg },
    { v: 'elevee',   l: 'Élevée',   c: C.orange, bg: C.orangeBg },
    { v: 'moyenne',  l: 'Moyenne',  c: C.bleu,   bg: C.bleuBg },
    { v: 'faible',   l: 'Faible',   c: C.green,  bg: C.greenBg },
  ];

  const STATUTS = [
    { v: 'ouverte',   l: 'Ouvertes',  c: C.bleu },
    { v: 'en_cours',  l: 'En cours',  c: C.orange },
    { v: 'brouillon', l: 'Brouillon', c: C.gris },
    { v: 'cloturee',  l: 'Clôturées', c: C.green },
  ];

  const serviceCount = ncs.reduce((acc, nc) => {
    const s = nc.service || 'Non défini';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const topServices = Object.entries(serviceCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto',
      padding: 'clamp(20px,4vw,32px) clamp(16px,4vw,40px)',
      fontFamily: C.police }}>

      {/* Bienvenue */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.texte, margin: '0 0 4px' }}>
            Bonjour, {user?.prenom} 👋
          </h1>
          <p style={{ fontSize: 13, color: C.texteDoux, margin: 0 }}>
            {new Date().toLocaleDateString('fr-FR', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
          </p>
        </div>
        <button onClick={onNouveau} style={{ background: C.green, color: '#fff', border: 'none',
          borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 7 }}>
          <IPlus t={15}/> Nouvelle NC
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))',
        gap: 12, marginBottom: 24 }}>
        <CarteKPI icone={<IFiche   t={22}/>} valeur={loading ? '…' : stats.total}        label="Total NC"      couleur={C.bleu}   fond={C.bleuBg} />
        <CarteKPI icone={<IAlerte  t={22}/>} valeur={loading ? '…' : stats.ouvertes}     label="Ouvertes"      couleur={C.rouge}  fond={C.rougeBg} />
        <CarteKPI icone={<IHorloge t={22}/>} valeur={loading ? '…' : stats.enCours}      label="En cours"      couleur={C.orange} fond={C.orangeBg} />
        <CarteKPI icone={<IEclair  t={22}/>} valeur={loading ? '…' : stats.critiques}    label="Critiques"     couleur={C.rouge}  fond={C.rougeBg} />
        <CarteKPI icone={<ICheck   t={22}/>} valeur={loading ? '…' : stats.cloturees}    label="Clôturées"     couleur={C.green}  fond={C.greenBg} />
        <CarteKPI icone={<ICircuit t={22}/>} valeur={loading ? '…' : `${tauxCloture}%`} label="Taux clôture"  couleur={C.green}  fond={C.greenBg} />
      </div>

      {/* Répartition criticité — pleine largeur */}
      <Carte titre="Répartition par criticité" icone={<IEclair t={16}/>}>
        {loading
          ? <p style={{ color: C.texteDoux, fontSize: 13 }}>Chargement…</p>
          : ncs.length === 0
          ? <p style={{ color: C.texteFaible, fontSize: 13 }}>Aucune NC enregistrée.</p>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {CRITICITES.map(({ v, l, c, bg }) => {
                const n   = ncs.filter(nc => nc.criticite === v).length;
                const pct = ncs.length ? Math.round((n / ncs.length) * 100) : 0;
                return (
                  <div key={v} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ background: bg, color: c, padding: '3px 12px',
                      borderRadius: 10, fontSize: 12, fontWeight: 700,
                      minWidth: 80, textAlign: 'center', flexShrink: 0 }}>{l}</span>
                    <div style={{ flex: 1, height: 16, background: C.bgVoile,
                      borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: c,
                        borderRadius: 8, transition: 'width .5s ease',
                        minWidth: pct > 0 ? 28 : 0 }} />
                    </div>
                    <span style={{ minWidth: 80, textAlign: 'right', fontSize: 13,
                      fontFamily: C.policeMono, color: C.texte, fontWeight: 600 }}>
                      {n} <span style={{ color: C.texteFaible, fontWeight: 400 }}>({pct}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
        }
      </Carte>

      {/* Statuts + Services */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, marginTop: 18, marginBottom: 18 }}>

        <Carte titre="Répartition par statut" icone={<ICircuit t={16}/>}>
          {loading
            ? <p style={{ color: C.texteDoux, fontSize: 13 }}>Chargement…</p>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {STATUTS.map(({ v, l, c }) => {
                  const n   = ncs.filter(nc => nc.statut === v).length;
                  const pct = ncs.length ? Math.round((n / ncs.length) * 100) : 0;
                  return (
                    <div key={v}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                        <span style={{ background: `${c}22`, color: c, padding: '2px 9px',
                          borderRadius: 10, fontSize: 12, fontWeight: 600 }}>{l}</span>
                        <span style={{ color: C.texteDoux, fontFamily: C.policeMono, fontSize: 12 }}>{n} ({pct}%)</span>
                      </div>
                      <div style={{ height: 8, background: C.bgVoile, borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: c,
                          borderRadius: 4, transition: 'width .4s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </Carte>

        <Carte titre="NC par service" icone={<IService t={16}/>}>
          {loading
            ? <p style={{ color: C.texteDoux, fontSize: 13 }}>Chargement…</p>
            : topServices.length === 0
            ? <p style={{ color: C.texteFaible, fontSize: 13 }}>Aucune donnée.</p>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {topServices.map(([service, count], i) => {
                  const pct    = ncs.length ? Math.round((count / ncs.length) * 100) : 0;
                  const colors = [C.bleu, C.green, C.orange, C.rouge, C.gris];
                  const c      = colors[i % colors.length];
                  return (
                    <div key={service}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                        <span style={{ color: C.texte, fontWeight: 600,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                          {service}
                        </span>
                        <span style={{ color: C.texteDoux, fontFamily: C.policeMono, fontSize: 12, flexShrink: 0 }}>
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div style={{ height: 8, background: C.bgVoile, borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: c,
                          borderRadius: 4, transition: 'width .4s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </Carte>
      </div>

      {/* Dernières NC — pleine largeur */}
      <Carte titre="Dernières non-conformités" icone={<IFiche t={16}/>}>
        {loading
          ? <p style={{ color: C.texteDoux, fontSize: 13 }}>Chargement…</p>
          : ncs.length === 0
          ? <div style={{ padding: '40px 0', textAlign: 'center', color: C.texteFaible }}>
              <div style={{ color: C.borderFort, display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                <IFiche t={40}/>
              </div>
              <div style={{ fontWeight: 600, color: C.texte, marginBottom: 4 }}>Aucune NC enregistrée</div>
              <div style={{ fontSize: 13 }}>Créez votre première fiche de non-conformité.</div>
            </div>
          : <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Numéro', 'Intitulé', 'Service', 'Criticité', 'Statut', 'Émetteur', 'Date'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '9px 12px', fontSize: 12,
                          color: C.texteDoux, borderBottom: `2px solid ${C.border}`,
                          fontWeight: 600, background: C.surfaceAlt, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ncs.slice(0, 12).map((nc, i) => (
                      <tr key={nc.id} onClick={() => onOuvrir(nc.id)}
                        style={{ cursor: 'pointer', transition: 'background .12s',
                          background: i % 2 === 0 ? '#fff' : C.surfaceAlt }}
                        onMouseEnter={e => e.currentTarget.style.background = C.greenBg}
                        onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : C.surfaceAlt}>
                        <td style={TD}>
                          <span style={{ fontFamily: C.policeMono, color: C.green, fontWeight: 700, fontSize: 12 }}>
                            {nc.numero || nc.id}
                          </span>
                        </td>
                        <td style={{ ...TD, maxWidth: 240 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {nc.intitule || nc.titre || '—'}
                          </div>
                        </td>
                        <td style={{ ...TD, color: C.texteDoux, fontSize: 12 }}>
                          {nc.service || '—'}
                        </td>
                        <td style={TD}><BadgeCriticite criticite={nc.criticite}/></td>
                        <td style={TD}><BadgeStatut    statut={nc.statut}/></td>
                        <td style={{ ...TD, color: C.texteDoux, fontSize: 12 }}>
                          {nc.emetteur || '—'}
                        </td>
                        <td style={{ ...TD, color: C.texteFaible, fontSize: 11, fontFamily: C.policeMono, whiteSpace: 'nowrap' }}>
                          {nc.creeLe ? new Date(nc.creeLe).toLocaleDateString('fr-FR') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {ncs.length > 12 && (
                <div style={{ textAlign: 'center', paddingTop: 14,
                  borderTop: `1px solid ${C.border}`, marginTop: 4 }}>
                  <span style={{ color: C.green, fontSize: 13, fontWeight: 600 }}>
                    + {ncs.length - 12} NC supplémentaires — consultez la liste complète
                  </span>
                </div>
              )}
            </>
        }
      </Carte>
    </div>
  );
}

const TD = { padding: '10px 12px', borderBottom: `1px solid ${C.border}`, verticalAlign: 'middle', fontSize: 13 };