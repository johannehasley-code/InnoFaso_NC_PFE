// src/pages/exports/Exports.jsx  — Sprint 8
// F10 : Export PDF + Excel  |  F11 : Recherche multicritère  |  F15 : Rapport mensuel
import React, { useState, useEffect, useCallback } from 'react';
import API from '../../services/api';

// ── Helper : télécharger un blob ────────────────────────────
const downloadBlob = (blob, filename) => {
  const url  = window.URL.createObjectURL(new Blob([blob]));
  const link = document.createElement('a');
  link.href  = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const CRITICITES = ['', 'observation', 'mineure', 'majeure', 'critique'];
const STATUTS    = ['', 'brouillon', 'ouverte', 'en_cours', 'cloturee'];
const CRIT_COLOR = { observation:'#059669', mineure:'#D97706', majeure:'#DC2626', critique:'#7C3AED' };
const STAT_COLOR = { brouillon:'#9CA3AF', ouverte:'#2563EB', en_cours:'#D97706', cloturee:'#059669' };
const now        = new Date();

export default function Exports() {
  const [activeTab, setActiveTab] = useState('search');

  // Filtres recherche
  const [filters, setFilters] = useState({
    search:'', statut:'', criticite:'', service:'',
    date_debut:'', date_fin:'', limit: 50, offset: 0,
  });
  const [results,   setResults]   = useState([]);
  const [meta,      setMeta]      = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [pdfLoading,setPdfLoading]= useState({});
  const [xlsLoading,setXlsLoading]= useState(false);
  const [rapLoading,setRapLoading]= useState(false);
  const [msg, setMsg] = useState('');

  // Mois/Année rapport
  const [rapMois,  setRapMois]  = useState(now.getMonth() + 1);
  const [rapAnnee, setRapAnnee] = useState(now.getFullYear());

  const notify = (m) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  // ── 3.2.3 Recherche ────────────────────────────────────────
  const search = useCallback(async (off = 0) => {
    setLoading(true);
    try {
      const params = { ...filters, offset: off };
      Object.keys(params).forEach(k => !params[k] && params[k] !== 0 && delete params[k]);
      const r = await API.get('/exports/nc', { params });
      setResults(r.data.data);
      setMeta(r.data.meta);
    } catch (err) {
      notify('❌ ' + (err.response?.data?.message || 'Erreur de recherche.'));
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { search(); }, []);

  const fv = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  const resetFilters = () => {
    setFilters({ search:'', statut:'', criticite:'', service:'',
                 date_debut:'', date_fin:'', limit:50, offset:0 });
  };

  // ── 3.2.1 Export PDF ────────────────────────────────────────
  const exportPDF = async (id, numero) => {
    setPdfLoading(prev => ({ ...prev, [id]: true }));
    try {
      const r = await API.get(`/exports/nc/${id}/pdf`, { responseType: 'blob' });
      downloadBlob(r.data, `Fiche_NC_${numero}.pdf`);
      notify(`✅ PDF téléchargé : ${numero}`);
    } catch { notify('❌ Erreur génération PDF.'); }
    finally { setPdfLoading(prev => ({ ...prev, [id]: false })); }
  };

  // ── 3.2.2 Export Excel ──────────────────────────────────────
  const exportExcel = async () => {
    setXlsLoading(true);
    try {
      const params = { ...filters };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      delete params.limit; delete params.offset;
      const r = await API.get('/exports/nc/excel', { params, responseType: 'blob' });
      const filename = `Innofaso_NC_${new Date().toISOString().slice(0,10)}.xlsx`;
      downloadBlob(r.data, filename);
      notify('✅ Export Excel téléchargé !');
    } catch { notify('❌ Erreur génération Excel.'); }
    finally { setXlsLoading(false); }
  };

  // ── 3.2.4 Rapport mensuel ───────────────────────────────────
  const exportRapport = async () => {
    setRapLoading(true);
    try {
      const r = await API.get('/exports/rapport-mensuel',
        { params: { mois: rapMois, annee: rapAnnee }, responseType: 'blob' });
      downloadBlob(r.data, `Innofaso_Rapport_${rapAnnee}_${String(rapMois).padStart(2,'0')}.xlsx`);
      notify('✅ Rapport mensuel téléchargé !');
    } catch { notify('❌ Erreur génération rapport.'); }
    finally { setRapLoading(false); }
  };

  // ── TABS ─────────────────────────────────────────────────────
  const TABS = [
    { id:'search',   icon:'🔍', label:'Recherche multicritère (F11)' },
    { id:'export',   icon:'📤', label:'Exports PDF / Excel (F10)'    },
    { id:'rapport',  icon:'📊', label:'Rapport mensuel (F15)'        },
  ];

  return (
    <div style={{ fontFamily:'Arial', maxWidth:1200, margin:'0 auto' }}>

      {/* HEADER */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ color:'#1F4E79', margin:'0 0 4px' }}>
          📁 Exports, Rapports et Archivage
        </h1>
        <p style={{ color:'#666', fontSize:13, margin:0 }}>
          Sprint 8 — F10 : Export PDF/Excel · F11 : Recherche multicritère · F15 : Rapport mensuel auto
        </p>
      </div>

      {/* NOTIFICATION */}
      {msg && (
        <div style={{ background: msg.startsWith('✅') ? '#F0FDF4' : '#FEF2F2',
                      border: `1px solid ${msg.startsWith('✅') ? '#A7F3D0' : '#FECACA'}`,
                      color: msg.startsWith('✅') ? '#059669' : '#DC2626',
                      borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13 }}>
          {msg}
        </div>
      )}

      {/* TABS */}
      <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'2px solid #E5E7EB' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding:'10px 18px', border:'none', cursor:'pointer', fontSize:13,
                     fontWeight: activeTab===t.id ? 700 : 400,
                     color: activeTab===t.id ? '#1F4E79' : '#666',
                     background: activeTab===t.id ? '#EFF6FF' : 'transparent',
                     borderBottom: activeTab===t.id ? '2px solid #1F4E79' : 'none',
                     marginBottom: -2, borderRadius:'6px 6px 0 0' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB : RECHERCHE MULTICRITÈRE (F11) ────────────────── */}
      {activeTab === 'search' && (
        <div>
          {/* Filtres */}
          <div style={{ background:'#fff', borderRadius:10, padding:20,
                        border:'1px solid #E5E7EB', marginBottom:16 }}>
            <h3 style={{ color:'#1F4E79', margin:'0 0 14px', fontSize:14 }}>
              🔎 Filtres de recherche
            </h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12 }}>
              <div style={FLD}>
                <label style={LBL}>Recherche textuelle</label>
                <input style={INP} placeholder="Numéro, titre, description..."
                  value={filters.search} onChange={fv('search')}/>
              </div>
              <div style={FLD}>
                <label style={LBL}>Statut</label>
                <select style={INP} value={filters.statut} onChange={fv('statut')}>
                  {STATUTS.map(s=><option key={s} value={s}>{s||'Tous les statuts'}</option>)}
                </select>
              </div>
              <div style={FLD}>
                <label style={LBL}>Criticité</label>
                <select style={INP} value={filters.criticite} onChange={fv('criticite')}>
                  {CRITICITES.map(c=><option key={c} value={c}>{c||'Toutes'}</option>)}
                </select>
              </div>
              <div style={FLD}>
                <label style={LBL}>Service</label>
                <input style={INP} placeholder="ex: Production"
                  value={filters.service} onChange={fv('service')}/>
              </div>
              <div style={FLD}>
                <label style={LBL}>Date début</label>
                <input style={INP} type="date" value={filters.date_debut} onChange={fv('date_debut')}/>
              </div>
              <div style={FLD}>
                <label style={LBL}>Date fin</label>
                <input style={INP} type="date" value={filters.date_fin} onChange={fv('date_fin')}/>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:14 }}>
              <button onClick={() => search(0)} disabled={loading}
                style={{ ...BTN_P, opacity:loading?.7:1 }}>
                {loading ? '⏳ Recherche...' : '🔍 Rechercher'}
              </button>
              <button onClick={resetFilters} style={BTN_S}>↺ Réinitialiser</button>
              {results.length > 0 && (
                <button onClick={exportExcel} disabled={xlsLoading}
                  style={{ ...BTN_G, opacity:xlsLoading?.7:1, marginLeft:'auto' }}>
                  {xlsLoading ? '⏳...' : '📥 Exporter Excel'}
                </button>
              )}
            </div>
          </div>

          {/* Résultats */}
          {meta && (
            <p style={{ color:'#666', fontSize:13, marginBottom:8 }}>
              {meta.total} résultat(s) trouvé(s)
              {Object.values(filters).some(Boolean) ? ' avec les filtres appliqués' : ''}
            </p>
          )}

          <div style={{ background:'#fff', borderRadius:10, border:'1px solid #E5E7EB', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>{['Numéro NC','Titre','Service','Criticité','Statut','Date détection','Actions']
                  .map(h=><th key={h} style={TH}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {results.map((nc, i) => (
                  <tr key={nc.id} style={{ background:i%2===0?'#fff':'#F9FAFB' }}>
                    <td style={TD}><strong style={{color:'#1F4E79'}}>{nc.numero_nc}</strong></td>
                    <td style={{...TD,maxWidth:220}}>
                      <div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:12}}>
                        {nc.titre}
                      </div>
                    </td>
                    <td style={TD}>{nc.service_emetteur||'—'}</td>
                    <td style={TD}>
                      <span style={{background:`${CRIT_COLOR[nc.criticite]||'#666'}22`,
                        color:CRIT_COLOR[nc.criticite]||'#666',
                        padding:'2px 8px',borderRadius:10,fontSize:11,fontWeight:600}}>
                        {nc.criticite}
                      </span>
                    </td>
                    <td style={TD}>
                      <span style={{background:`${STAT_COLOR[nc.statut]||'#666'}22`,
                        color:STAT_COLOR[nc.statut]||'#666',
                        padding:'2px 8px',borderRadius:10,fontSize:11,fontWeight:600}}>
                        {nc.statut}
                      </span>
                    </td>
                    <td style={{...TD,fontSize:12,color:'#888'}}>
                      {nc.date_detection
                        ? new Date(nc.date_detection).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td style={TD}>
                      <button
                        onClick={() => exportPDF(nc.id, nc.numero_nc)}
                        disabled={pdfLoading[nc.id]}
                        style={{ background:'#EFF6FF',border:'1px solid #BFDBFE',
                                 borderRadius:6,padding:'4px 10px',cursor:'pointer',
                                 fontSize:12,color:'#1D4ED8',fontWeight:500 }}>
                        {pdfLoading[nc.id] ? '⏳' : '📄 PDF'}
                      </button>
                    </td>
                  </tr>
                ))}
                {!results.length && !loading && (
                  <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'#999'}}>
                    Aucun résultat. Modifiez les filtres.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.total > parseInt(filters.limit) && (
            <div style={{ display:'flex',justifyContent:'center',gap:8,marginTop:16 }}>
              <button disabled={!filters.offset || filters.offset <= 0}
                onClick={() => search(Math.max(0, filters.offset - filters.limit))}
                style={BTN_S}>← Précédent</button>
              <span style={{color:'#666',fontSize:13,padding:'8px 12px'}}>
                {Math.floor(filters.offset/filters.limit)+1} /
                {Math.ceil(meta.total/filters.limit)}
              </span>
              <button disabled={filters.offset + parseInt(filters.limit) >= meta.total}
                onClick={() => search(filters.offset + parseInt(filters.limit))}
                style={BTN_S}>Suivant →</button>
            </div>
          )}
        </div>
      )}

      {/* ── TAB : EXPORT PDF / EXCEL (F10) ─────────────────────── */}
      {activeTab === 'export' && (
        <div style={{display:'flex',flexDirection:'column',gap:20}}>

          {/* Export Excel */}
          <div style={{background:'#fff',borderRadius:10,padding:24,border:'1px solid #E5E7EB'}}>
            <h3 style={{color:'#1F4E79',margin:'0 0 8px',fontSize:15}}>
              📊 Export Excel — Liste NC avec filtres (F10)
            </h3>
            <p style={{color:'#666',fontSize:13,margin:'0 0 16px'}}>
              Génère un fichier Excel avec la liste des NC et les filtres actifs.
              Inclut un onglet de statistiques automatique.
            </p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginBottom:16}}>
              {[
                ['Criticité','criticite', CRITICITES],
                ['Statut','statut', STATUTS],
              ].map(([lb,k,opts])=>(
                <div key={k} style={FLD}>
                  <label style={LBL}>{lb}</label>
                  <select style={INP} value={filters[k]} onChange={fv(k)}>
                    {opts.map(o=><option key={o} value={o}>{o||`Tous (${lb})`}</option>)}
                  </select>
                </div>
              ))}
              <div style={FLD}>
                <label style={LBL}>Période : du</label>
                <input style={INP} type="date" value={filters.date_debut} onChange={fv('date_debut')}/>
              </div>
              <div style={FLD}>
                <label style={LBL}>Au</label>
                <input style={INP} type="date" value={filters.date_fin} onChange={fv('date_fin')}/>
              </div>
              <div style={FLD}>
                <label style={LBL}>Service</label>
                <input style={INP} placeholder="ex: Production" value={filters.service} onChange={fv('service')}/>
              </div>
            </div>
            <button onClick={exportExcel} disabled={xlsLoading}
              style={{...BTN_G, opacity:xlsLoading?.7:1, padding:'12px 28px', fontSize:14}}>
              {xlsLoading ? '⏳ Génération...' : '📥 Télécharger Excel'}
            </button>
          </div>

          {/* Export PDF individuel */}
          <div style={{background:'#fff',borderRadius:10,padding:24,border:'1px solid #E5E7EB'}}>
            <h3 style={{color:'#1F4E79',margin:'0 0 8px',fontSize:15}}>
              📄 Export PDF — Fiche NC individuelle (F10)
            </h3>
            <p style={{color:'#666',fontSize:13,margin:'0 0 16px'}}>
              Cliquez sur <strong>📄 PDF</strong> dans l'onglet Recherche pour télécharger
              la fiche NC complète au format A4 — valable pour audit externe.
            </p>
            <div style={{background:'#F0F9FF',border:'1px solid #BAE6FD',borderRadius:8,padding:14}}>
              <p style={{color:'#0369A1',fontSize:13,margin:0}}>
                💡 La fiche PDF contient : identification, description, analyse 5M,
                méthode des 5 Pourquoi, traitement CAPA, vérification et signatures.
                Conforme à la fiche papier Innofaso PM-SM-EN-FNC-E.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB : RAPPORT MENSUEL (F15) ────────────────────────── */}
      {activeTab === 'rapport' && (
        <div style={{display:'flex',flexDirection:'column',gap:20}}>

          {/* Génération manuelle */}
          <div style={{background:'#fff',borderRadius:10,padding:24,border:'1px solid #E5E7EB'}}>
            <h3 style={{color:'#1F4E79',margin:'0 0 8px',fontSize:15}}>
              📊 Rapport Mensuel Qualité (F15)
            </h3>
            <p style={{color:'#666',fontSize:13,margin:'0 0 20px'}}>
              Choisissez le mois et l'année puis téléchargez le rapport.
              Ce rapport est aussi <strong>généré automatiquement le 5 de chaque mois</strong> et archivé sur le serveur.
            </p>

            <div style={{display:'flex',gap:16,alignItems:'flex-end',flexWrap:'wrap',marginBottom:20}}>
              <div style={FLD}>
                <label style={LBL}>Mois</label>
                <select style={{...INP,maxWidth:140}} value={rapMois}
                  onChange={e=>setRapMois(parseInt(e.target.value))}>
                  {[...Array(12)].map((_,i)=>(
                    <option key={i+1} value={i+1}>
                      {new Date(2024,i).toLocaleString('fr-FR',{month:'long'})}
                    </option>
                  ))}
                </select>
              </div>
              <div style={FLD}>
                <label style={LBL}>Année</label>
                <select style={{...INP,maxWidth:110}} value={rapAnnee}
                  onChange={e=>setRapAnnee(parseInt(e.target.value))}>
                  {[2024,2025,2026,2027].map(y=>(
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <button onClick={exportRapport} disabled={rapLoading}
                style={{...BTN_G,padding:'10px 28px',fontSize:14,opacity:rapLoading?.7:1}}>
                {rapLoading ? '⏳ Génération...' : '📥 Télécharger le rapport'}
              </button>
            </div>

            {/* Info contenu */}
            <div style={{background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:8,padding:14}}>
              <p style={{color:'#92400E',fontSize:13,margin:'0 0 8px',fontWeight:600}}>
                📋 Contenu du rapport mensuel :
              </p>
              <ul style={{color:'#78350F',fontSize:12,margin:0,paddingLeft:18,lineHeight:1.8}}>
                <li>KPIs synthèse : total NC, taux de clôture, NC critiques, évolution vs mois précédent</li>
                <li>Répartition par criticité (observation / mineure / majeure / critique)</li>
                <li>Répartition par service (top 5)</li>
                <li>Onglet détail : liste complète de toutes les NC du mois</li>
                <li>Archivage automatique 5 ans (conforme HACCP/ISO 22000)</li>
              </ul>
            </div>
          </div>

          {/* Info cron */}
          <div style={{background:'#F0FDF4',border:'1px solid #A7F3D0',borderRadius:10,padding:20}}>
            <h3 style={{color:'#065F46',margin:'0 0 8px',fontSize:14}}>
              ⏰ Déclenchement automatique actif
            </h3>
            <p style={{color:'#047857',fontSize:13,margin:0}}>
              Le rapport est généré <strong>automatiquement le 5 de chaque mois à 08h00</strong>
              (heure de Ouagadougou) et archivé dans <code>backend/uploads/rapports/</code>.
              Aucune intervention manuelle n'est nécessaire.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles communs ───────────────────────────────────────────
const FLD  = { display:'flex', flexDirection:'column', gap:5 };
const LBL  = { fontSize:13, fontWeight:600, color:'#374151' };
const INP  = { padding:'8px 12px', border:'1.5px solid #D1D5DB', borderRadius:8,
               fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' };
const TH   = { background:'#1F4E79', color:'#fff', padding:'10px 12px',
               textAlign:'left', fontSize:12 };
const TD   = { padding:'9px 12px', fontSize:13, borderBottom:'1px solid #F3F4F6',
               verticalAlign:'middle' };
const BTN_P = { background:'#1F4E79', color:'#fff', border:'none', borderRadius:8,
                padding:'10px 20px', cursor:'pointer', fontSize:13, fontWeight:600 };
const BTN_S = { background:'#F3F4F6', color:'#374151', border:'1px solid #D1D5DB',
                borderRadius:8, padding:'9px 16px', cursor:'pointer', fontSize:13 };
const BTN_G = { background:'#059669', color:'#fff', border:'none', borderRadius:8,
                padding:'9px 20px', cursor:'pointer', fontSize:13, fontWeight:600 };
