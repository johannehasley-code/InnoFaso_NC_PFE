// // src/pages/NcList.jsx
// import { useState, useEffect } from 'react';
// import { C } from '../lib/theme.js';
// import { api } from '../lib/api.js';
// import { Carte, Btn, BadgeStatut, BadgeCriticite } from '../components/ui.jsx';
// import { IFiche, IPlus, IRecherche, IRetour } from '../components/Icones.jsx';

// export default function NcList({ onOuvrir, onNouveau }) {
//   const [ncs,     setNcs]     = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [filters, setFilters] = useState({ statut: '', criticite: '' });

//   const load = async () => {
//     setLoading(true);
//     try { const data = await api.listerNc(); setNcs(data); }
//     catch { setNcs([]); }
//     finally { setLoading(false); }
//   };

//   useEffect(() => { load(); }, []);

//   const ncsFiltrees = ncs.filter(nc =>
//     (!filters.statut    || nc.statut    === filters.statut) &&
//     (!filters.criticite || nc.criticite === filters.criticite)
//   );

//   return (
//     <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(20px,4vw,32px) clamp(16px,4vw,40px)' }}>

//       <Carte
//         titre="Non-Conformités"
//         icone={<IFiche t={16}/>}
//         action={
//           <Btn variant="primary" onClick={onNouveau}>
//             <IPlus t={15}/> Nouvelle NC
//           </Btn>
//         }
//       >
//         {/* Filtres */}
//         <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
//           <span style={{ color: C.texteDoux, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
//             <IRecherche t={15}/> Filtrer :
//           </span>
//           {[
//             { k: 'statut',    opts: ['', 'brouillon', 'ouverte', 'en_cours', 'cloturee'], label: 'Statut' },
//             { k: 'criticite', opts: ['', 'faible', 'moyenne', 'elevee', 'critique'],      label: 'Criticité' },
//           ].map(f => (
//             <select key={f.k} value={filters[f.k]}
//               onChange={e => setFilters({ ...filters, [f.k]: e.target.value })}
//               style={{ padding: '7px 12px', border: `1px solid ${C.borderFort}`, borderRadius: 8,
//                 fontSize: 13, fontFamily: C.police, color: C.texte, background: '#fff', cursor: 'pointer' }}>
//               {f.opts.map(o => <option key={o} value={o}>{o || `Tous (${f.label})`}</option>)}
//             </select>
//           ))}
//           <Btn variant="ghost" onClick={load}><IRecherche t={14}/> Actualiser</Btn>
//           <span style={{ marginLeft: 'auto', fontSize: 13, color: C.texteDoux, fontFamily: C.policeMono }}>
//             {ncsFiltrees.length} résultat(s)
//           </span>
//         </div>


//         {loading
//           ? <div style={{ padding: '32px 0', textAlign: 'center', color: C.texteDoux }}>Chargement…</div>
//           : ncsFiltrees.length === 0
//           ? <div style={{ padding: '40px 0', textAlign: 'center', color: C.texteFaible }}>
//               <div style={{ color: C.borderFort, display: 'flex', justifyContent: 'center', marginBottom: 10 }}><IFiche t={40}/></div>
//               <div style={{ fontWeight: 600, color: C.texte, marginBottom: 4 }}>Aucune NC trouvée</div>
//               <div style={{ fontSize: 13 }}>Modifiez les filtres ou créez une nouvelle fiche.</div>
//             </div>
//           : <div style={{ overflowX: 'auto' }}>
//               <table style={{ width: '100%', borderCollapse: 'collapse' }}>
//                 <thead>
//                   <tr>
//                     {['Numéro NC', 'Intitulé', 'Service', 'Criticité', 'Statut', 'Émetteur', 'Date', ''].map(h => (
//                       <th key={h} style={{ textAlign: 'left', padding: '9px 12px', fontSize: 12,
//                         color: C.texteDoux, borderBottom: `2px solid ${C.border}`, fontWeight: 600,
//                         background: C.surfaceAlt, whiteSpace: 'nowrap' }}>{h}</th>
//                     ))}
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {ncsFiltrees.map((nc, i) => (
//                     <tr key={nc.id}
//                       style={{ background: i % 2 === 0 ? '#fff' : C.surfaceAlt, transition: 'background .12s', cursor: 'pointer' }}
//                       onMouseEnter={e => e.currentTarget.style.background = C.greenBg}
//                       onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : C.surfaceAlt}>
//                       <td style={TD}>
//                         <span style={{ fontFamily: C.policeMono, color: C.green, fontWeight: 700, fontSize: 13 }}>
//                           {nc.numero || '—'}
//                         </span>
//                       </td>
//                       <td style={{ ...TD, maxWidth: 220 }}>
//                         <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
//                           {nc.intitule || nc.titre || '—'}
//                         </div>
//                       </td>
//                       <td style={{ ...TD, color: C.texteDoux }}>{nc.service || '—'}</td>
//                       <td style={TD}><BadgeCriticite criticite={nc.criticite} /></td>
//                       <td style={TD}><BadgeStatut statut={nc.statut} /></td>
//                       <td style={{ ...TD, color: C.texteDoux, fontSize: 12 }}>{nc.emetteur || '—'}</td>
//                       <td style={{ ...TD, color: C.texteFaible, fontSize: 12, fontFamily: C.policeMono }}>
//                         {nc.creeLe ? new Date(nc.creeLe).toLocaleDateString('fr-FR') : '—'}
//                       </td>
//                       <td style={TD}>
//                         <Btn variant="ghost" onClick={() => onOuvrir(nc.id)}>
//                           <IRetour t={13}/> Ouvrir
//                         </Btn>
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

// const TD = { padding: '10px 12px', borderBottom: `1px solid ${C.border}`, verticalAlign: 'middle' };

// src/pages/NcList.jsx
import { useState, useEffect, useMemo, Fragment } from 'react';
import { C } from '../lib/theme.js';
import { api } from '../lib/api.js';
import { Carte, Btn, BadgeStatut, BadgeCriticite } from '../components/ui.jsx';
import { IFiche, IPlus, IRecherche, IRetour, IFleche, IDoc5M, IEnvoi, ICheck } from '../components/Icones.jsx';

// --- Colonnes disponibles ----------------------------------------------------
// `cle` doit correspondre à une entrée du tableau `valeur(nc)` plus bas.
const COLONNES = [
  { cle: 'numero',      label: 'Numéro NC',  parDefaut: true },
  { cle: 'intitule',    label: 'Intitulé',   parDefaut: true },
  { cle: 'service',     label: 'Service',    parDefaut: true },
  { cle: 'criticite',   label: 'Criticité',  parDefaut: true },
  { cle: 'statut',      label: 'Statut',     parDefaut: true },
  { cle: 'emetteur',    label: 'Émetteur',   parDefaut: true },
  { cle: 'date',        label: 'Date',       parDefaut: true },
  { cle: 'sousType',    label: 'Sous-type produit / service', parDefaut: false },
  { cle: 'fournisseur', label: 'Fournisseur / Fabricant',      parDefaut: false },
  { cle: 'lotInterne',  label: 'N° lot interne',                parDefaut: false },
  { cle: 'pilote',      label: 'Pilote assigné',                parDefaut: false },
  { cle: 'capa',        label: 'Actions CAPA',                  parDefaut: false },
  { cle: 'efficacite',  label: 'Efficacité',                    parDefaut: false },
  { cle: 'refDocument', label: 'Réf. document',                 parDefaut: false },
];

const CLE_STOCKAGE = 'innofaso_nclist_colonnes';
const CLE_STOCKAGE_PERSO = 'innofaso_nclist_colonnes_perso';
const CLE_STOCKAGE_VALEURS_PERSO = 'innofaso_nclist_valeurs_perso';

function colonnesParDefaut() {
  return COLONNES.filter((c) => c.parDefaut).map((c) => c.cle);
}

function chargerColonnesPerso() {
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE_PERSO);
    const parsed = brut ? JSON.parse(brut) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function chargerValeursPerso() {
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE_VALEURS_PERSO);
    return brut ? JSON.parse(brut) : {};
  } catch {
    return {};
  }
}

function chargerColonnesVisibles() {
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE);
    if (!brut) return colonnesParDefaut();
    const parsed = JSON.parse(brut);
    return Array.isArray(parsed) && parsed.length ? parsed : colonnesParDefaut();
  } catch {
    return colonnesParDefaut();
  }
}

const SOUS_TYPE_LABEL = {
  produit_fini_semi_fini: 'Produit Fini & Semi Fini',
  matiere_premiere: 'Matière Première',
  emballage: 'Emballage',
  service: 'Service',
  autre: 'Autre',
};

export default function NcList({ onOuvrir, onNouveau }) {
  const [ncs, setNcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ statut: '', criticite: '' });
  const [colonnesVisibles, setColonnesVisibles] = useState(chargerColonnesVisibles());
  const [colonnesPerso, setColonnesPerso] = useState(chargerColonnesPerso());
  const [valeursPerso, setValeursPerso] = useState(chargerValeursPerso());
  const [menuColonnesOuvert, setMenuColonnesOuvert] = useState(false);
  const [ligneOuverte, setLigneOuverte] = useState(null);
  const [nouvelleColonneLabel, setNouvelleColonneLabel] = useState('');

  const load = async () => {
    setLoading(true);
    try { const data = await api.listerNc(); setNcs(data); }
    catch { setNcs([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(colonnesVisibles));
  }, [colonnesVisibles]);

  useEffect(() => {
    localStorage.setItem(CLE_STOCKAGE_PERSO, JSON.stringify(colonnesPerso));
  }, [colonnesPerso]);

  useEffect(() => {
    localStorage.setItem(CLE_STOCKAGE_VALEURS_PERSO, JSON.stringify(valeursPerso));
  }, [valeursPerso]);

  const basculerColonne = (cle) => {
    setColonnesVisibles((prev) =>
      prev.includes(cle) ? prev.filter((c) => c !== cle) : [...prev, cle]);
  };

  const ajouterColonnePerso = () => {
    const label = nouvelleColonneLabel.trim();
    if (!label) return;
    const cle = `perso_${Date.now()}`;
    setColonnesPerso((prev) => [...prev, { cle, label }]);
    setColonnesVisibles((prev) => [...prev, cle]);
    setNouvelleColonneLabel('');
  };

  const retirerColonnePerso = (cle) => {
    setColonnesPerso((prev) => prev.filter((c) => c.cle !== cle));
    setColonnesVisibles((prev) => prev.filter((c) => c !== cle));
    setValeursPerso((prev) => {
      const copie = { ...prev };
      delete copie[cle];
      return copie;
    });
  };

  const definirValeurPerso = (ncId, cle, val) => {
    setValeursPerso((prev) => ({
      ...prev,
      [ncId]: { ...(prev[ncId] || {}), [cle]: val },
    }));
  };

  const ncsFiltrees = useMemo(() => ncs.filter((nc) =>
    (!filters.statut    || nc.statut    === filters.statut) &&
    (!filters.criticite || nc.criticite === filters.criticite)
  ), [ncs, filters]);

  // Calcule la valeur affichable d'une colonne pour une NC donnée.
  const valeur = (nc, cle) => {
    switch (cle) {
      case 'numero':
        return <span style={{ fontFamily: C.policeMono, color: C.green, fontWeight: 700, fontSize: 13 }}>{nc.numero || '—'}</span>;
      case 'intitule':
        return <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, maxWidth: 220 }}>{nc.intitule || nc.titre || '—'}</div>;
      case 'service':
        return <span style={{ color: C.texteDoux }}>{nc.service || '—'}</span>;
      case 'criticite':
        return <BadgeCriticite criticite={nc.criticite} />;
      case 'statut':
        return <BadgeStatut statut={nc.statut} />;
      case 'emetteur':
        return <span style={{ color: C.texteDoux, fontSize: 12 }}>{nc.emetteur || '—'}</span>;
      case 'date':
        return <span style={{ color: C.texteFaible, fontSize: 12, fontFamily: C.policeMono }}>{nc.creeLe ? new Date(nc.creeLe).toLocaleDateString('fr-FR') : '—'}</span>;
      case 'sousType':
        return <span style={{ color: C.texteDoux, fontSize: 12.5 }}>{SOUS_TYPE_LABEL[nc.sousType] || nc.sousType || '—'}</span>;
      case 'fournisseur':
        return <span style={{ color: C.texteDoux, fontSize: 12.5 }}>{nc.fournisseur || '—'}</span>;
      case 'lotInterne':
        return <span style={{ color: C.texteDoux, fontSize: 12.5, fontFamily: C.policeMono }}>{nc.lotInterne || '—'}</span>;
      case 'pilote':
        return <span style={{ color: C.texteDoux, fontSize: 12.5 }}>{nc.assigneA?.nom || '—'}</span>;
      case 'capa':
        return <span style={{ color: C.texteDoux, fontSize: 12.5 }}>{nc.capa?.actions?.length ? `${nc.capa.actions.length} action(s)` : '—'}</span>;
      case 'efficacite':
        return <span style={{ color: nc.cloture?.efficacite === 'Efficace' ? C.greenFonce : nc.cloture?.efficacite === 'Inefficace' ? C.rouge : C.texteFaible, fontSize: 12.5, fontWeight: 600 }}>{nc.cloture?.efficacite || '—'}</span>;
      case 'refDocument':
        return <span style={{ color: C.texteFaible, fontSize: 11.5, fontFamily: C.policeMono }}>{nc.refDocument || '—'}</span>;
      default:
        if (cle.startsWith('perso_')) {
          return (
            <input
              value={valeursPerso[nc.id]?.[cle] || ''}
              onChange={(e) => definirValeurPerso(nc.id, cle, e.target.value)}
              placeholder="—"
              style={{
                border: 'none', borderBottom: `1px dashed ${C.borderFort}`, background: 'transparent',
                fontSize: 12.5, color: C.texte, width: '100%', minWidth: 90, padding: '2px 0', outline: 'none',
              }}
              onFocus={(e) => { e.target.style.borderBottomColor = C.green; }}
              onBlur={(e) => { e.target.style.borderBottomColor = C.borderFort; }}
            />
          );
        }
        return '—';
    }
  };

  const toutesLesColonnes = [...COLONNES, ...colonnesPerso.map((c) => ({ ...c, parDefaut: false }))];
  const colonnesAffichees = toutesLesColonnes.filter((c) => colonnesVisibles.includes(c.cle));

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: 'clamp(20px,4vw,32px) clamp(16px,4vw,40px)' }}>

      <Carte
        titre="Non-Conformités"
        icone={<IFiche t={16}/>}
        action={
          <Btn variant="primary" onClick={onNouveau}>
            <IPlus t={15}/> Nouvelle NC
          </Btn>
        }
      >
        {/* Filtres + personnalisation des colonnes */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center', position: 'relative' }}>
          <span style={{ color: C.texteDoux, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <IRecherche t={15}/> Filtrer :
          </span>
          {[
            { k: 'statut',    opts: ['', 'ouverte', 'en_cours', 'cloturee'],            label: 'Statut' },
            { k: 'criticite', opts: ['', 'faible', 'moyenne', 'elevee', 'critique'],     label: 'Criticité' },
          ].map((f) => (
            <select key={f.k} value={filters[f.k]}
              onChange={(e) => setFilters({ ...filters, [f.k]: e.target.value })}
              style={{ padding: '7px 12px', border: `1px solid ${C.borderFort}`, borderRadius: 8,
                fontSize: 13, fontFamily: C.police, color: C.texte, background: '#fff', cursor: 'pointer' }}>
              {f.opts.map((o) => <option key={o} value={o}>{o || `Tous (${f.label})`}</option>)}
            </select>
          ))}
          <Btn variant="ghost" onClick={load}><IRecherche t={14}/> Actualiser</Btn>

          <div style={{ position: 'relative' }}>
            <Btn variant="ghost" onClick={() => setMenuColonnesOuvert((o) => !o)}>
              Colonnes ({colonnesAffichees.length}/{toutesLesColonnes.length})
            </Btn>
            {menuColonnesOuvert && (
              <div style={{
                position: 'absolute', top: '110%', left: 0, zIndex: 30, background: '#fff',
                border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: C.ombreFort,
                padding: 12, width: 280, maxHeight: 380, overflowY: 'auto',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.texteDoux, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.02em' }}>
                  Colonnes standard
                </div>
                {COLONNES.map((c) => (
                  <label key={c.cle} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, padding: '5px 2px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={colonnesVisibles.includes(c.cle)}
                      onChange={() => basculerColonne(c.cle)} style={{ accentColor: C.green }} />
                    {c.label}
                  </label>
                ))}

                <div style={{ fontSize: 12, fontWeight: 700, color: C.texteDoux, margin: '12px 0 8px', textTransform: 'uppercase', letterSpacing: '.02em' }}>
                  Colonnes personnalisées
                </div>
                {colonnesPerso.length === 0 && (
                  <div style={{ fontSize: 12, color: C.texteFaible, marginBottom: 8 }}>Aucune pour l'instant.</div>
                )}
                {colonnesPerso.map((c) => (
                  <div key={c.cle} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 2px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, cursor: 'pointer', flex: 1 }}>
                      <input type="checkbox" checked={colonnesVisibles.includes(c.cle)}
                        onChange={() => basculerColonne(c.cle)} style={{ accentColor: C.green }} />
                      {c.label}
                    </label>
                    <button onClick={() => retirerColonnePerso(c.cle)} title="Supprimer cette colonne"
                      style={{ background: 'none', border: 'none', color: C.rouge, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                      ✕
                    </button>
                  </div>
                ))}

                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <input
                    value={nouvelleColonneLabel}
                    onChange={(e) => setNouvelleColonneLabel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') ajouterColonnePerso(); }}
                    placeholder="Nom de la nouvelle colonne…"
                    style={{ flex: 1, fontSize: 12.5, padding: '6px 8px', border: `1px solid ${C.borderFort}`, borderRadius: 6 }}
                  />
                  <button onClick={ajouterColonnePerso} style={{
                    background: C.green, color: '#fff', border: 'none', borderRadius: 6,
                    padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}>
                    <IPlus t={12} />
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, gap: 8 }}>
                  <button onClick={() => setColonnesVisibles(toutesLesColonnes.map((c) => c.cle))}
                    style={{ fontSize: 11.5, color: C.green, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    Tout afficher
                  </button>
                  <button onClick={() => setColonnesVisibles(colonnesParDefaut())}
                    style={{ fontSize: 11.5, color: C.texteFaible, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    Réinitialiser
                  </button>
                </div>
              </div>
            )}
          </div>

          <span style={{ marginLeft: 'auto', fontSize: 13, color: C.texteDoux, fontFamily: C.policeMono }}>
            {ncsFiltrees.length} résultat(s)
          </span>
        </div>

        {loading
          ? <div style={{ padding: '32px 0', textAlign: 'center', color: C.texteDoux }}>Chargement…</div>
          : ncsFiltrees.length === 0
          ? <div style={{ padding: '40px 0', textAlign: 'center', color: C.texteFaible }}>
              <div style={{ color: C.borderFort, display: 'flex', justifyContent: 'center', marginBottom: 10 }}><IFiche t={40}/></div>
              <div style={{ fontWeight: 600, color: C.texte, marginBottom: 4 }}>Aucune NC trouvée</div>
              <div style={{ fontSize: 13 }}>Modifiez les filtres ou créez une nouvelle fiche.</div>
            </div>
          : <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...TH, width: 32 }}></th>
                    {colonnesAffichees.map((c) => (
                      <th key={c.cle} style={TH}>{c.label}</th>
                    ))}
                    <th style={TH}></th>
                  </tr>
                </thead>
                <tbody>
                  {ncsFiltrees.map((nc, i) => {
                    const ouverte = ligneOuverte === nc.id;
                    return (
                      <Fragment key={nc.id}>
                        <tr
                          style={{ background: i % 2 === 0 ? '#fff' : C.surfaceAlt, transition: 'background .12s', cursor: 'pointer' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = C.greenBg}
                          onMouseLeave={(e) => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : C.surfaceAlt}>
                          <td style={TD}>
                            <button onClick={() => setLigneOuverte(ouverte ? null : nc.id)} style={{
                              background: 'none', border: 'none', cursor: 'pointer', color: C.green,
                              display: 'flex', alignItems: 'center', transform: ouverte ? 'rotate(90deg)' : 'none',
                              transition: 'transform .15s',
                            }} title="Voir le détail">
                              <IFleche t={14} />
                            </button>
                          </td>
                          {colonnesAffichees.map((c) => (
                            <td key={c.cle} style={TD}>{valeur(nc, c.cle)}</td>
                          ))}
                          <td style={TD}>
                            <Btn variant="ghost" onClick={() => onOuvrir(nc.id)}>
                              <IRetour t={13}/> Ouvrir
                            </Btn>
                          </td>
                        </tr>
                        {ouverte && (
                          <tr>
                            <td colSpan={colonnesAffichees.length + 2} style={{ padding: 0, borderBottom: `1px solid ${C.border}` }}>
                              <DetailNc nc={nc} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
        }
      </Carte>
    </div>
  );
}

// --- Ligne dépliable : sections ajoutées à la fiche NC ----------------------
function DetailNc({ nc }) {
  const cinqM = nc.analyse?.cinqM || {};
  const pourquoiParM = nc.analyse?.pourquoiParM || {};
  const actions = nc.capa?.actions || [];

  return (
    <div style={{ background: C.surfaceAlt, padding: '18px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

      {/* Bloc identification / sous-type produit */}
      <div>
        <SousTitre icone={<IFiche t={14} />} texte="Identification & produit" />
        <Ligne label="Référence document" valeur={nc.refDocument} />
        <Ligne label="Sous-type" valeur={SOUS_TYPE_LABEL[nc.sousType] || nc.sousType} />
        <Ligne label="Nom produit / MP / emballage" valeur={nc.nomProduit} />
        <Ligne label="Fournisseur / Fabricant" valeur={nc.fournisseur} />
        <Ligne label="N° lot fournisseur" valeur={nc.lotFournisseur} />
        <Ligne label="N° lot interne" valeur={nc.lotInterne} />
        <Ligne label="Quantité reçue / produite" valeur={nc.quantiteRecue} />
        <Ligne label="Quantité en anomalie" valeur={nc.quantiteAnomalie} />
      </div>

      {/* Bloc 5M / 5 Pourquoi */}
      <div>
        <SousTitre icone={<IDoc5M t={14} />} texte="Analyse 5M — Pourquoi / Parce que" />
        {['mainOeuvre', 'methode', 'materiel', 'milieu', 'matiere'].map((m) => {
          const lignes = pourquoiParM[m] || [];
          const cause = cinqM[m];
          if (!cause && lignes.every((l) => !l.pourquoi && !l.parceque)) return null;
          return (
            <div key={m} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.texte, textTransform: 'capitalize' }}>{m}</div>
              {cause && <div style={{ fontSize: 12, color: C.texteDoux, marginBottom: 3 }}>{cause}</div>}
              {lignes.filter((l) => l.pourquoi || l.parceque).map((l, i) => (
                <div key={i} style={{ fontSize: 11.5, color: C.texteFaible, marginLeft: 8 }}>
                  <strong>Pourquoi :</strong> {l.pourquoi || '—'} &nbsp;<strong>Parce que :</strong> {l.parceque || '—'}
                </div>
              ))}
            </div>
          );
        })}
        {Object.values(cinqM).every((v) => !v) && <div style={{ fontSize: 12, color: C.texteFaible }}>Aucune analyse renseignée.</div>}
      </div>

      {/* Bloc CAPA */}
      <div>
        <SousTitre icone={<ICheck t={14} />} texte="Plan CAPA" />
        {actions.length === 0
          ? <div style={{ fontSize: 12, color: C.texteFaible }}>Aucune action corrective.</div>
          : actions.map((a, i) => (
            <div key={i} style={{ fontSize: 12, color: C.texteDoux, marginBottom: 6, padding: '6px 10px', background: '#fff', borderRadius: 6, border: `1px solid ${C.border}` }}>
              <strong>{a.libelle || 'Action'}</strong> — {a.responsable?.nom || '—'} — échéance {a.echeance || '—'} — <em>{a.statut}</em>
            </div>
          ))
        }
      </div>

      {/* Bloc clôture */}
      <div>
        <SousTitre icone={<ICheck t={14} />} texte="Clôture" />
        <Ligne label="Efficacité" valeur={nc.cloture?.efficacite} />
        <Ligne label="Preuves" valeur={nc.cloture?.preuves} />
        <Ligne label="Signature RQ" valeur={nc.cloture?.signatureRQ} />
        <Ligne label="Mise à jour SMI" valeur={nc.cloture?.majRisques} />
      </div>

      {/* Bloc transferts par email (basé sur les événements de la NC) */}
      <div style={{ gridColumn: '1 / -1' }}>
        <SousTitre icone={<IEnvoi t={14} />} texte="Transferts par email" />
        {(nc.evenements || []).filter((e) => e.motif === 'transfert_fiche').length === 0
          ? <div style={{ fontSize: 12, color: C.texteFaible }}>Aucun transfert effectué.</div>
          : (nc.evenements || []).filter((e) => e.motif === 'transfert_fiche').map((e, i) => (
            <div key={i} style={{ fontSize: 12, color: C.texteDoux }}>
              {e.le ? new Date(e.le).toLocaleString('fr-FR') : ''} — vers {e.to || e.destinataire || '—'}
            </div>
          ))
        }
      </div>
    </div>
  );
}

function SousTitre({ icone, texte }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
      <span style={{ color: C.green, display: 'flex' }}>{icone}</span>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: C.texte }}>{texte}</span>
    </div>
  );
}

function Ligne({ label, valeur }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 12.5, marginBottom: 5 }}>
      <span style={{ color: C.texteFaible, minWidth: 150, flexShrink: 0 }}>{label}</span>
      <span style={{ color: C.texte, fontWeight: 500 }}>{valeur || '—'}</span>
    </div>
  );
}

const TH = { textAlign: 'left', padding: '9px 12px', fontSize: 12,
  color: C.texteDoux, borderBottom: `2px solid ${C.border}`, fontWeight: 600,
  background: C.surfaceAlt, whiteSpace: 'nowrap' };
const TD = { padding: '10px 12px', borderBottom: `1px solid ${C.border}`, verticalAlign: 'middle' };