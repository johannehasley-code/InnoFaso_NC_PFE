// src/pages/auth/Register.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';

const SERVICES = ['Production','Qualité','Logistique','Maintenance',
  'Commercial','Direction','Informatique','RH','Finance','Autre'];

const pwdRules = pwd => ({
  length:  pwd.length >= 8,
  upper:   /[A-Z]/.test(pwd),
  digit:   /[0-9]/.test(pwd),
  special: /[^A-Za-z0-9]/.test(pwd),
});

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nom:'',prenom:'',email:'',
    password:'',confirmPassword:'',service:'' });
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);
  const [showPwd,  setShowPwd]  = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [emailOk,  setEmailOk]  = useState(null);

  const rules = pwdRules(form.password);
  const pwdScore = Object.values(rules).filter(Boolean).length;
  const fc = k => e => { setForm({...form,[k]:e.target.value}); setError(''); };

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
    if (!form.email.trim())  return 'L\'email est requis.';
    if (!/\S+@\S+\.\S+/.test(form.email)) return 'Email invalide.';
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
      await authAPI.register({
        nom: form.nom.trim(), prenom: form.prenom.trim(),
        email: form.email.trim(), password: form.password,
        service: form.service,
      });
      setSuccess(true);
    } catch(err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'inscription.');
    } finally { setLoading(false); }
  };

  // ── Écran de succès ────────────────────────────────────────
  if (success) return (
    <div style={S.bg}>
      <div style={{...S.card,textAlign:'center',padding:'48px 36px'}}>
        <div style={{fontSize:64,marginBottom:16}}>✅</div>
        <h2 style={{color:'#059669',margin:'0 0 12px',fontSize:22}}>Inscription réussie !</h2>
        <p style={{color:'#555',fontSize:14,lineHeight:1.7,marginBottom:12}}>
          Votre compte a été créé avec succès.
        </p>
        <div style={{background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:10,
                     padding:'14px 18px',margin:'0 0 24px',color:'#92400E',fontSize:13,lineHeight:1.7}}>
          <strong>⏳ En attente de validation</strong><br/>
          Un administrateur Innofaso doit activer votre compte avant
          que vous puissiez vous connecter.<br/>
          Contactez votre responsable pour accélérer la validation.
        </div>
        <button onClick={() => navigate('/login')} style={{...S.btnPrimary,display:'inline-block',width:'auto',padding:'12px 32px'}}>
          ← Retour à la connexion
        </button>
      </div>
    </div>
  );

  // ── Formulaire ─────────────────────────────────────────────
  return (
    <div style={S.bg}>
      <div style={S.card}>
        <div style={S.header}>
          <div style={S.logo}>INN</div>
          <h1 style={S.h1}>INNOFASO</h1>
          <p style={S.sub}>Créer votre compte</p>
        </div>

        <form onSubmit={onSubmit} style={S.form}>

          {/* Prénom + Nom */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <F label="Prénom *">
              <input style={S.inp} value={form.prenom} onChange={fc('prenom')}
                placeholder="ex: Aminata" disabled={loading}/>
            </F>
            <F label="Nom *">
              <input style={S.inp} value={form.nom} onChange={fc('nom')}
                placeholder="ex: Diallo" disabled={loading}/>
            </F>
          </div>

          {/* Email */}
          <F label="Adresse email *">
            <div style={{position:'relative'}}>
              <input style={{...S.inp,paddingRight:36,
                borderColor:emailOk===false?'#EF4444':emailOk===true?'#10B981':'#D1D5DB'}}
                type="email" value={form.email}
                onChange={e=>{fc('email')(e); checkEmail(e.target.value);}}
                placeholder="votre@email.bf" disabled={loading}/>
              {emailOk===true  && <span style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',fontSize:14}}>✅</span>}
              {emailOk===false && <span style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',fontSize:14}}>❌</span>}
            </div>
            {emailOk===false && <small style={{color:'#EF4444',fontSize:12}}>Cet email est déjà utilisé.</small>}
          </F>

          {/* Service */}
          <F label="Service / Département">
            <select style={S.inp} value={form.service} onChange={fc('service')} disabled={loading}>
              <option value="">-- Sélectionner votre service --</option>
              {SERVICES.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </F>

          {/* Mot de passe */}
          <F label="Mot de passe *">
            <div style={{position:'relative'}}>
              <input style={{...S.inp,paddingRight:42}}
                type={showPwd?'text':'password'} value={form.password}
                onChange={fc('password')} placeholder="Min. 8 caractères" disabled={loading}/>
              <button type="button" style={S.eye} onClick={()=>setShowPwd(!showPwd)}>
                {showPwd?'🙈':'👁️'}
              </button>
            </div>
            {form.password && (
              <div style={{marginTop:6}}>
                <div style={{display:'flex',gap:4,marginBottom:6}}>
                  {[1,2,3,4].map(i=>(
                    <div key={i} style={{flex:1,height:4,borderRadius:2,transition:'background .3s',
                      background:pwdScore>=i?(pwdScore<=1?'#EF4444':pwdScore<=2?'#F59E0B':pwdScore<=3?'#3B82F6':'#10B981'):'#E5E7EB'}}/>
                  ))}
                </div>
                <div style={{display:'flex',flexWrap:'wrap',gap:'3px 10px'}}>
                  {[[rules.length,'8 car. min.'],[rules.upper,'1 majuscule'],
                    [rules.digit,'1 chiffre'],[rules.special,'1 spécial']].map(([ok,lb])=>(
                    <span key={lb} style={{fontSize:11,color:ok?'#059669':'#9CA3AF'}}>
                      {ok?'✅':'○'} {lb}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </F>

          {/* Confirmer mot de passe */}
          <F label="Confirmer le mot de passe *">
            <div style={{position:'relative'}}>
              <input style={{...S.inp,paddingRight:42,
                borderColor:form.confirmPassword?(form.password===form.confirmPassword?'#10B981':'#EF4444'):'#D1D5DB'}}
                type={showPwd2?'text':'password'} value={form.confirmPassword}
                onChange={fc('confirmPassword')} placeholder="Répétez votre mot de passe" disabled={loading}/>
              <button type="button" style={S.eye} onClick={()=>setShowPwd2(!showPwd2)}>
                {showPwd2?'🙈':'👁️'}
              </button>
            </div>
            {form.confirmPassword && form.password!==form.confirmPassword && (
              <small style={{color:'#EF4444',fontSize:12}}>Les mots de passe ne correspondent pas.</small>
            )}
          </F>

          {error && <div style={S.errBox}>{error}</div>}

          <button type="submit" style={{...S.btnPrimary,opacity:loading?.7:1}} disabled={loading}>
            {loading ? '⏳ Inscription...' : '✅ Créer mon compte'}
          </button>

          <p style={{textAlign:'center',fontSize:13,color:'#666',margin:'4px 0 0'}}>
            Déjà un compte ?{' '}
            <Link to="/login" style={{color:'#1F4E79',fontWeight:600,textDecoration:'none'}}>
              Se connecter
            </Link>
          </p>
        </form>

        <p style={{textAlign:'center',fontSize:11,color:'#999',marginTop:16}}>
          Innofaso © 2026 — Usage interne uniquement
        </p>
      </div>
    </div>
  );
}

const F = ({label,children}) => (
  <div style={{display:'flex',flexDirection:'column',gap:5}}>
    <label style={{fontSize:13,fontWeight:600,color:'#374151'}}>{label}</label>
    {children}
  </div>
);

const S = {
  bg:       { minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',
              padding:20,background:'linear-gradient(135deg,#1F4E79 0%,#2E75B6 100%)',fontFamily:'Arial' },
  card:     { background:'#fff',borderRadius:14,padding:'36px 32px',width:'100%',maxWidth:480,
              boxShadow:'0 20px 60px rgba(0,0,0,0.3)' },
  header:   { textAlign:'center',marginBottom:24 },
  logo:     { display:'inline-flex',alignItems:'center',justifyContent:'center',
              width:56,height:56,borderRadius:14,
              background:'linear-gradient(135deg,#1F4E79,#2E75B6)',
              color:'#fff',fontSize:18,fontWeight:'bold',marginBottom:10 },
  h1:       { margin:'0 0 4px',fontSize:22,fontWeight:'bold',color:'#1F4E79' },
  sub:      { margin:0,fontSize:13,color:'#666' },
  form:     { display:'flex',flexDirection:'column',gap:14 },
  inp:      { padding:'9px 12px',border:'1.5px solid #D1D5DB',borderRadius:8,
              fontSize:14,outline:'none',width:'100%',boxSizing:'border-box',transition:'border-color .2s' },
  eye:      { position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',
              background:'none',border:'none',cursor:'pointer',fontSize:16 },
  errBox:   { background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:8,
              color:'#DC2626',padding:'10px 14px',fontSize:13 },
  btnPrimary:{ background:'linear-gradient(135deg,#1F4E79,#2E75B6)',color:'#fff',
               border:'none',borderRadius:8,padding:'12px',fontSize:15,
               fontWeight:600,cursor:'pointer',width:'100%' },
};
