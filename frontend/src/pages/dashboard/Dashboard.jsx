// src/pages/dashboard/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { ncAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const Card = ({ icon, label, value, color='#1F4E79', bg='#EFF6FF' }) => (
  <div style={{ background:bg, borderRadius:10, padding:'20px 24px',
                borderLeft:`4px solid ${color}`, display:'flex', alignItems:'center', gap:16 }}>
    <span style={{ fontSize:32 }}>{icon}</span>
    <div>
      <div style={{ fontSize:28, fontWeight:'bold', color }}>{value ?? '…'}</div>
      <div style={{ fontSize:13, color:'#555', marginTop:2 }}>{label}</div>
    </div>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    ncAPI.getStats()
      .then(r => setStats(r.data.data))
      .catch(() => {});
  }, []);

  return (
    <div>
      <h1 style={{ color:'#1F4E79', marginBottom:4 }}>📊 Tableau de Bord</h1>
      <p style={{ color:'#666', marginBottom:24, fontSize:13 }}>
        Bonjour {user?.prenom} — {new Date().toLocaleDateString('fr-FR',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
      </p>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16, marginBottom:32 }}>
        <Card icon="📋" label="Total NC"       value={stats?.total}     color="#1F4E79" bg="#EFF6FF"/>
        <Card icon="🔴" label="NC Ouvertes"    value={stats?.ouvertes}  color="#DC2626" bg="#FEF2F2"/>
        <Card icon="⚠️" label="NC Critiques"   value={stats?.critiques} color="#D97706" bg="#FFFBEB"/>
        <Card icon="✅" label="NC Clôturées"   value={stats?.cloturees} color="#059669" bg="#F0FDF4"/>
      </div>

      {stats?.byCriticite?.length > 0 && (
        <div style={{ background:'#fff', borderRadius:10, padding:24, marginBottom:24,
                      border:'1px solid #E5E7EB' }}>
          <h2 style={{ color:'#1F4E79', fontSize:16, marginBottom:16 }}>Répartition par criticité</h2>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            {stats.byCriticite.map(row => {
              const colors = { observation:'#059669', mineure:'#D97706', majeure:'#DC2626', critique:'#7C3AED' };
              return (
                <div key={row.criticite} style={{ padding:'8px 18px', borderRadius:20,
                  background: `${colors[row.criticite]}22`,
                  border:`1px solid ${colors[row.criticite]}44`,
                  color: colors[row.criticite], fontWeight:600, fontSize:13 }}>
                  {row.criticite} : {row.n}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ background:'#fff', borderRadius:10, padding:24, border:'1px solid #E5E7EB' }}>
        <h2 style={{ color:'#1F4E79', fontSize:16, marginBottom:12 }}>🚀 Sprints en cours</h2>
        {[
          { sprint:'Sprint 3', status:'✅ Terminé', desc:'Auth JWT · RBAC · Audit Logs', color:'#059669' },
          { sprint:'Sprint 4', status:'🔄 En cours', desc:'Formulaire NC Digital (F01/F02/F03)', color:'#D97706' },
          { sprint:'Sprint 5', status:'⏳ À venir', desc:'Workflow traitement NC (F04/F05/F06)', color:'#9CA3AF' },
          { sprint:'Sprint 6', status:'⏳ À venir', desc:'Analyse 5M, CAPA et Clôture (F07/F08)', color:'#9CA3AF' },
        ].map(s => (
          <div key={s.sprint} style={{ display:'flex', alignItems:'center', gap:12,
                                        padding:'8px 0', borderBottom:'1px solid #F3F4F6' }}>
            <span style={{ fontWeight:'bold', color:s.color, minWidth:70 }}>{s.sprint}</span>
            <span style={{ background:`${s.color}22`, color:s.color, padding:'2px 8px',
                           borderRadius:10, fontSize:12, fontWeight:500 }}>{s.status}</span>
            <span style={{ fontSize:13, color:'#555' }}>{s.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
