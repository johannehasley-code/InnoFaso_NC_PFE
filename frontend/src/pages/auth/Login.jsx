// src/pages/auth/Login.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const REDIRECTS = {
  operateur:           '/nc/nouveau',
  responsable_service: '/nc',
  rq:                  '/dashboard',
  direction:           '/dashboard',
  admin:               '/admin/users',
};

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form,    setForm]    = useState({ email:'', password:'' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [pending, setPending] = useState(false);

  const onChange = e => { setForm({...form,[e.target.name]:e.target.value}); setError(''); setPending(false); };

  const onSubmit = async e => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Veuillez remplir tous les champs.'); return; }
    setLoading(true);
    try {
      const u = await login(form.email, form.password);
      navigate((REDIRECTS[u.role]||'/dashboard').trim(), { replace:true });
    } catch(err) {
      const data = err.response?.data;
      if (data?.pendingValidation) setPending(true);
      setError(data?.message || 'Erreur de connexion.');
    } finally { setLoading(false); }
  };

  return (
    <div style={S.bg}>
      <div style={S.card}>
        <div style={S.top}>
          <div style={S.logo}>INN</div>
          <h1 style={S.h1}>INNOFASO</h1>
          <p style={S.sub}>Gestion des Non-Conformités</p>
        </div>

        <form onSubmit={onSubmit} style={S.form}>
          <div style={S.field}>
            <label style={S.lbl}>Email</label>
            <input name="email" type="email" value={form.email} onChange={onChange}
              placeholder="votre@email.bf" style={S.input} disabled={loading} autoComplete="email"/>
          </div>
          <div style={S.field}>
            <label style={S.lbl}>Mot de passe</label>
            <div style={{position:'relative'}}>
              <input name="password" type={showPwd?'text':'password'} value={form.password}
                onChange={onChange} placeholder="••••••••"
                style={{...S.input,paddingRight:42}} disabled={loading} autoComplete="current-password"/>
              <button type="button" onClick={()=>setShowPwd(!showPwd)}
                style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',
                        background:'none',border:'none',cursor:'pointer',fontSize:16}}>
                {showPwd?'🙈':'👁️'}
              </button>
            </div>
          </div>

          {/* Message en attente de validation */}
          {pending && (
            <div style={{background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:8,
                         padding:'12px 14px',fontSize:13,color:'#92400E'}}>
              <strong>⏳ Compte en attente de validation</strong><br/>
              Votre inscription est bien enregistrée. Un administrateur doit
              activer votre compte. Vous pourrez vous connecter dès l'activation.
            </div>
          )}

          {error && !pending && <div style={S.err}>{error}</div>}

          <button type="submit" style={{...S.btn,opacity:loading?.7:1}} disabled={loading}>
            {loading ? '⏳ Connexion...' : 'Se connecter'}
          </button>

          {/* Lien inscription */}
          <p style={{textAlign:'center',fontSize:13,color:'#666',margin:'4px 0 0'}}>
            Pas encore de compte ?{' '}
            <Link to="/register"
              style={{color:'#1F4E79',fontWeight:600,textDecoration:'none'}}>
              Créer un compte
            </Link>
          </p>
        </form>

        <p style={S.footer}>Innofaso © 2026 — Usage interne uniquement</p>
      </div>
    </div>
  );
}

const S = {
  bg:     { minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',
            background:'linear-gradient(135deg,#1F4E79 0%,#2E75B6 100%)',fontFamily:'Arial' },
  card:   { background:'#fff',borderRadius:14,padding:'40px 36px',width:'100%',maxWidth:420,
            boxShadow:'0 20px 60px rgba(0,0,0,0.3)' },
  top:    { textAlign:'center',marginBottom:32 },
  logo:   { display:'inline-flex',alignItems:'center',justifyContent:'center',
            width:64,height:64,borderRadius:16,
            background:'linear-gradient(135deg,#1F4E79,#2E75B6)',
            color:'#fff',fontSize:22,fontWeight:'bold',marginBottom:12 },
  h1:     { margin:'0 0 4px',fontSize:24,fontWeight:'bold',color:'#1F4E79' },
  sub:    { margin:0,fontSize:13,color:'#666' },
  form:   { display:'flex',flexDirection:'column',gap:18 },
  field:  { display:'flex',flexDirection:'column',gap:6 },
  lbl:    { fontSize:13,fontWeight:600,color:'#333' },
  input:  { padding:'10px 14px',border:'1.5px solid #D0D5DD',borderRadius:8,
            fontSize:14,outline:'none',width:'100%',boxSizing:'border-box' },
  err:    { background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:8,
            color:'#DC2626',padding:'10px 14px',fontSize:13 },
  btn:    { background:'linear-gradient(135deg,#1F4E79,#2E75B6)',color:'#fff',
            border:'none',borderRadius:8,padding:'12px',fontSize:15,
            fontWeight:600,cursor:'pointer' },
  footer: { textAlign:'center',fontSize:11,color:'#999',marginTop:24 },
};
