// src/pages/admin/AuditLogs.jsx
import React, { useState, useEffect } from 'react';
import { auditAPI } from '../../services/api';

const AC = {
  LOGIN_SUCCESS:{bg:'#D1FAE5',c:'#065F46'},  LOGIN_FAILED:{bg:'#FEE2E2',c:'#991B1B'},
  LOGIN_BLOCKED:{bg:'#FEF3C7',c:'#92400E'},  LOGOUT:{bg:'#F3F4F6',c:'#374151'},
  CREATE_USER:{bg:'#DBEAFE',c:'#1D4ED8'},    UPDATE_USER:{bg:'#EDE9FE',c:'#5B21B6'},
  UNLOCK_USER:{bg:'#D1FAE5',c:'#065F46'},    CREATE_NC:{bg:'#DBEAFE',c:'#1D4ED8'},
  UPDATE_NC_STATUT:{bg:'#FEF3C7',c:'#92400E'},
};

export default function AuditLogs() {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState({ action:'' });

  const load = async () => {
    setLoading(true);
    try { const r = await auditAPI.getLogs({...filter,limit:200}); setLogs(r.data.data); }
    catch { setLogs([]); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  return (
    <div>
      <h1 style={{ color:'#1F4E79', marginBottom:4 }}>🔍 Journal d'Audit</h1>
      <p style={{ color:'#666', fontSize:13, marginBottom:20 }}>
        Toutes les actions sont enregistrées automatiquement et <strong>ne peuvent pas être modifiées</strong>.
      </p>

      <div style={{ display:'flex', gap:10, marginBottom:16 }}>
        <input placeholder="Filtrer par action (ex: LOGIN)..."
          value={filter.action} onChange={e=>setFilter({...filter,action:e.target.value})}
          style={{ padding:'8px 12px',border:'1.5px solid #D1D5DB',borderRadius:8,fontSize:13,width:280 }}/>
        <button onClick={load}
          style={{padding:'8px 18px',background:'#1F4E79',color:'#fff',
                  border:'none',borderRadius:8,cursor:'pointer',fontSize:13}}>
          Rechercher
        </button>
      </div>

      {loading ? <p>Chargement...</p> : (
        <div style={{ background:'#fff',borderRadius:10,border:'1px solid #E5E7EB',overflow:'hidden' }}>
          <table style={{ width:'100%',borderCollapse:'collapse' }}>
            <thead>
              <tr>{['Date / Heure','Utilisateur','Rôle','Action','Table','ID','IP']
                .map(h=><th key={h} style={{background:'#1F4E79',color:'#fff',
                  padding:'10px 12px',textAlign:'left',fontSize:12}}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {logs.map((l,i)=>{
                const a = AC[l.action]||{bg:'#F3F4F6',c:'#374151'};
                return (
                  <tr key={l.id} style={{background:i%2===0?'#fff':'#F9FAFB'}}>
                    <td style={TD}>{new Date(l.created_at).toLocaleString('fr-FR')}</td>
                    <td style={TD}>{l.prenom?`${l.prenom} ${l.nom}`:'—'}</td>
                    <td style={{...TD,color:'#666'}}>{l.role||'—'}</td>
                    <td style={TD}>
                      <span style={{background:a.bg,color:a.c,padding:'2px 7px',
                        borderRadius:10,fontSize:11,fontWeight:600}}>{l.action}</span>
                    </td>
                    <td style={{...TD,color:'#666',fontSize:12}}>{l.target_table||'—'}</td>
                    <td style={{...TD,color:'#888',fontSize:12}}>{l.target_id||'—'}</td>
                    <td style={{...TD,fontFamily:'monospace',fontSize:11,color:'#999'}}>{l.ip_address||'—'}</td>
                  </tr>
                );
              })}
              {!logs.length&&<tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'#999'}}>
                Aucun log trouvé.
              </td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const TD = { padding:'9px 12px',fontSize:13,borderBottom:'1px solid #F3F4F6',verticalAlign:'middle' };
