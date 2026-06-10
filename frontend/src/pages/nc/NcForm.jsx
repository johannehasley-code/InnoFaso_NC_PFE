// src/pages/nc/NcForm.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ncAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function NcForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({
    titre:'', description:'', service_emetteur: user?.service||'',
    criticite:'mineure', date_detection: new Date().toISOString().slice(0,10),
    date_echeance:'',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  const fc = k => e => setForm({...form, [k]:e.target.value});

  const onSubmit = async e => {
    e.preventDefault();
    if (!form.titre.trim()) { setError('Le titre est obligatoire.'); return; }
    setLoading(true); setError('');
    try {
      const r = await ncAPI.create(form);
      setSuccess(`✅ NC créée : ${r.data.data.numero_nc}`);
      setTimeout(() => navigate('/nc'), 2000);
    } catch(err) {
      setError(err.response?.data?.message || 'Erreur lors de la création.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth:700, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <button onClick={() => navigate('/nc')}
          style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#666'}}>←</button>
        <div>
          <h1 style={{ color:'#1F4E79', margin:0 }}>➕ Nouvelle Non-Conformité</h1>
          <p style={{ color:'#666', fontSize:13, margin:'4px 0 0' }}>
            Sprint 4 — Formulaire NC Digital (F01)
          </p>
        </div>
      </div>

      {error   && <div style={ERR}>{error}</div>}
      {success && <div style={SUC}>{success}</div>}

      <form onSubmit={onSubmit}
        style={{ background:'#fff', borderRadius:10, padding:28, border:'1px solid #E5E7EB' }}>

        <Section title="1. Identification">
          <div style={GRID2}>
            <Field label="Service émetteur">
              <input style={INP} value={form.service_emetteur} onChange={fc('service_emetteur')}
                placeholder="ex: Production"/>
            </Field>
            <Field label="Date de détection">
              <input style={INP} type="date" value={form.date_detection} onChange={fc('date_detection')}/>
            </Field>
          </div>
          <Field label="Criticité *">
            <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:4 }}>
              {['observation','mineure','majeure','critique'].map(c => {
                const colors={observation:'#059669',mineure:'#D97706',majeure:'#DC2626',critique:'#7C3AED'};
                const active = form.criticite===c;
                return (
                  <label key={c} style={{ display:'flex', alignItems:'center', gap:6,
                    padding:'6px 14px', borderRadius:20, cursor:'pointer', fontSize:13, fontWeight:500,
                    background: active ? `${colors[c]}22` : '#F3F4F6',
                    border: `1.5px solid ${active ? colors[c] : '#E5E7EB'}`,
                    color: active ? colors[c] : '#555' }}>
                    <input type="radio" name="criticite" value={c}
                      checked={active} onChange={fc('criticite')} style={{display:'none'}}/>
                    {c.charAt(0).toUpperCase()+c.slice(1)}
                  </label>
                );
              })}
            </div>
          </Field>
        </Section>

        <Section title="2. Description de la non-conformité">
          <Field label="Titre *">
            <input style={INP} value={form.titre} onChange={fc('titre')}
              placeholder="Résumé court de la non-conformité" required/>
          </Field>
          <Field label="Description détaillée">
            <textarea style={{...INP, height:100, resize:'vertical'}}
              value={form.description} onChange={fc('description')}
              placeholder="Décrivez la non-conformité constatée..."/>
          </Field>
        </Section>

        <Section title="3. Action immédiate">
          <Field label="Date d'échéance souhaitée">
            <input style={{...INP, maxWidth:200}} type="date"
              value={form.date_echeance} onChange={fc('date_echeance')}/>
          </Field>
        </Section>

        <div style={{ display:'flex', gap:12, justifyContent:'flex-end', marginTop:8 }}>
          <button type="button" onClick={() => navigate('/nc')}
            style={{ padding:'10px 20px', background:'#F3F4F6', border:'1px solid #D1D5DB',
                     borderRadius:8, cursor:'pointer', fontSize:14 }}>
            Annuler
          </button>
          <button type="submit" disabled={loading}
            style={{ padding:'10px 24px', background:'#1F4E79', color:'#fff',
                     border:'none', borderRadius:8, cursor:'pointer', fontSize:14,
                     fontWeight:600, opacity:loading?0.7:1 }}>
            {loading ? '⏳ Envoi...' : '✅ Soumettre la NC'}
          </button>
        </div>
      </form>
    </div>
  );
}

const Section = ({ title, children }) => (
  <div style={{ marginBottom:24 }}>
    <div style={{ fontWeight:700, color:'#1F4E79', fontSize:14, marginBottom:12,
                  paddingBottom:6, borderBottom:'2px solid #D6E4F0' }}>
      {title}
    </div>
    {children}
  </div>
);

const Field = ({ label, children }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14 }}>
    <label style={{ fontSize:13, fontWeight:600, color:'#374151' }}>{label}</label>
    {children}
  </div>
);

const GRID2 = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 };
const INP   = { padding:'9px 12px', border:'1.5px solid #D1D5DB', borderRadius:8,
                fontSize:14, outline:'none', width:'100%', boxSizing:'border-box' };
const ERR   = { background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626',
                borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13 };
const SUC   = { background:'#F0FDF4', border:'1px solid #A7F3D0', color:'#059669',
                borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13 };
