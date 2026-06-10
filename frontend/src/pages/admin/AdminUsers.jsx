// src/pages/admin/AdminUsers.jsx
import React, { useState, useEffect } from 'react';
import { usersAPI } from '../../services/api';

const ROLE_C = {
  admin:'#92400E', rq:'#1D4ED8', direction:'#065F46',
  responsable_service:'#5B21B6', operateur:'#374151',
};

export default function AdminUsers() {
  const [users,   setUsers]   = useState([]);
  const [roles,   setRoles]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null);
  const [form,    setForm]    = useState({});
  const [msg,     setMsg]     = useState('');

  const load = async () => {
    try {
      const [u,r] = await Promise.all([usersAPI.getAll(), usersAPI.getRoles()]);
      setUsers(u.data.data); setRoles(r.data.data);
    } catch { setMsg('❌ Erreur chargement.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ nom:'',prenom:'',email:'',password:'',roleId:'',service:'',actif:1 });
    setModal('create');
  };
  const openEdit = u => {
    setForm({ nom:u.nom,prenom:u.prenom,email:u.email,password:'',
              roleId:u.role_id||'',service:u.service||'',actif:u.actif });
    setModal(u);
  };
  const save = async () => {
    try {
      if (modal==='create') await usersAPI.create(form);
      else await usersAPI.update(modal.id, form);
      setMsg(modal==='create' ? '✅ Utilisateur créé.' : '✅ Mis à jour.');
      setModal(null); load();
    } catch(e) { setMsg('❌ '+(e.response?.data?.message||'Erreur.')); }
  };
  const unlock = async id => {
    await usersAPI.unlock(id); setMsg('✅ Compte déverrouillé.'); load();
  };
  const fc = k => e => setForm({...form,[k]:e.target.value});

  if (loading) return <p style={{padding:32,color:'#666'}}>Chargement...</p>;

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h1 style={{ color:'#1F4E79', margin:0 }}>👥 Gestion des Utilisateurs</h1>
          <p style={{ color:'#666', fontSize:13, margin:'4px 0 0' }}>{users.length} utilisateur(s) — 5 rôles RBAC</p>
        </div>
        <button onClick={openCreate} style={BTN_P}>+ Nouvel utilisateur</button>
      </div>

      {msg && <div style={{ background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:8,
        padding:'10px 14px', marginBottom:16, color:'#1D4ED8', fontSize:13 }}>{msg}</div>}

      <div style={{ background:'#fff', borderRadius:10, border:'1px solid #E5E7EB', overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>{['Nom','Email','Rôle','Service','Statut','Dernière connexion','Actions']
              .map(h=><th key={h} style={{ background:'#1F4E79',color:'#fff',
                padding:'10px 12px',textAlign:'left',fontSize:13 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {users.map((u,i)=>{
              const locked = u.locked_until && new Date(u.locked_until) > new Date();
              const rc = ROLE_C[u.role]||'#374151';
              return (
                <tr key={u.id} style={{background:i%2===0?'#fff':'#F9FAFB'}}>
                  <td style={TD}><strong>{u.prenom} {u.nom}</strong></td>
                  <td style={{...TD,color:'#555',fontSize:12}}>{u.email}</td>
                  <td style={TD}>
                    <span style={{background:`${rc}22`,color:rc,padding:'2px 8px',
                      borderRadius:10,fontSize:12,fontWeight:500}}>
                      {u.role_label||u.role}
                    </span>
                  </td>
                  <td style={TD}>{u.service||'–'}</td>
                  <td style={TD}>
                    {!u.actif   ? <Tag c="#991B1B" bg="#FEE2E2">Désactivé</Tag>
                   : locked     ? <Tag c="#92400E" bg="#FEF3C7">Verrouillé</Tag>
                                : <Tag c="#065F46" bg="#D1FAE5">Actif</Tag>}
                  </td>
                  <td style={{...TD,fontSize:12,color:'#888'}}>
                    {u.last_login ? new Date(u.last_login).toLocaleString('fr-FR') : 'Jamais'}
                  </td>
                  <td style={TD}>
                    <button style={BTN_SM} onClick={()=>openEdit(u)}>✏️</button>
                    {locked && <button style={{...BTN_SM,marginLeft:4}} onClick={()=>unlock(u.id)}>🔓</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {modal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',
                      display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000 }}>
          <div style={{ background:'#fff',borderRadius:12,padding:32,
                        width:'100%',maxWidth:500,maxHeight:'90vh',overflowY:'auto' }}>
            <h2 style={{ color:'#1F4E79',margin:'0 0 20px' }}>
              {modal==='create' ? '➕ Créer un utilisateur' : `✏️ Modifier — ${modal.prenom} ${modal.nom}`}
            </h2>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              {[['prenom','Prénom'],['nom','Nom']].map(([k,lb])=>(
                <F key={k} label={lb}><input style={INP} value={form[k]||''} onChange={fc(k)}/></F>
              ))}
            </div>
            <F label="Email"><input style={INP} type="email" value={form.email||''} onChange={fc('email')}/></F>
            {modal==='create' && <F label="Mot de passe"><input style={INP} type="password" value={form.password||''} onChange={fc('password')}/></F>}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <F label="Rôle">
                <select style={INP} value={form.roleId||''} onChange={fc('roleId')}>
                  <option value="">-- Choisir --</option>
                  {roles.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </F>
              <F label="Service"><input style={INP} value={form.service||''} onChange={fc('service')}/></F>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:12}}>
              <button style={BTN_S} onClick={()=>setModal(null)}>Annuler</button>
              <button style={BTN_P} onClick={save}>
                {modal==='create' ? 'Créer' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Tag = ({c,bg,children}) => (
  <span style={{background:bg,color:c,padding:'2px 8px',borderRadius:10,fontSize:12}}>{children}</span>
);
const F = ({label,children}) => (
  <div style={{display:'flex',flexDirection:'column',gap:5,marginBottom:14}}>
    <label style={{fontSize:13,fontWeight:600,color:'#374151'}}>{label}</label>
    {children}
  </div>
);
const TD   = { padding:'10px 12px',fontSize:13,borderBottom:'1px solid #F3F4F6',verticalAlign:'middle' };
const BTN_P = { background:'#1F4E79',color:'#fff',border:'none',borderRadius:8,
                padding:'10px 20px',cursor:'pointer',fontSize:14,fontWeight:600 };
const BTN_S = { background:'#F3F4F6',color:'#374151',border:'1px solid #D1D5DB',
                borderRadius:8,padding:'10px 20px',cursor:'pointer',fontSize:14 };
const BTN_SM= { background:'#F3F4F6',border:'1px solid #D1D5DB',borderRadius:6,
                padding:'4px 8px',cursor:'pointer',fontSize:14 };
const INP   = { padding:'9px 12px',border:'1.5px solid #D1D5DB',borderRadius:8,
                fontSize:14,outline:'none',width:'100%',boxSizing:'border-box' };
