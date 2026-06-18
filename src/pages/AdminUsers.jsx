// src/pages/AdminUsers.jsx
import { useState, useEffect } from 'react';
import { C } from '../lib/theme.js';
import { Carte, Btn, Champ, Input, Select } from '../components/ui.jsx';
import { IUser, IPlus, ICheck, IAlerte, ICadenas } from '../components/Icones.jsx';

const BASE = '/api';
async function req(url, opts = {}) {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Erreur ${res.status}`);
  return data;
}

export default function AdminUsers() {
  const [users,   setUsers]   = useState([]);
  const [roles,   setRoles]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null); // null | 'create' | user object
  const [form,    setForm]    = useState({});
  const [msg,     setMsg]     = useState(null);

  const notify = (type, txt) => { setMsg({ type, txt }); setTimeout(() => setMsg(null), 4000); };

  const load = async () => {
    try {
      const [u, r] = await Promise.all([req('/users'), req('/users/roles/list')]);
      setUsers(u.data); setRoles(r.data);
    } catch (e) { notify('err', e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ nom: '', prenom: '', email: '', password: '', roleId: '', service: '', actif: 1 });
    setModal('create');
  };
  const openEdit = u => {
    setForm({ nom: u.nom, prenom: u.prenom, email: u.email, password: '',
              roleId: u.role_id || '', service: u.service || '', actif: u.actif });
    setModal(u);
  };
  const save = async () => {
    try {
      if (modal === 'create') await req('/users', { method: 'POST', body: JSON.stringify(form) });
      else await req(`/users/${modal.id}`, { method: 'PUT', body: JSON.stringify(form) });
      notify('ok', modal === 'create' ? 'Utilisateur créé.' : 'Mis à jour.');
      setModal(null); load();
    } catch (e) { notify('err', e.message); }
  };
  const unlock = async id => {
    try { await req(`/users/${id}/unlock`, { method: 'PUT' }); notify('ok', 'Compte déverrouillé.'); load(); }
    catch (e) { notify('err', e.message); }
  };
  const fc = k => e => setForm({ ...form, [k]: e.target.value });

  const ROLE_C = {
    admin: C.rouge, rq: C.bleu, direction: C.green,
    responsable_service: C.orange, operateur: C.gris,
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(20px,4vw,32px) clamp(16px,4vw,40px)' }}>

      {msg && (
        <div style={{ padding: '11px 15px', borderRadius: 10, marginBottom: 16, fontSize: 13.5, fontWeight: 500,
          background: msg.type === 'ok' ? C.greenBg : C.rougeBg,
          color: msg.type === 'ok' ? C.greenFonce : C.rouge,
          border: `1px solid ${msg.type === 'ok' ? C.greenBord : '#f0cfcc'}`,
          display: 'flex', alignItems: 'center', gap: 9 }}>
          {msg.type === 'ok' ? <ICheck t={17}/> : <IAlerte t={17}/>} {msg.txt}
        </div>
      )}

      <Carte
        titre="Gestion des Utilisateurs"
        icone={<IUser t={16}/>}
        action={
          <Btn variant="primary" onClick={openCreate}>
            <IPlus t={15}/> Nouvel utilisateur
          </Btn>
        }
      >
        <p style={{ color: C.texteDoux, fontSize: 13, margin: '0 0 18px' }}>
          {users.length} utilisateur(s) — 5 rôles RBAC
        </p>

        {loading
          ? <div style={{ padding: '32px 0', textAlign: 'center', color: C.texteDoux }}>Chargement…</div>
          : <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Nom', 'Email', 'Rôle', 'Service', 'Statut', 'Dernière connexion', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '9px 12px', fontSize: 12,
                        color: C.texteDoux, borderBottom: `2px solid ${C.border}`,
                        fontWeight: 600, background: C.surfaceAlt }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => {
                    const locked = u.locked_until && new Date(u.locked_until) > new Date();
                    const rc = ROLE_C[u.role] || C.gris;
                    return (
                      <tr key={u.id} style={{ background: i % 2 === 0 ? '#fff' : C.surfaceAlt }}>
                        <td style={TD}><strong style={{ color: C.texte }}>{u.prenom} {u.nom}</strong></td>
                        <td style={{ ...TD, color: C.texteDoux, fontSize: 12, fontFamily: C.policeMono }}>{u.email}</td>
                        <td style={TD}>
                          <span style={{ background: `${rc}22`, color: rc, padding: '3px 9px',
                            borderRadius: 10, fontSize: 12, fontWeight: 600 }}>
                            {u.role_label || u.role}
                          </span>
                        </td>
                        <td style={{ ...TD, color: C.texteDoux }}>{u.service || '—'}</td>
                        <td style={TD}>
                          {!u.actif
                            ? <Tag c={C.rouge}  bg={C.rougeBg}>Désactivé</Tag>
                            : locked
                            ? <Tag c={C.orange} bg={C.orangeBg}>Verrouillé</Tag>
                            : <Tag c={C.green}  bg={C.greenBg}>Actif</Tag>}
                        </td>
                        <td style={{ ...TD, fontSize: 12, color: C.texteFaible, fontFamily: C.policeMono }}>
                          {u.last_login ? new Date(u.last_login).toLocaleString('fr-FR') : 'Jamais'}
                        </td>
                        <td style={{ ...TD, display: 'flex', gap: 6 }}>
                          <Btn variant="ghost" onClick={() => openEdit(u)}>✏️ Modifier</Btn>
                          {locked && (
                            <Btn variant="ghost" onClick={() => unlock(u.id)}>
                              <ICadenas t={14}/> Déverrouiller
                            </Btn>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
        }
      </Carte>

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: C.rGrand, padding: 32,
            width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto',
            boxShadow: C.ombreFort }}>
            <h2 style={{ color: C.greenFonce, margin: '0 0 20px', fontSize: 17, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 9 }}>
              <IUser t={18}/> {modal === 'create' ? 'Créer un utilisateur' : `Modifier — ${modal.prenom} ${modal.nom}`}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Champ label="Prénom"><Input value={form.prenom || ''} onChange={fc('prenom')}/></Champ>
              <Champ label="Nom"><Input value={form.nom || ''} onChange={fc('nom')}/></Champ>
            </div>
            <Champ label="Email"><Input type="email" value={form.email || ''} onChange={fc('email')}/></Champ>
            {modal === 'create' && (
              <Champ label="Mot de passe"><Input type="password" value={form.password || ''} onChange={fc('password')}/></Champ>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Champ label="Rôle">
                <Select value={form.roleId || ''} onChange={fc('roleId')}>
                  <option value="">— Choisir —</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </Select>
              </Champ>
              <Champ label="Service"><Input value={form.service || ''} onChange={fc('service')}/></Champ>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <Btn variant="ghost" onClick={() => setModal(null)}>Annuler</Btn>
              <Btn variant="primary" onClick={save}>
                <ICheck t={15}/> {modal === 'create' ? 'Créer' : 'Enregistrer'}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Tag = ({ c, bg, children }) => (
  <span style={{ background: bg, color: c, padding: '3px 9px', borderRadius: 10, fontSize: 12, fontWeight: 600 }}>
    {children}
  </span>
);
const TD = { padding: '10px 12px', borderBottom: `1px solid ${C.border}`, verticalAlign: 'middle' };