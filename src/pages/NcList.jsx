// src/pages/NcList.jsx
import { useState, useEffect } from 'react';
import { C } from '../lib/theme.js';
import { api } from '../lib/api.js';
import { Carte, Btn, BadgeStatut, BadgeCriticite } from '../components/ui.jsx';
import { IFiche, IPlus, IRecherche, IRetour } from '../components/Icones.jsx';

export default function NcList({ onOuvrir, onNouveau }) {
  const [ncs,     setNcs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ statut: '', criticite: '' });

  const load = async () => {
    setLoading(true);
    try { const data = await api.listerNc(); setNcs(data); }
    catch { setNcs([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const ncsFiltrees = ncs.filter(nc =>
    (!filters.statut    || nc.statut    === filters.statut) &&
    (!filters.criticite || nc.criticite === filters.criticite)
  );

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(20px,4vw,32px) clamp(16px,4vw,40px)' }}>

      <Carte
        titre="Non-Conformités"
        icone={<IFiche t={16}/>}
        action={
          <Btn variant="primary" onClick={onNouveau}>
            <IPlus t={15}/> Nouvelle NC
          </Btn>
        }
      >
        {/* Filtres */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: C.texteDoux, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <IRecherche t={15}/> Filtrer :
          </span>
          {[
            { k: 'statut',    opts: ['', 'brouillon', 'ouverte', 'en_cours', 'cloturee'], label: 'Statut' },
            { k: 'criticite', opts: ['', 'faible', 'moyenne', 'elevee', 'critique'],      label: 'Criticité' },
          ].map(f => (
            <select key={f.k} value={filters[f.k]}
              onChange={e => setFilters({ ...filters, [f.k]: e.target.value })}
              style={{ padding: '7px 12px', border: `1px solid ${C.borderFort}`, borderRadius: 8,
                fontSize: 13, fontFamily: C.police, color: C.texte, background: '#fff', cursor: 'pointer' }}>
              {f.opts.map(o => <option key={o} value={o}>{o || `Tous (${f.label})`}</option>)}
            </select>
          ))}
          <Btn variant="ghost" onClick={load}><IRecherche t={14}/> Actualiser</Btn>
          <span style={{ marginLeft: 'auto', fontSize: 13, color: C.texteDoux, fontFamily: C.policeMono }}>
            {ncsFiltrees.length} résultat(s)
          </span>
        </div>

        {loading
          ? <div style={{ padding: '32px 0', textAlign: 'center', color: C.texteDoux }}>Chargement…</div>
          : ncsFiltrees.length === 0
          ? <div style={{ padding: '40px 0', textAlign: 'center', color: C.texteFaible }}>
              <div style={{ color: C.borderFort, display: 'flex', justifyContent: 'center', marginBottom: 10 }}><IFiche t={40}/></div>
              <div style={{ fontWeight: 600, color: C.texte, marginBottom: 4 }}>Aucune NC trouvée</div>
              <div style={{ fontSize: 13 }}>Modifiez les filtres ou créez une nouvelle fiche.</div>
            </div>
          : <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Numéro NC', 'Intitulé', 'Service', 'Criticité', 'Statut', 'Émetteur', 'Date', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '9px 12px', fontSize: 12,
                        color: C.texteDoux, borderBottom: `2px solid ${C.border}`, fontWeight: 600,
                        background: C.surfaceAlt, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ncsFiltrees.map((nc, i) => (
                    <tr key={nc.id}
                      style={{ background: i % 2 === 0 ? '#fff' : C.surfaceAlt, transition: 'background .12s', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = C.greenBg}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : C.surfaceAlt}>
                      <td style={TD}>
                        <span style={{ fontFamily: C.policeMono, color: C.green, fontWeight: 700, fontSize: 13 }}>
                          {nc.numero || '—'}
                        </span>
                      </td>
                      <td style={{ ...TD, maxWidth: 220 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
                          {nc.intitule || nc.titre || '—'}
                        </div>
                      </td>
                      <td style={{ ...TD, color: C.texteDoux }}>{nc.service || '—'}</td>
                      <td style={TD}><BadgeCriticite criticite={nc.criticite} /></td>
                      <td style={TD}><BadgeStatut statut={nc.statut} /></td>
                      <td style={{ ...TD, color: C.texteDoux, fontSize: 12 }}>{nc.emetteur || '—'}</td>
                      <td style={{ ...TD, color: C.texteFaible, fontSize: 12, fontFamily: C.policeMono }}>
                        {nc.creeLe ? new Date(nc.creeLe).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td style={TD}>
                        <Btn variant="ghost" onClick={() => onOuvrir(nc.id)}>
                          <IRetour t={13}/> Ouvrir
                        </Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </Carte>
    </div>
  );
}

const TD = { padding: '10px 12px', borderBottom: `1px solid ${C.border}`, verticalAlign: 'middle' };