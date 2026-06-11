// src/pages/nc/NcList.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ncAPI } from '../../services/api';

const CRIT_COLOR = {
  observation:'#059669', mineure:'#D97706', majeure:'#DC2626', critique:'#7C3AED'
};
const STAT_COLOR = {
  brouillon:'#9CA3AF', ouverte:'#2563EB', en_cours:'#D97706', cloturee:'#059669'
};

export default function NcList() {
  const navigate = useNavigate();
  const [ncs,     setNcs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ statut:'', criticite:'' });

  const load = async () => {
    setLoading(true);
    try {
      const r = await ncAPI.getAll(filters);
      setNcs(r.data.data);
    } catch { setNcs([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h1 style={{ color:'#1F4E79', margin:0 }}>📋 Non-Conformités</h1>
          <p style={{ color:'#666', fontSize:13, margin:'4px 0 0' }}>{ncs.length} NC trouvée(s)</p>
        </div>
        <button onClick={() => navigate('/nc/nouveau')}
          style={{ background:'#1F4E79', color:'#fff', border:'none', borderRadius:8,
                   padding:'10px 20px', cursor:'pointer', fontWeight:600 }}>
          ➕ Nouvelle NC
        </button>
      </div>

      {/* Filtres */}
      <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap' }}>
        {[
          { k:'statut', opts:['','brouillon','ouverte','en_cours','cloturee'], label:'Statut' },
          { k:'criticite', opts:['','observation','mineure','majeure','critique'], label:'Criticité' },
        ].map(f => (
          <select key={f.k} value={filters[f.k]}
            onChange={e => setFilters({...filters,[f.k]:e.target.value})}
            style={{ padding:'8px 12px', border:'1.5px solid #D1D5DB', borderRadius:8, fontSize:13 }}>
            {f.opts.map(o => <option key={o} value={o}>{o || `Tous (${f.label})`}</option>)}
          </select>
        ))}
        <button onClick={load}
          style={{ padding:'8px 18px', background:'#1F4E79', color:'#fff',
                   border:'none', borderRadius:8, cursor:'pointer', fontSize:13 }}>
          Filtrer
        </button>
      </div>

      {loading ? <p style={{color:'#666'}}>Chargement...</p> : (
        <div style={{ background:'#fff', borderRadius:10, border:'1px solid #E5E7EB', overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Numéro NC','Titre','Service','Criticité','Statut','Émetteur','Date','Actions']
                  .map(h => <th key={h} style={{ background:'#1F4E79', color:'#fff',
                    padding:'10px 12px', textAlign:'left', fontSize:13 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {ncs.map((nc, i) => (
                <tr key={nc.id} style={{ background: i%2===0?'#fff':'#F9FAFB' }}>
                  <td style={TD}><strong style={{color:'#1F4E79'}}>{nc.numero_nc}</strong></td>
                  <td style={{...TD, maxWidth:200}}>
                    <div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{nc.titre}</div>
                  </td>
                  <td style={TD}>{nc.service_emetteur||'–'}</td>
                  <td style={TD}>
                    <span style={{background:`${CRIT_COLOR[nc.criticite]}22`,
                      color:CRIT_COLOR[nc.criticite],padding:'2px 8px',borderRadius:10,fontSize:12,fontWeight:500}}>
                      {nc.criticite}
                    </span>
                  </td>
                  <td style={TD}>
                    <span style={{background:`${STAT_COLOR[nc.statut]}22`,
                      color:STAT_COLOR[nc.statut],padding:'2px 8px',borderRadius:10,fontSize:12,fontWeight:500}}>
                      {nc.statut}
                    </span>
                  </td>
                  <td style={{...TD,fontSize:12,color:'#555'}}>
                    {nc.emetteur_prenom} {nc.emetteur_nom}
                  </td>
                  <td style={{...TD,fontSize:12,color:'#888'}}>
                    {nc.date_detection ? new Date(nc.date_detection).toLocaleDateString('fr-FR') : '–'}
                  </td>
                  <td style={TD}>
                    <button onClick={() => navigate(`/nc/${nc.id}`)}
                      style={{background:'#F3F4F6',border:'1px solid #D1D5DB',borderRadius:6,
                              padding:'4px 10px',cursor:'pointer',fontSize:12}}>
                      👁️ Voir
                    </button>
                  </td>
                </tr>
              ))}
              {!ncs.length && <tr><td colSpan={8} style={{textAlign:'center',padding:32,color:'#999'}}>
                Aucune NC trouvée.
              </td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
const TD = { padding:'10px 12px', fontSize:13, borderBottom:'1px solid #F3F4F6', verticalAlign:'middle' };
