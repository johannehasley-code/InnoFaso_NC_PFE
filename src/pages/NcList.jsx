// src/pages/NcList.jsx
import { useState, useEffect, useMemo } from 'react';
import { C } from '../lib/theme.js';
import { api } from '../lib/api.js';
import { Carte, Btn, BadgeStatut, BadgeCriticite } from '../components/ui.jsx';
import { IFiche, IPlus, IRecherche, IRetour } from '../components/Icones.jsx';

// --- Icônes locales (pas présentes dans Icones.jsx) -------------------------
function IColonne({ t = 15 }) {
  return (
    <svg width={t} height={t} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  );
}
function ICroix({ t = 12 }) {
  return (
    <svg width={t} height={t} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// --- Colonnes fixes provenant directement de la fiche NC -------------------
// `get` lit la valeur depuis l'objet nc renvoyé par l'API (champs racine).
const COLONNES_FIXES_DISPONIBLES = [
  { cle: 'quantiteAnomalie', label: 'Qté en anomalie', get: (nc) => nc.quantiteAnomalie || '—' },
  { cle: 'actionCorrective', label: 'Action corrective', get: (nc) => {
      const actions = nc.capa?.actions || [];
      if (!actions.length) return '—';
      return actions.map((a) => a.libelle).filter(Boolean).join(', ') || '—';
    } },
  { cle: 'fournisseur', label: 'Fournisseur', get: (nc) => nc.fournisseur || '—' },
  { cle: 'typeObjetCol', label: "Type d'objet", get: (nc) => (nc.typeObjet || []).join(', ') || '—' },
  { cle: 'classificationCol', label: 'Classification', get: (nc) => nc.classification || '—' },
];

// Colonnes affichées par défaut parmi les colonnes fixes disponibles ci-dessus.
const COLONNES_FIXES_PAR_DEFAUT = ['quantiteAnomalie', 'actionCorrective', 'fournisseur', 'typeObjetCol', 'classificationCol'];

export default function NcList({ onOuvrir, onNouveau }) {
  const [ncs,     setNcs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ statut: '', criticite: '' });

  // --- Colonnes personnalisées (persistées en base) -------------------------
  const [colonnesPerso, setColonnesPerso]   = useState([]);
  const [loadingColonnes, setLoadingColonnes] = useState(true);
  const [panneauColonnes, setPanneauColonnes] = useState(false);
  const [nouvelleColonne, setNouvelleColonne] = useState({ libelle: '', type: 'texte' });
  const [enCoursAjout, setEnCoursAjout] = useState(false);
  const [erreurColonne, setErreurColonne] = useState('');

  // Colonnes fixes activées/désactivées par l'utilisateur (préférence locale,
  // n'affecte que l'affichage — pas de stockage serveur nécessaire ici).
  const [colonnesFixesActives, setColonnesFixesActives] = useState(COLONNES_FIXES_PAR_DEFAUT);

  // --- Édition inline d'une valeur de colonne perso --------------------------
  const [editionCellule, setEditionCellule] = useState(null); // { ncId, cle } | null
  const [valeurEnEdition, setValeurEnEdition] = useState('');
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const data = await api.listerNc(); setNcs(data); }
    catch { setNcs([]); }
    finally { setLoading(false); }
  };

  const chargerColonnesPerso = async () => {
    setLoadingColonnes(true);
    try { const data = await api.listerColonnesPerso(); setColonnesPerso(data); }
    catch { setColonnesPerso([]); }
    finally { setLoadingColonnes(false); }
  };

  useEffect(() => { load(); chargerColonnesPerso(); }, []);

  const ncsFiltrees = useMemo(() => ncs.filter(nc =>
    (!filters.statut    || nc.statut    === filters.statut) &&
    (!filters.criticite || nc.criticite === filters.criticite)
  ), [ncs, filters]);

  const toggleColonneFixe = (cle) => {
    setColonnesFixesActives((prev) =>
      prev.includes(cle) ? prev.filter((c) => c !== cle) : [...prev, cle]);
  };

  const ajouterColonne = async () => {
    setErreurColonne('');
    if (!nouvelleColonne.libelle.trim()) {
      setErreurColonne('Le libellé est requis.');
      return;
    }
    setEnCoursAjout(true);
    try {
      await api.creerColonnePerso({ libelle: nouvelleColonne.libelle.trim(), type: nouvelleColonne.type });
      setNouvelleColonne({ libelle: '', type: 'texte' });
      await chargerColonnesPerso();
    } catch (e) {
      setErreurColonne(e.message || "Erreur lors de l'ajout de la colonne.");
    } finally {
      setEnCoursAjout(false);
    }
  };

  const supprimerColonne = async (col) => {
    if (!confirm(`Supprimer la colonne "${col.libelle}" ? Les valeurs déjà saisies seront perdues pour toutes les fiches.`)) return;
    try {
      await api.supprimerColonnePerso(col.id);
      await chargerColonnesPerso();
    } catch (e) {
      alert(e.message || 'Erreur lors de la suppression.');
    }
  };

  const ouvrirEdition = (nc, col) => {
    setEditionCellule({ ncId: nc.id, cle: col.cle });
    setValeurEnEdition(nc.valeursPerso?.[col.cle] ?? '');
  };

  const annulerEdition = () => {
    setEditionCellule(null);
    setValeurEnEdition('');
  };

  const enregistrerValeur = async (nc, col) => {
    setEnregistrementEnCours(true);
    try {
      const valeursActuelles = nc.valeursPerso || {};
      const nouvellesValeurs = { ...valeursActuelles, [col.cle]: valeurEnEdition };
      const ncMaj = await api.majValeursPerso(nc.id, nouvellesValeurs);
      setNcs((prev) => prev.map((n) => (n.id === nc.id ? { ...n, valeursPerso: ncMaj.valeursPerso } : n)));
      setEditionCellule(null);
      setValeurEnEdition('');
    } catch (e) {
      alert(e.message || "Erreur lors de l'enregistrement de la valeur.");
    } finally {
      setEnregistrementEnCours(false);
    }
  };

  const colonnesFixesAffichees = COLONNES_FIXES_DISPONIBLES.filter((c) => colonnesFixesActives.includes(c.cle));

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', padding: 'clamp(20px,4vw,32px) clamp(16px,4vw,40px)' }}>

      <Carte
        titre="Non-Conformités"
        icone={<IFiche t={16}/>}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="ghost" onClick={() => setPanneauColonnes((o) => !o)}>
              <IColonne t={15}/> Colonnes
            </Btn>
            <Btn variant="primary" onClick={onNouveau}>
              <IPlus t={15}/> Nouvelle NC
            </Btn>
          </div>
        }
      >
        {/* Panneau de gestion des colonnes */}
        {panneauColonnes && (
          <div style={{
            border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 18px',
            marginBottom: 18, background: C.surfaceAlt,
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22 }}>

              {/* Colonnes fixes (à cocher/décocher) */}
              <div style={{ flex: '1 1 260px' }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.texte, marginBottom: 9 }}>
                  Colonnes issues de la fiche NC
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {COLONNES_FIXES_DISPONIBLES.map((c) => (
                    <label key={c.cle} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: C.texteDoux }}>
                      <input
                        type="checkbox"
                        checked={colonnesFixesActives.includes(c.cle)}
                        onChange={() => toggleColonneFixe(c.cle)}
                        style={{ accentColor: C.green, width: 15, height: 15 }}
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Colonnes personnalisées (liste + suppression + ajout) */}
              <div style={{ flex: '1 1 320px' }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.texte, marginBottom: 9 }}>
                  Colonnes personnalisées
                </div>

                {loadingColonnes ? (
                  <div style={{ fontSize: 12.5, color: C.texteFaible }}>Chargement…</div>
                ) : colonnesPerso.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: C.texteFaible, marginBottom: 10 }}>
                    Aucune colonne personnalisée pour l'instant.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                    {colonnesPerso.map((col) => (
                      <div key={col.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: '#fff', border: `1px solid ${C.border}`, borderRadius: 7,
                        padding: '6px 10px', fontSize: 12.5,
                      }}>
                        <span style={{ color: C.texte, fontWeight: 600 }}>{col.libelle}</span>
                        <button
                          onClick={() => supprimerColonne(col)}
                          title="Supprimer cette colonne"
                          style={{
                            background: C.rougeBg, border: '1px solid #f0cfcc', color: C.rouge,
                            borderRadius: 6, padding: '3px 6px', cursor: 'pointer', display: 'flex',
                          }}
                        >
                          <ICroix t={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Formulaire d'ajout */}
                <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <input
                    value={nouvelleColonne.libelle}
                    onChange={(e) => setNouvelleColonne((s) => ({ ...s, libelle: e.target.value }))}
                    placeholder="Nom de la nouvelle colonne…"
                    style={{
                      flex: '1 1 160px', padding: '7px 10px', border: `1px solid ${C.borderFort}`,
                      borderRadius: 7, fontSize: 13, fontFamily: C.police,
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && ajouterColonne()}
                  />
                  <select
                    value={nouvelleColonne.type}
                    onChange={(e) => setNouvelleColonne((s) => ({ ...s, type: e.target.value }))}
                    style={{ padding: '7px 10px', border: `1px solid ${C.borderFort}`, borderRadius: 7, fontSize: 13, fontFamily: C.police, background: '#fff' }}
                  >
                    <option value="texte">Texte</option>
                    <option value="nombre">Nombre</option>
                    <option value="date">Date</option>
                  </select>
                  <Btn variant="primary" disabled={enCoursAjout} onClick={ajouterColonne}>
                    <IPlus t={14}/> {enCoursAjout ? 'Ajout…' : 'Ajouter'}
                  </Btn>
                </div>
                {erreurColonne && (
                  <div style={{ fontSize: 12, color: C.rouge, marginTop: 7 }}>{erreurColonne}</div>
                )}
                <div style={{ fontSize: 11.5, color: C.texteFaible, marginTop: 8, lineHeight: 1.5 }}>
                  Les colonnes personnalisées sont visibles par tous les utilisateurs et persistées en base de données.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filtres */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: C.texteDoux, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <IRecherche t={15}/> Filtrer :
          </span>
          {[
            { k: 'statut',    opts: ['', 'brouillon', 'ouverte', 'en_cours', 'cloturee'], label: 'Statut' },
            { k: 'criticite', opts: ['', 'faible', 'moyenne', 'elevee', 'critique'],      label: 'Criticité' },
          ].map(f => (
            <select key={f.k} value={filters[f.k]}
              onChange={e => setFilters({ ...filters, [f.k]: e.target.value })}
              style={{ padding: '7px 12px', border: `1px solid ${C.borderFort}`, borderRadius: 8,
                fontSize: 13, fontFamily: C.police, color: C.texte, background: '#fff', cursor: 'pointer' }}>
              {f.opts.map(o => <option key={o} value={o}>{o || `Tous (${f.label})`}</option>)}
            </select>
          ))}
          <Btn variant="ghost" onClick={load}><IRecherche t={14}/> Actualiser</Btn>
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
                    {['Numéro NC', 'Intitulé', 'Service', 'Criticité', 'Statut', 'Émetteur', 'Date',
                      ...colonnesFixesAffichees.map((c) => c.label),
                      ...colonnesPerso.map((c) => c.libelle),
                      ''].map((h, idx) => (
                      <th key={`${h}_${idx}`} style={{ textAlign: 'left', padding: '9px 12px', fontSize: 12,
                        color: C.texteDoux, borderBottom: `2px solid ${C.border}`, fontWeight: 600,
                        background: C.surfaceAlt, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ncsFiltrees.map((nc, i) => (
                    <tr key={nc.id}
                      style={{ background: i % 2 === 0 ? '#fff' : C.surfaceAlt, transition: 'background .12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = C.greenBg}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : C.surfaceAlt}>
                      <td style={TD}>
                        <span style={{ fontFamily: C.policeMono, color: C.green, fontWeight: 700, fontSize: 13 }}>
                          {nc.numero || '—'}
                        </span>
                      </td>
                      <td style={{ ...TD, maxWidth: 220 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
                          {nc.intitule || nc.titre || '—'}
                        </div>
                      </td>
                      <td style={{ ...TD, color: C.texteDoux }}>{nc.service || '—'}</td>
                      <td style={TD}><BadgeCriticite criticite={nc.criticite} /></td>
                      <td style={TD}><BadgeStatut statut={nc.statut} /></td>
                      <td style={{ ...TD, color: C.texteDoux, fontSize: 12 }}>{nc.emetteur || '—'}</td>
                      <td style={{ ...TD, color: C.texteFaible, fontSize: 12, fontFamily: C.policeMono }}>
                        {nc.creeLe ? new Date(nc.creeLe).toLocaleDateString('fr-FR') : '—'}
                      </td>

                      {/* Colonnes fixes issues de la fiche NC (lecture seule) */}
                      {colonnesFixesAffichees.map((col) => (
                        <td key={col.cle} style={{ ...TD, maxWidth: 200 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12.5, color: C.texteDoux }}>
                            {col.get(nc)}
                          </div>
                        </td>
                      ))}

                      {/* Colonnes personnalisées (édition inline) */}
                      {colonnesPerso.map((col) => {
                        const enEdition = editionCellule?.ncId === nc.id && editionCellule?.cle === col.cle;
                        const valeur = nc.valeursPerso?.[col.cle];
                        return (
                          <td key={col.id} style={{ ...TD, minWidth: 120 }}>
                            {enEdition ? (
                              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                                <input
                                  autoFocus
                                  type={col.type === 'nombre' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                                  value={valeurEnEdition}
                                  onChange={(e) => setValeurEnEdition(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') enregistrerValeur(nc, col);
                                    if (e.key === 'Escape') annulerEdition();
                                  }}
                                  style={{
                                    width: 100, padding: '4px 7px', fontSize: 12.5,
                                    border: `1px solid ${C.green}`, borderRadius: 6, fontFamily: C.police,
                                  }}
                                />
                                <button
                                  disabled={enregistrementEnCours}
                                  onClick={() => enregistrerValeur(nc, col)}
                                  style={{ background: C.greenBg, border: `1px solid ${C.greenBord}`, color: C.greenFonce, borderRadius: 6, padding: '4px 7px', cursor: 'pointer', fontSize: 11 }}
                                >✓</button>
                                <button
                                  onClick={annulerEdition}
                                  style={{ background: C.rougeBg, border: '1px solid #f0cfcc', color: C.rouge, borderRadius: 6, padding: '4px 7px', cursor: 'pointer', fontSize: 11 }}
                                >✕</button>
                              </div>
                            ) : (
                              <div
                                onClick={() => ouvrirEdition(nc, col)}
                                title="Cliquer pour modifier"
                                style={{
                                  fontSize: 12.5, color: valeur ? C.texte : C.texteFaible,
                                  cursor: 'pointer', padding: '3px 6px', borderRadius: 6,
                                  minHeight: 18, border: '1px dashed transparent',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.border = `1px dashed ${C.borderFort}`; e.currentTarget.style.background = '#fff'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.border = '1px dashed transparent'; e.currentTarget.style.background = 'transparent'; }}
                              >
                                {valeur || '— cliquer pour saisir —'}
                              </div>
                            )}
                          </td>
                        );
                      })}

                      <td style={TD}>
                        <Btn variant="ghost" onClick={() => onOuvrir(nc.id)}>
                          <IRetour t={13}/> Ouvrir
                        </Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </Carte>
    </div>
  );
}

const TD = { padding: '10px 12px', borderBottom: `1px solid ${C.border}`, verticalAlign: 'middle' };