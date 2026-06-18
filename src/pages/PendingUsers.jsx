// src/pages/PendingUsers.jsx
import { useState, useEffect } from 'react';
import { C } from '../lib/theme.js';
import { Carte, Btn, Champ, Select } from '../components/ui.jsx';
import { IUser, ICheck, IAlerte, IHorloge } from '../components/Icones.jsx';

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

export default function PendingUsers() {
  const [pending, setPending] = useState([]);
  const [roles,   setRoles]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg,     setMsg]     = useState(null);
  const [modal,   setModal]   = useState(null);

  const notify = (type, txt) => { setMsg({ type, txt }); setTimeout(() => setMsg(null), 4000); };

  const load = async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([req('/users/pending/list'), req('/users/roles/list')]);
      setPending(u.data); setRoles(r.data);
    } catch (e) { notify('err', e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const activate = async (userId, roleId) => {
    try {
      await req(`/users/${userId}/activate`, { method: 'PUT', body: JSON.stringify({ roleId }) });
      notify('ok', 'Compte activé avec succès.');
      setModal(null); load();
    } catch (e) { notify('err', e.message); }
  };

  const reject = async (userId, email) => {
    if (!window.confirm(`Rejeter et supprimer le compte de ${email} ?`)) return;
    try {
      await req(`/users/${userId}/reject`, { method: 'DELETE' });
      notify('ok', 'Inscription rejetée.');
      load();
    } catch (e) { notify('err', e.message); }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(20px,4vw,32px) clamp(16px,4vw,40px)' }}>

      {msg && (
        <div style={{ padding: '11px 15px', borderRadius: 10, marginBottom: 16, fontSize: 13.5, fontWeight: 500,
          background: msg.type === 'ok' ? C.greenBg : C.rougeBg,
          color: msg.type === 'ok' ? C.greenFonce : C.rouge,
          border: `1px solid ${msg.type === 'ok' ? C.greenBord : '#f0cfcc'}`,
          display: 'flex', alignItems: 'center', gap: 9 }}>
          {msg.type === 'ok' ? <ICheck t={17}/> : <IAlerte t={17}/>} {msg.txt}
        </div>
      )}

      <Carte titre="Inscriptions en attente" icone={<IHorloge t={16}/>}>
        <p style={{ color: C.texteDoux, fontSize: 13, margin: '0 0 20px' }}>
          {pending.length} demande(s) — Activez chaque compte et assignez un rôle.
        </p>

        {loading
          ? <div style={{ padding: '32px 0', textAlign: 'center', color: C.texteDoux }}>Chargement…</div>
          : pending.length === 0
          ? <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <div style={{ color: C.green, display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <ICheck t={48}/>
              </div>
              <div style={{ fontWeight: 600, color: C.texte, marginBottom: 4 }}>Aucune inscription en attente</div>
              <div style={{ fontSize: 13, color: C.texteDoux }}>Toutes les demandes ont été traitées.</div>
            </div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pending.map(u => (
                <div key={u.id} style={{ background: C.surfaceAlt, borderRadius: C.r,
                  padding: '16px 20px', border: `1px solid ${C.border}`,
                  display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>

                  {/* Avatar */}
                  <div style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                    background: `linear-gradient(135deg,${C.greenFonce},${C.green})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: 17 }}>
                    {u.prenom?.[0]?.toUpperCase()}{u.nom?.[0]?.toUpperCase()}
                  </div>

                  {/* Infos */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 700, color: C.texte, fontSize: 15 }}>
                      {u.prenom} {u.nom}
                    </div>
                    <div style={{ color: C.texteDoux, fontSize: 13, fontFamily: C.policeMono }}>{u.email}</div>
                    <div style={{ color: C.texteFaible, fontSize: 12, marginTop: 2 }}>
                      Service : {u.service || '—'} ·{' '}
                      Inscrit le {u.date_inscription ? new Date(u.date_inscription).toLocaleDateString('fr-FR') : '—'}
                    </div>
                  </div>

                  {/* Badge */}
                  <span style={{ background: C.orangeBg, color: C.orange,
                    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 6 }}>
                    <IHorloge t={13}/> En attente
                  </span>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn variant="primary" onClick={() => setModal(u)}>
                      <ICheck t={14}/> Valider
                    </Btn>
                    <Btn variant="danger" onClick={() => reject(u.id, u.email)}>
                      Rejeter
                    </Btn>
                  </div>
                </div>
              ))}
            </div>
        }
      </Carte>

      {modal && (
        <ModalValidation user={modal} roles={roles}
          onConfirm={roleId => activate(modal.id, roleId)}
          onClose={() => setModal(null)} />
      )}
    </div>
  );
}

function ModalValidation({ user, roles, onConfirm, onClose }) {
  const [roleId, setRoleId] = useState('');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: C.rGrand, padding: 32,
        width: '100%', maxWidth: 440, boxShadow: C.ombreFort }}>
        <h2 style={{ color: C.greenFonce, margin: '0 0 8px', fontSize: 17, fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 9 }}>
          <IUser t={18}/> Valider l'inscription
        </h2>
        <p style={{ color: C.texteDoux, fontSize: 13, margin: '0 0 20px' }}>Assignez un rôle à :</p>

        <div style={{ background: C.greenBg, border: `1px solid ${C.greenBord}`,
          borderRadius: C.r, padding: '12px 16px', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: C.greenFonce }}>{user.prenom} {user.nom}</div>
          <div style={{ color: C.texteDoux, fontSize: 13, fontFamily: C.policeMono }}>{user.email}</div>
          <div style={{ color: C.texteFaible, fontSize: 12 }}>Service : {user.service || '—'}</div>
        </div>

        <Champ label="Rôle à assigner" obligatoire>
          <Select value={roleId} onChange={e => setRoleId(e.target.value)}>
            <option value="">— Choisir un rôle —</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </Select>
        </Champ>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <Btn variant="ghost" onClick={onClose}>Annuler</Btn>
          <Btn variant="primary" disabled={!roleId} onClick={() => roleId && onConfirm(roleId)}>
            <ICheck t={15}/> Activer le compte
          </Btn>
        </div>
      </div>
    </div>
  );
}