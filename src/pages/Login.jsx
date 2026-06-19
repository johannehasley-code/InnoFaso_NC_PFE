// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { C } from '../lib/theme.js';
import { IBouclier, IHorloge } from '../components/Icones.jsx';
import fondQualite from '../assets/fond-controle-qualite.jpg';

const REDIRECTS = {
  operateur:           '/',
  responsable_service: '/',
  rq:                  '/',
  direction:           '/',
  admin:               '/',
};

// Icône œil SVG
const IEye = ({ open }) => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    {open
      ? <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>
      : <><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10 10 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></>
    }
  </svg>
);

export default function Login() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const [form,    setForm]    = useState({ email: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [pending, setPending] = useState(false);

  const onChange = e => { setForm({ ...form, [e.target.name]: e.target.value }); setError(''); setPending(false); };

  const onSubmit = async e => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Veuillez remplir tous les champs.'); return; }
    setLoading(true);
    try {
      const u = await login(form.email, form.password);
      navigate(REDIRECTS[u.role] || '/', { replace: true });
    } catch (err) {
      if (err.status === 403) setPending(true);
      setError(err.message || 'Erreur de connexion.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: C.police, position: 'relative', overflow: 'hidden' }}>

      {/* Photo de fond */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${fondQualite})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
      }} />

      {/* Calque vert Innofaso semi-transparent par-dessus la photo */}
      <div style={{
        position: 'absolute', inset: 0,
       background: `linear-gradient(135deg, ${C.greenEncreuse}80 0%, ${C.green}66 100%)`,
      }} />

      <div style={{ position: 'relative', zIndex: 1, background: '#fff', borderRadius: C.rGrand, padding: '40px 36px',
        width: '100%', maxWidth: 420, boxShadow: C.ombreFort }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 64, height: 64, borderRadius: 16, marginBottom: 14,
            background: `linear-gradient(135deg,${C.greenEncreuse},${C.green})`,
            color: '#fff', boxShadow: '0 4px 16px rgba(35,94,60,.4)' }}>
            <IBouclier t={32} />
          </div>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: C.greenFonce,
            fontFamily: C.police }}>INNOFASO</h1>
          <p style={{ margin: 0, fontSize: 13, color: C.texteDoux }}>Gestion des Non-Conformités</p>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: C.texte }}>Email</label>
            <input name="email" type="email" value={form.email} onChange={onChange}
              placeholder="votre@email.bf" disabled={loading} autoComplete="email"
              style={INP} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: C.texte }}>Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input name="password" type={showPwd ? 'text' : 'password'}
                value={form.password} onChange={onChange}
                placeholder="••••••••" disabled={loading} autoComplete="current-password"
                style={{ ...INP, paddingRight: 42 }} />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: C.texteDoux,
                  display: 'flex', alignItems: 'center' }}>
                <IEye open={showPwd} />
              </button>
            </div>
          </div>

          {pending && (
            <div style={{ background: C.orangeBg, border: `1px solid #f5c97a`,
              borderRadius: 8, padding: '12px 14px', fontSize: 13, color: C.orange,
              display: 'flex', alignItems: 'flex-start', gap: 9 }}>
              <IHorloge t={16} />
              <div>
                <strong>Compte en attente de validation</strong><br/>
                Un administrateur doit activer votre compte avant connexion.
              </div>
            </div>
          )}

          {error && !pending && (
            <div style={{ background: C.rougeBg, border: `1px solid #f0cfcc`,
              borderRadius: 8, color: C.rouge, padding: '10px 14px', fontSize: 13 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            background: `linear-gradient(135deg,${C.greenFonce},${C.green})`,
            color: '#fff', border: 'none', borderRadius: 8, padding: '12px',
            fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1, fontFamily: C.police }}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 13, color: C.texteDoux, margin: '4px 0 0' }}>
            Pas encore de compte ?{' '}
            <Link to="/register" style={{ color: C.green, fontWeight: 600, textDecoration: 'none' }}>
              Créer un compte
            </Link>
          </p>
        </form>

        <p style={{ textAlign: 'center', fontSize: 11, color: C.texteFaible, marginTop: 24 }}>
          Innofaso © 2026 — Usage interne uniquement
        </p>
      </div>
    </div>
  );
}

const INP = {
  padding: '10px 14px', border: `1.5px solid #D0D5DD`, borderRadius: 8,
  fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box',
  fontFamily: 'inherit', transition: 'border-color .15s',
};