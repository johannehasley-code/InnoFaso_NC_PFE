// src/pages/admin/PendingUsers.jsx
import React, { useState, useEffect } from 'react';
import { usersAPI } from '../../services/api';

export default function PendingUsers() {
  const [pending, setPending] = useState([]);
  const [roles,   setRoles]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg,     setMsg]     = useState('');
  const [modal,   setModal]   = useState(null);

  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),4000); };

  const load = async () => {
    setLoading(true);
    try {
      const [u,r] = await Promise.all([usersAPI.getPending(), usersAPI.getRoles()]);
      setPending(u.data.data);
      setRoles(r.data.data);
    } catch { notify('❌ Erreur chargement.'); }
    finally { setLoading(false); }
  };
  useEffect(()=>{ load(); },[]);

  const activate = async (userId, roleId) => {
    try {
      const r = await usersAPI.activate(userId, roleId);
      notify('✅ ' + r.data.message);
      setModal(null);
      load();
    } catch(e) { notify('❌ '+(e.response?.data?.message||'Erreur.')); }
  };

  const reject = async (userId, email) => {
    if (!window.confirm(`Rejeter et supprimer le compte de ${email} ?`)) return;
    try {
      await usersAPI.reject(userId);
      notify('🗑️ Inscription rejetée.');
      load();
    } catch { notify('❌ Erreur.'); }
  };

  return (
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{color:'#1F4E79',margin:'0 0 4px'}}>🕐 Inscriptions en attente</h1>
        <p style={{color:'#666',fontSize:13,margin:0}}>
          {pending.length} demande(s) — Activez chaque compte et assignez un rôle.
        </p>
      </div>

      {msg && (
        <div style={{background:msg.startsWith('✅')?'#F0FDF4':'#FEF2F2',
          border:`1px solid ${msg.startsWith('✅')?'#A7F3D0':'#FECACA'}`,
          color:msg.startsWith('✅')?'#059669':'#DC2626',
          borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:13}}>{msg}</div>
      )}

      {loading ? <p style={{color:'#666'}}>Chargement...</p>
      : pending.length===0 ? (
        <div style={{background:'#fff',borderRadius:10,padding:40,textAlign:'center',
                     border:'1px solid #E5E7EB'}}>
          <div style={{fontSize:48,marginBottom:12}}>✅</div>
          <p style={{color:'#666',fontSize:14}}>Aucune inscription en attente.</p>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {pending.map(u=>(
            <div key={u.id} style={{background:'#fff',borderRadius:10,padding:20,
              border:'1px solid #E5E7EB',display:'flex',alignItems:'center',
              gap:16,flexWrap:'wrap'}}>
              {/* Avatar */}
              <div style={{width:48,height:48,borderRadius:'50%',flexShrink:0,
                background:'linear-gradient(135deg,#1F4E79,#2E75B6)',
                display:'flex',alignItems:'center',justifyContent:'center',
                color:'#fff',fontWeight:'bold',fontSize:18}}>
                {u.prenom?.[0]?.toUpperCase()}{u.nom?.[0]?.toUpperCase()}
              </div>
              {/* Infos */}
              <div style={{flex:1,minWidth:200}}>
                <div style={{fontWeight:700,color:'#1F4E79',fontSize:15}}>
                  {u.prenom} {u.nom}
                </div>
                <div style={{color:'#555',fontSize:13}}>{u.email}</div>
                <div style={{color:'#888',fontSize:12,marginTop:2}}>
                  Service : {u.service||'—'} •
                  Inscrit le {new Date(u.date_inscription).toLocaleDateString('fr-FR')}
                </div>
              </div>
              {/* Badge */}
              <div style={{background:'#FEF3C7',color:'#92400E',
                padding:'4px 12px',borderRadius:20,fontSize:12,fontWeight:600}}>
                ⏳ En attente
              </div>
              {/* Actions */}
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>setModal(u)}
                  style={{background:'#1F4E79',color:'#fff',border:'none',
                    borderRadius:8,padding:'8px 16px',cursor:'pointer',fontSize:13,fontWeight:600}}>
                  ✅ Valider
                </button>
                <button onClick={()=>reject(u.id,u.email)}
                  style={{background:'#FEE2E2',color:'#DC2626',border:'1px solid #FECACA',
                    borderRadius:8,padding:'8px 16px',cursor:'pointer',fontSize:13}}>
                  ❌ Rejeter
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && <ModalValidation user={modal} roles={roles}
        onConfirm={roleId=>activate(modal.id,roleId)} onClose={()=>setModal(null)}/>}
    </div>
  );
}

function ModalValidation({user,roles,onConfirm,onClose}) {
  const [roleId, setRoleId] = useState('');
  const ROLE_DESC = {
    'Opérateur Terrain':     'Saisit les NC depuis le terrain',
    'Responsable de Service':'Gère les NC de son service',
    'Responsable Qualité':   'Accès complet + rapports',
    'Direction Générale':    'Lecture seule + tableau de bord',
    'Administrateur':        'Accès total + gestion users',
  };
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',
      display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,fontFamily:'Arial'}}>
      <div style={{background:'#fff',borderRadius:14,padding:32,width:'100%',maxWidth:440,
                   boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
        <h2 style={{color:'#1F4E79',margin:'0 0 8px',fontSize:18}}>✅ Valider l'inscription</h2>
        <p style={{color:'#666',fontSize:13,margin:'0 0 20px'}}>Assignez un rôle à :</p>

        <div style={{background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:10,
                     padding:'12px 16px',marginBottom:20}}>
          <div style={{fontWeight:700,color:'#1F4E79'}}>{user.prenom} {user.nom}</div>
          <div style={{color:'#555',fontSize:13}}>{user.email}</div>
          <div style={{color:'#888',fontSize:12}}>Service : {user.service||'—'}</div>
        </div>

        <div style={{marginBottom:20}}>
          <label style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>
            Rôle à assigner *
          </label>
          <select value={roleId} onChange={e=>setRoleId(e.target.value)}
            style={{width:'100%',padding:'10px 12px',border:'1.5px solid #D1D5DB',
                    borderRadius:8,fontSize:14,outline:'none'}}>
            <option value="">-- Choisir un rôle --</option>
            {roles.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <div style={{marginTop:10,display:'flex',flexDirection:'column',gap:3}}>
            {Object.entries(ROLE_DESC).map(([r,d])=>(
              <div key={r} style={{fontSize:11,color:'#666'}}>
                <strong>{r}</strong> — {d}
              </div>
            ))}
          </div>
        </div>

        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button onClick={onClose}
            style={{background:'#F3F4F6',color:'#374151',border:'1px solid #D1D5DB',
                    borderRadius:8,padding:'10px 20px',cursor:'pointer',fontSize:14}}>
            Annuler
          </button>
          <button onClick={()=>roleId&&onConfirm(roleId)} disabled={!roleId}
            style={{background:roleId?'#1F4E79':'#9CA3AF',color:'#fff',border:'none',
                    borderRadius:8,padding:'10px 20px',
                    cursor:roleId?'pointer':'not-allowed',fontSize:14,fontWeight:600}}>
            ✅ Activer le compte
          </button>
        </div>
      </div>
    </div>
  );
}
