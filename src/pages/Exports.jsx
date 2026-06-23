// src/pages/Exports.jsx — F11 : Recherche | F15 : Rapport mensuel
import { useState, useEffect, useCallback } from 'react';
import { C } from '../lib/theme.js';
import { exportsAPI } from '../lib/api.js';
import { Carte, Btn, BadgeStatut, BadgeCriticite } from '../components/ui.jsx';
import { IRecherche, IEclair, ICalendrier, ICheck, IAlerte, IFiche, IEnregistrer } from '../components/Icones.jsx';

const downloadBlob = async (response, filename) => {
  const blob = await response.blob();
  const url  = window.URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  a.remove(); window.URL.revokeObjectURL(url);
};

const CRITICITES = ['', 'faible', 'moyenne', 'elevee', 'critique'];
const STATUTS    = ['', 'brouillon', 'ouverte', 'en_cours', 'cloturee'];
const now        = new Date();

const TABS = [
  { id: 'search',  icone: <IRecherche t={15}/>, label: 'Recherche multicritère (F11)' },
  { id: 'rapport', icone: <ICalendrier t={15}/>, label: 'Rapport mensuel (F15)' },
];

export default function Exports() {
  const [activeTab,  setActiveTab]  = useState('search');
  const [filters,    setFilters]    = useState({ search:'', statut:'', criticite:'',
    service:'', date_debut:'', date_fin:'', limit:50, offset:0 });
  const [results,    setResults]    = useState([]);
  const [meta,       setMeta]       = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [pdfLoading, setPdfLoading] = useState({});
  const [rapLoading, setRapLoading] = useState(false);
  const [msg,        setMsg]        = useState(null);
  const [rapMois,    setRapMois]    = useState(now.getMonth() + 1);
  const [rapAnnee,   setRapAnnee]   = useState(now.getFullYear());

  const notify = (type, txt) => { setMsg({ type, txt }); setTimeout(() => setMsg(null), 4000); };
  const fv = k => e => setFilters({ ...filters, [k]: e.target.value });

  const search = useCallback(async (off = 0) => {
    setLoading(true);
    try {
      const r = await exportsAPI.searchNc({ ...filters, offset: off });
      setResults(r.data || []);
      setMeta(r.meta || null);
    } catch (e) { notify('err', e.message); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { search(); }, []);

  const exportPDF = async (id, numero) => {
    setPdfLoading(p => ({ ...p, [id]: true }));
    try {
      const r = await exportsAPI.exportPDF(id);
      if (!r.ok) throw new Error('Erreur génération PDF.');
      await downloadBlob(r, `Fiche_NC_${numero}.pdf`);
      notify('ok', `PDF téléchargé : ${numero}`);
    } catch (e) { notify('err', e.message); }
    finally { setPdfLoading(p => ({ ...p, [id]: false })); }
  };

  const exportRapport = async () => {
    setRapLoading(true);
    try {
      const r = await exportsAPI.rapportMensuel(rapMois, rapAnnee);
      if (!r.ok) throw new Error('Erreur génération rapport.');
      await downloadBlob(r, `Innofaso_Rapport_${rapAnnee}_${String(rapMois).padStart(2,'0')}.xlsx`);
      notify('ok', 'Rapport mensuel téléchargé !');
    } catch (e) { notify('err', e.message); }
    finally { setRapLoading(false); }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto',
      padding: 'clamp(20px,4vw,32px) clamp(16px,4vw,40px)', fontFamily: C.police }}>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.texte, margin: '0 0 4px',
          display: 'flex', alignItems: 'center', gap: 10 }}>
          <IFiche t={22}/> Exports, Rapports et Archivage
        </h1>
        <p style={{ color: C.texteDoux, fontSize: 13, margin: 0 }}>
          F11 : Recherche multicritère · F15 : Rapport mensuel auto
        </p>
      </div>

      {msg && (
        <div style={{ padding: '11px 15px', borderRadius: 10, marginBottom: 16, fontSize: 13.5,
          background: msg.type === 'ok' ? C.greenBg : C.rougeBg,
          color: msg.type === 'ok' ? C.greenFonce : C.rouge,
          border: `1px solid ${msg.type === 'ok' ? C.greenBord : '#f0cfcc'}`,
          display: 'flex', alignItems: 'center', gap: 9 }}>
          {msg.type === 'ok' ? <ICheck t={16}/> : <IAlerte t={16}/>} {msg.txt}
        </div>
      )}

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24,
        borderBottom: `2px solid ${C.border}` }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: '10px 18px', border: 'none', cursor: 'pointer', fontSize: 13,
            fontWeight: activeTab === t.id ? 700 : 400,
            color: activeTab === t.id ? C.greenFonce : C.texteDoux,
            background: activeTab === t.id ? C.greenBg : 'transparent',
            borderBottom: activeTab === t.id ? `2px solid ${C.green}` : 'none',
            marginBottom: -2, borderRadius: '6px 6px 0 0',
            display: 'flex', alignItems: 'center', gap: 7,
            fontFamily: C.police,
          }}>
            <span style={{ color: activeTab === t.id ? C.green : C.gris }}>{t.icone}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── RECHERCHE ───────────────────────────────────────────── */}
      {activeTab === 'search' && (
        <div>
          <Carte titre="Filtres de recherche" icone={<IRecherche t={15}/>}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
              <F label="Recherche textuelle">
                <input style={INP} placeholder="Numéro, titre, description…"
                  value={filters.search} onChange={fv('search')}/>
              </F>
              <F label="Statut">
                <select style={INP} value={filters.statut} onChange={fv('statut')}>
                  {STATUTS.map(s => <option key={s} value={s}>{s || 'Tous les statuts'}</option>)}
                </select>
              </F>
              <F label="Criticité">
                <select style={INP} value={filters.criticite} onChange={fv('criticite')}>
                  {CRITICITES.map(c => <option key={c} value={c}>{c || 'Toutes'}</option>)}
                </select>
              </F>
              <F label="Service">
                <input style={INP} placeholder="ex: Production"
                  value={filters.service} onChange={fv('service')}/>
              </F>
              <F label="Date début">
                <input style={INP} type="date" value={filters.date_debut} onChange={fv('date_debut')}/>
              </F>
              <F label="Date fin">
                <input style={INP} type="date" value={filters.date_fin} onChange={fv('date_fin')}/>
              </F>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <Btn variant="primary" onClick={() => search(0)} disabled={loading}>
                <IRecherche t={14}/> {loading ? 'Recherche…' : 'Rechercher'}
              </Btn>
            </div>
          </Carte>

          {meta && (
            <p style={{ color: C.texteDoux, fontSize: 13, margin: '0 0 10px' }}>
              {meta.total} résultat(s) trouvé(s)
            </p>
          )}

          <Carte>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Numéro NC','Titre','Service','Criticité','Statut','Date détection','Actions'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '9px 12px', fontSize: 12,
                        color: C.texteDoux, borderBottom: `2px solid ${C.border}`,
                        fontWeight: 600, background: C.surfaceAlt }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((nc, i) => (
                    <tr key={nc.id} style={{ background: i % 2 === 0 ? '#fff' : C.surfaceAlt }}>
                      <td style={TD}>
                        <strong style={{ color: C.green, fontFamily: C.policeMono }}>{nc.numero_nc || nc.numero}</strong>
                      </td>
                      <td style={{ ...TD, maxWidth: 220 }}>
                        <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:12 }}>
                          {nc.titre || nc.intitule}
                        </div>
                      </td>
                      <td style={{ ...TD, color: C.texteDoux }}>{nc.service_emetteur || nc.service || '—'}</td>
                      <td style={TD}><BadgeCriticite criticite={nc.criticite}/></td>
                      <td style={TD}><BadgeStatut statut={nc.statut}/></td>
                      <td style={{ ...TD, fontSize: 12, color: C.texteFaible, fontFamily: C.policeMono }}>
                        {nc.date_detection ? new Date(nc.date_detection).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td style={TD}>
                        <Btn variant="ghost" onClick={() => exportPDF(nc.id, nc.numero_nc || nc.numero)}
                          disabled={pdfLoading[nc.id]}>
                          <IFiche t={13}/> {pdfLoading[nc.id] ? '…' : 'PDF'}
                        </Btn>
                      </td>
                    </tr>
                  ))}
                  {!results.length && !loading && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: C.texteFaible }}>
                      Aucun résultat. Modifiez les filtres et relancez la recherche.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {meta && meta.total > parseInt(filters.limit) && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                <Btn variant="ghost" disabled={!filters.offset || filters.offset <= 0}
                  onClick={() => search(Math.max(0, filters.offset - filters.limit))}>
                  ← Précédent
                </Btn>
                <span style={{ color: C.texteDoux, fontSize: 13, padding: '8px 12px',
                  fontFamily: C.policeMono }}>
                  {Math.floor(filters.offset / filters.limit) + 1} / {Math.ceil(meta.total / filters.limit)}
                </span>
                <Btn variant="ghost"
                  disabled={filters.offset + parseInt(filters.limit) >= meta.total}
                  onClick={() => search(filters.offset + parseInt(filters.limit))}>
                  Suivant →
                </Btn>
              </div>
            )}
          </Carte>
        </div>
      )}

      {/* ── RAPPORT MENSUEL ─────────────────────────────────────── */}
      {activeTab === 'rapport' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <Carte titre="Rapport Mensuel Qualité (F15)" icone={<ICalendrier t={15}/>}>
            <p style={{ color: C.texteDoux, fontSize: 13, margin: '0 0 20px' }}>
              Choisissez le mois et l'année puis téléchargez le rapport.
              Ce rapport est aussi <strong>généré automatiquement le 5 de chaque mois</strong>.
            </p>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 20 }}>
              <F label="Mois">
                <select style={{ ...INP, maxWidth: 150 }} value={rapMois}
                  onChange={e => setRapMois(parseInt(e.target.value))}>
                  {[...Array(12)].map((_, i) => (
                    <option key={i+1} value={i+1}>
                      {new Date(2024, i).toLocaleString('fr-FR', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </F>
              <F label="Année">
                <select style={{ ...INP, maxWidth: 110 }} value={rapAnnee}
                  onChange={e => setRapAnnee(parseInt(e.target.value))}>
                  {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </F>
              <Btn variant="fonce" onClick={exportRapport} disabled={rapLoading}>
                <IEnregistrer t={15}/> {rapLoading ? 'Génération…' : 'Télécharger le rapport'}
              </Btn>
            </div>

            <div style={{ background: C.orangeBg, border: `1px solid #f5c97a`,
              borderRadius: 8, padding: 14 }}>
              <p style={{ color: C.orange, fontSize: 13, margin: '0 0 8px', fontWeight: 600 }}>
                Contenu du rapport mensuel :
              </p>
              <ul style={{ color: C.orange, fontSize: 12, margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
                <li>KPIs synthèse : total NC, taux de clôture, NC critiques, évolution vs mois précédent</li>
                <li>Répartition par criticité (faible / moyenne / élevée / critique)</li>
                <li>Répartition par service (top 5)</li>
                <li>Onglet détail : liste complète de toutes les NC du mois</li>
                <li>Archivage automatique 5 ans (conforme HACCP/ISO 22000)</li>
              </ul>
            </div>
          </Carte>

          <Carte titre="Déclenchement automatique actif" icone={<ICalendrier t={15}/>}>
            <p style={{ color: C.texteDoux, fontSize: 13, margin: 0 }}>
              Le rapport est généré <strong>automatiquement le 5 de chaque mois à 08h00</strong>
              (heure de Ouagadougou) et archivé dans <code>uploads/rapports/</code>.
              Aucune intervention manuelle n'est nécessaire.
            </p>
          </Carte>
        </div>
      )}
    </div>
  );
}

const F   = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    <label style={{ fontSize: 13, fontWeight: 600, color: C.texte }}>{label}</label>
    {children}
  </div>
);
const INP = { padding: '8px 12px', border: `1.5px solid ${C.borderFort}`, borderRadius: 8,
              fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
              fontFamily: 'inherit' };
const TD  = { padding: '9px 12px', fontSize: 13, borderBottom: `1px solid ${C.border}`,
              verticalAlign: 'middle' };