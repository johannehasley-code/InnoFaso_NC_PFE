// src/pages/Register.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../lib/api.js';
import { C } from '../lib/theme.js';
import { IBouclier, ICheck, IAlerte, IUser } from '../components/Icones.jsx';

const SERVICES = ['Production','Qualité / SMI','Logistique','Maintenance',
  'Commercial','Direction','Informatique','RH','Finance','Autre'];

const pwdRules = pwd => ({
  length:  pwd.length >= 8,
  upper:   /[A-Z]/.test(pwd),
  digit:   /[0-9]/.test(pwd),
  special: /[^A-Za-z0-9]/.test(pwd),
});

const IEye = ({ open }) => (
  <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    {open
      ? <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>
      : <><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10 10 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></>
    }
  </svg>
);

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nom:'',prenom:'',email:'',password:'',confirmPassword:'',service:'' });
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);
  const [showPwd,  setShowPwd]  = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [emailOk,  setEmailOk]  = useState(null);

  const rules    = pwdRules(form.password);
  const pwdScore = Object.values(rules).filter(Boolean).length;
  const fc = k => e => { setForm({ ...form, [k]: e.target.value }); setError(''); };

  const checkEmail = async email => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) { setEmailOk(null); return; }
    try {
      const r = await authAPI.checkEmail(email);
      setEmailOk(!r.data.exists);
    } catch { setEmailOk(null); }
  };

  const validate = () => {
    if (!form.prenom.trim()) return 'Le prénom est requis.';
    if (!form.nom.trim())    return 'Le nom est requis.';
    if (!form.email.trim())  return "L'email est requis.";
    if (emailOk === false)   return 'Cet email est déjà utilisé.';
    if (!rules.length)       return 'Mot de passe : 8 caractères minimum.';
    if (!rules.upper)        return 'Mot de passe : au moins une majuscule.';
    if (!rules.digit)        return 'Mot de passe : au moins un chiffre.';
    if (form.password !== form.confirmPassword) return 'Les mots de passe ne correspondent pas.';
    return null;
  };

  const onSubmit = async e => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    try {
      await authAPI.register({ nom: form.nom.trim(), prenom: form.prenom.trim(),
        email: form.email.trim(), password: form.password, service: form.service });
      setSuccess(true);
    } catch (err) { setError(err.message || "Erreur lors de l'inscription."); }
    finally { setLoading(false); }
  };

  const SCORE_C = ['', C.rouge, C.orange, C.bleu, C.green];

  // Écran succès
  if (success) return (
    <div style={BG}>
      <div style={{ ...CARD, textAlign: 'center', padding: '48px 36px' }}>
        <div style={{ color: C.green, display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <ICheck t={56} />
        </div>
        <h2 style={{ color: C.greenFonce, margin: '0 0 12px', fontSize: 22, fontWeight: 700 }}>
          Inscription réussie !
        </h2>
        <p style={{ color: C.texteDoux, fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
          Votre compte a été créé avec succès.
        </p>
        <div style={{ background: C.orangeBg, border: `1px solid #f5c97a`, borderRadius: 10,
          padding: '14px 18px', margin: '0 0 24px', color: C.orange, fontSize: 13, lineHeight: 1.7 }}>
          <strong>En attente de validation</strong><br/>
          Un administrateur Innofaso doit activer votre compte avant connexion.
        </div>
        <button onClick={() => navigate('/login')} style={BTN}>
          ← Retour à la connexion
        </button>
      </div>
    </div>
  );

  return (
    <div style={BG}>
      <div style={CARD}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, borderRadius: 14, marginBottom: 10,
            background: `linear-gradient(135deg,${C.greenEncreuse},${C.green})`, color: '#fff' }}>
            <IBouclier t={28} />
          </div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: C.greenFonce }}>
            INNOFASO
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: C.texteDoux }}>Créer votre compte</p>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <F label="Prénom *"><input style={INP} value={form.prenom} onChange={fc('prenom')} placeholder="Aminata" disabled={loading}/></F>
            <F label="Nom *"><input style={INP} value={form.nom} onChange={fc('nom')} placeholder="Diallo" disabled={loading}/></F>
          </div>

          <F label="Adresse email *">
            <div style={{ position: 'relative' }}>
              <input style={{ ...INP, paddingRight: 36,
                borderColor: emailOk === false ? C.rouge : emailOk === true ? C.green : C.borderFort }}
                type="email" value={form.email}
                onChange={e => { fc('email')(e); checkEmail(e.target.value); }}
                placeholder="votre@email.bf" disabled={loading} />
              {emailOk === true  && <span style={EYE_POS}><ICheck t={15}/></span>}
              {emailOk === false && <span style={{ ...EYE_POS, color: C.rouge }}><IAlerte t={15}/></span>}
            </div>
            {emailOk === false && <small style={{ color: C.rouge, fontSize: 12 }}>Cet email est déjà utilisé.</small>}
          </F>

          <F label="Service / Département">
            <select style={INP} value={form.service} onChange={fc('service')} disabled={loading}>
              <option value="">-- Sélectionner votre service --</option>
              {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </F>

          <F label="Mot de passe *">
            <div style={{ position: 'relative' }}>
              <input style={{ ...INP, paddingRight: 42 }}
                type={showPwd ? 'text' : 'password'} value={form.password}
                onChange={fc('password')} placeholder="Min. 8 caractères" disabled={loading} />
              <button type="button" style={EYE_BTN} onClick={() => setShowPwd(!showPwd)}>
                <IEye open={showPwd} />
              </button>
            </div>
            {form.password && (
              <div style={{ marginTop: 6 }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, transition: 'background .3s',
                      background: pwdScore >= i ? SCORE_C[pwdScore] : C.bgVoile }} />
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 10px' }}>
                  {[[rules.length,'8 car. min.'],[rules.upper,'1 majuscule'],
                    [rules.digit,'1 chiffre'],[rules.special,'1 spécial']].map(([ok, lb]) => (
                    <span key={lb} style={{ fontSize: 11, color: ok ? C.green : C.texteFaible,
                      display: 'flex', alignItems: 'center', gap: 3 }}>
                      {ok ? <ICheck t={11}/> : '○'} {lb}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </F>

          <F label="Confirmer le mot de passe *">
            <div style={{ position: 'relative' }}>
              <input style={{ ...INP, paddingRight: 42,
                borderColor: form.confirmPassword
                  ? (form.password === form.confirmPassword ? C.green : C.rouge)
                  : C.borderFort }}
                type={showPwd2 ? 'text' : 'password'} value={form.confirmPassword}
                onChange={fc('confirmPassword')} placeholder="Répétez votre mot de passe" disabled={loading} />
              <button type="button" style={EYE_BTN} onClick={() => setShowPwd2(!showPwd2)}>
                <IEye open={showPwd2} />
              </button>
            </div>
            {form.confirmPassword && form.password !== form.confirmPassword && (
              <small style={{ color: C.rouge, fontSize: 12 }}>Les mots de passe ne correspondent pas.</small>
            )}
          </F>

          {error && (
            <div style={{ background: C.rougeBg, border: `1px solid #f0cfcc`,
              borderRadius: 8, color: C.rouge, padding: '10px 14px', fontSize: 13 }}>
              {error}
            </div>
          )}

          <button type="submit" style={{ ...BTN, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? 'Inscription…' : 'Créer mon compte'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 13, color: C.texteDoux, margin: '4px 0 0' }}>
            Déjà un compte ?{' '}
            <Link to="/login" style={{ color: C.green, fontWeight: 600, textDecoration: 'none' }}>
              Se connecter
            </Link>
          </p>
        </form>

        <p style={{ textAlign: 'center', fontSize: 11, color: C.texteFaible, marginTop: 16 }}>
          Innofaso © 2026 — Usage interne uniquement
        </p>
      </div>
    </div>
  );
}

const F = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    <label style={{ fontSize: 13, fontWeight: 600, color: C.texte }}>{label}</label>
    {children}
  </div>
);

const BG   = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
               padding: 20, fontFamily: C.police,
               background: `linear-gradient(135deg,${C.greenEncreuse} 0%,${C.green} 100%)` };
const CARD = { background: '#fff', borderRadius: C.rGrand, padding: '36px 32px',
               width: '100%', maxWidth: 480, boxShadow: C.ombreFort };
const INP  = { padding: '9px 12px', border: `1.5px solid ${C.borderFort}`, borderRadius: 8,
               fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box',
               fontFamily: 'inherit', transition: 'border-color .2s' };
const BTN  = { background: `linear-gradient(135deg,${C.greenFonce},${C.green})`, color: '#fff',
               border: 'none', borderRadius: 8, padding: '12px', fontSize: 15,
               fontWeight: 600, cursor: 'pointer', width: '100%', fontFamily: 'inherit' };
const EYE_BTN = { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: C.texteDoux,
                  display: 'flex', alignItems: 'center' };
const EYE_POS = { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  display: 'flex', color: C.green };