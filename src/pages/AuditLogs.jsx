// src/pages/AuditLogs.jsx
import { useState, useEffect } from 'react';
import { C } from '../lib/theme.js';
import { Carte, Btn } from '../components/ui.jsx';
import { IRecherche, IAlerte, IUser, ICheck, ICadenas } from '../components/Icones.jsx';

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

const ACTION_STYLE = {
  LOGIN_SUCCESS:    { bg: C.greenBg,   c: C.greenFonce, icone: <ICheck t={13}/> },
  LOGIN_FAILED:     { bg: C.rougeBg,   c: C.rouge,      icone: <IAlerte t={13}/> },
  LOGIN_BLOCKED:    { bg: C.orangeBg,  c: C.orange,     icone: <ICadenas t={13}/> },
  LOGOUT:           { bg: C.bgVoile,   c: C.gris,       icone: <IUser t={13}/> },
  CREATE_USER:      { bg: C.bleuBg,    c: C.bleu,       icone: <IUser t={13}/> },
  UPDATE_USER:      { bg: '#ede9fe',   c: '#5b21b6',    icone: <IUser t={13}/> },
  UNLOCK_USER:      { bg: C.greenBg,   c: C.greenFonce, icone: <ICadenas t={13}/> },
  CREATE_NC:        { bg: C.bleuBg,    c: C.bleu,       icone: <ICheck t={13}/> },
  UPDATE_NC_STATUT: { bg: C.orangeBg,  c: C.orange,     icone: <IAlerte t={13}/> },
  USER_REGISTERED:  { bg: C.greenBg,   c: C.greenFonce, icone: <IUser t={13}/> },
};

export default function AuditLogs() {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  const load = async (action = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 200, ...(action ? { action } : {}) });
      const r = await req(`/audit-logs?${params}`);
      setLogs(r.data);
    } catch { setLogs([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const logsFiltres = logs.filter(l =>
    !search || l.action?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(20px,4vw,32px) clamp(16px,4vw,40px)' }}>

      <Carte titre="Journal d'Audit" icone={<IRecherche t={16}/>}>
        <p style={{ color: C.texteDoux, fontSize: 13, margin: '0 0 18px' }}>
          Toutes les actions sont enregistrées automatiquement et ne peuvent pas être modifiées.
        </p>

        {/* Filtre */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
              color: C.texteDoux, display: 'flex' }}><IRecherche t={16}/></span>
            <input
              placeholder="Filtrer par action (ex: LOGIN)…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '9px 12px 9px 36px', border: `1px solid ${C.borderFort}`,
                borderRadius: 8, fontSize: 13, fontFamily: C.police, color: C.texte,
                background: '#fff', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <Btn variant="ghost" onClick={() => load(search)}>
            <IRecherche t={14}/> Rechercher
          </Btn>
          <span style={{ marginLeft: 'auto', fontSize: 13, color: C.texteDoux, fontFamily: C.policeMono }}>
            {logsFiltres.length} entrée(s)
          </span>
        </div>

        {loading
          ? <div style={{ padding: '32px 0', textAlign: 'center', color: C.texteDoux }}>Chargement…</div>
          : <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Date / Heure', 'Utilisateur', 'Rôle', 'Action', 'Table', 'ID', 'IP'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '9px 12px', fontSize: 12,
                        color: C.texteDoux, borderBottom: `2px solid ${C.border}`,
                        fontWeight: 600, background: C.surfaceAlt, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logsFiltres.map((l, i) => {
                    const a = ACTION_STYLE[l.action] || { bg: C.bgVoile, c: C.gris, icone: null };
                    return (
                      <tr key={l.id} style={{ background: i % 2 === 0 ? '#fff' : C.surfaceAlt }}>
                        <td style={{ ...TD, fontFamily: C.policeMono, fontSize: 12, color: C.texteDoux, whiteSpace: 'nowrap' }}>
                          {new Date(l.created_at).toLocaleString('fr-FR')}
                        </td>
                        <td style={TD}>
                          {l.prenom ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ width: 26, height: 26, borderRadius: '50%',
                                background: C.greenBg, color: C.green,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                                {l.prenom[0]}{l.nom?.[0]}
                              </span>
                              {l.prenom} {l.nom}
                            </span>
                          ) : <span style={{ color: C.texteFaible }}>—</span>}
                        </td>
                        <td style={{ ...TD, color: C.texteDoux, fontSize: 12 }}>{l.role || '—'}</td>
                        <td style={TD}>
                          <span style={{ background: a.bg, color: a.c,
                            padding: '3px 9px', borderRadius: 10, fontSize: 11.5, fontWeight: 600,
                            display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                            {a.icone} {l.action}
                          </span>
                        </td>
                        <td style={{ ...TD, color: C.texteDoux, fontSize: 12 }}>{l.target_table || '—'}</td>
                        <td style={{ ...TD, color: C.texteFaible, fontSize: 12, fontFamily: C.policeMono }}>{l.target_id || '—'}</td>
                        <td style={{ ...TD, fontFamily: C.policeMono, fontSize: 11, color: C.texteFaible }}>{l.ip_address || '—'}</td>
                      </tr>
                    );
                  })}
                  {!logsFiltres.length && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: C.texteFaible }}>
                      Aucun log trouvé.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
        }
      </Carte>
    </div>
  );
}

const TD = { padding: '10px 12px', borderBottom: `1px solid ${C.border}`, verticalAlign: 'middle', fontSize: 13 };