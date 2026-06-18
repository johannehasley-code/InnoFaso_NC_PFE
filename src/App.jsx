// src/App.jsx
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';

// Pages auth (affichées AVANT le dashboard)
import Login    from './pages/Login.jsx';
import Register from './pages/Register.jsx';

// Pages principales
import FicheNC      from './FicheNC.jsx';
import Dashboard    from './pages/Dashboard.jsx';
import NcList       from './pages/NcList.jsx';
import AdminUsers   from './pages/AdminUsers.jsx';
import PendingUsers from './pages/PendingUsers.jsx';
import AuditLogs    from './pages/AuditLogs.jsx';
import Exports      from './pages/Exports.jsx';

import { api }        from './lib/api.js';
import { C }          from './lib/theme.js';
import { Entete, Btn } from './components/ui.jsx';
import {
  IPlus, IRetour, IFiche, IJauge, IUser, IRecherche,
  IHorloge, IEnregistrer,
} from './components/Icones.jsx';

const SERVICES_DEFAUT = [
  { code: 'production',  libelle: 'Production' },
  { code: 'qualite',     libelle: 'Qualité / SMI' },
  { code: 'logistique',  libelle: 'Logistique & Approvisionnement' },
  { code: 'maintenance', libelle: 'Maintenance' },
  { code: 'commercial',  libelle: 'Commercial' },
];

// ── Élément de navigation latérale ──────────────────────────────────────────
function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      width: '100%', padding: '9px 14px', borderRadius: 8,
      border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: active ? 700 : 500,
      background: active ? C.greenBg : 'transparent',
      color: active ? C.greenFonce : C.texteDoux,
      transition: 'all .15s', textAlign: 'left', fontFamily: C.police,
    }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.bgVoile; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ color: active ? C.green : C.gris, display: 'flex' }}>{icon}</span>
      {label}
      {active && <span style={{ marginLeft: 'auto', width: 6, height: 6,
        borderRadius: '50%', background: C.green }} />}
    </button>
  );
}

// ── Section de navigation ────────────────────────────────────────────────────
function NavSection({ label }) {
  return (
    <div style={{ fontSize: 10.5, fontWeight: 700, color: C.texteFaible,
      letterSpacing: '.08em', textTransform: 'uppercase',
      padding: '12px 14px 4px', marginTop: 4 }}>
      {label}
    </div>
  );
}

// ── Layout principal après connexion ─────────────────────────────────────────
function AppContent() {
  const { user, logout, is } = useAuth();
  const [vue,      setVue]      = useState('dashboard');
  const [ncId,     setNcId]     = useState(null);
  const [services, setServices] = useState(SERVICES_DEFAUT);
  const [tick,     setTick]     = useState(0);

  useEffect(() => {
    api.services().then(setServices).catch(() => {});
  }, []);

  const ouvrir  = id => { setNcId(id);   setVue('fiche'); };
  const nouveau = ()  => { setNcId(null); setVue('fiche'); };
  const retour  = ()  => { setVue('dashboard'); setTick(t => t + 1); };

  // Entête droite
  const droite = (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      {vue === 'fiche'
        ? <Btn variant="ghost"   onClick={retour}><IRetour t={16}/> Tableau de bord</Btn>
        : <Btn variant="primary" onClick={nouveau}><IPlus  t={17}/> Nouvelle fiche</Btn>
      }
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 11px',
        background: C.surfaceAlt, borderRadius: 8, border: `1px solid ${C.border}` }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg,${C.greenFonce},${C.green})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 12 }}>
          {user?.prenom?.[0]}{user?.nom?.[0]}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.texte, lineHeight: 1.2 }}>
            {user?.prenom} {user?.nom}
          </div>
          <div style={{ fontSize: 11, color: C.texteDoux }}>{user?.roleLabel || user?.role}</div>
        </div>
      </div>
      <button onClick={logout} style={{ fontSize: 12, color: C.rouge, background: 'none',
        border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: C.police }}>
        Déconnexion
      </button>
    </div>
  );

  // Rendu selon vue
  const renderVue = () => {
    switch (vue) {
      case 'fiche':
        return (
          <FicheNC key={ncId || 'nouveau'} ncId={ncId} services={services}
            onRetour={retour} onChangement={() => setTick(t => t + 1)} />
        );
      case 'nc-list':   return <NcList       onOuvrir={ouvrir} onNouveau={nouveau} />;
      case 'exports':   return <Exports />;
      case 'users':     return <AdminUsers />;
      case 'pending':   return <PendingUsers />;
      case 'audit':     return <AuditLogs />;
      default:          return <Dashboard onOuvrir={ouvrir} onNouveau={nouveau} rafraichir={tick} />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: C.police }}>
      <Entete
        sousTitre={vue === 'fiche' ? 'Fiche de non-conformité' : 'Gestion des non-conformités'}
        droite={droite}
      />

      <div style={{ display: 'flex' }}>

        {/* ── Sidebar ───────────────────────────────────────────── */}
        <nav style={{
          width: 230, flexShrink: 0, padding: '16px 10px 24px',
          position: 'sticky', top: 64, height: 'calc(100vh - 64px)',
          overflowY: 'auto', borderRight: `1px solid ${C.border}`,
          background: C.surface, display: 'flex', flexDirection: 'column',
        }}>
          <NavSection label="Principal" />
          <NavItem icon={<IJauge    t={17}/>} label="Tableau de bord"   active={vue === 'dashboard'} onClick={() => setVue('dashboard')} />
          <NavItem icon={<IFiche    t={17}/>} label="Non-Conformités"   active={vue === 'nc-list'}   onClick={() => setVue('nc-list')} />
          <NavItem icon={<IEnregistrer t={17}/>} label="Exports & Rapports" active={vue === 'exports'}  onClick={() => setVue('exports')} />

          {is('admin', 'rq') && <>
            <NavSection label="Administration" />
            <NavItem icon={<IUser     t={17}/>} label="Utilisateurs"        active={vue === 'users'}    onClick={() => setVue('users')} />
            <NavItem icon={<IHorloge  t={17}/>} label="Inscriptions"        active={vue === 'pending'}  onClick={() => setVue('pending')} />
            <NavItem icon={<IRecherche t={17}/>} label="Journal d'audit"    active={vue === 'audit'}    onClick={() => setVue('audit')} />
          </>}

          {/* Profil bas de sidebar */}
          <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
            <div style={{ padding: '10px 14px', background: C.greenBg,
              borderRadius: 8, border: `1px solid ${C.greenBord}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.greenFonce, marginBottom: 1 }}>
                {user?.prenom} {user?.nom}
              </div>
              <div style={{ fontSize: 11, color: C.green }}>{user?.roleLabel || user?.role}</div>
              {user?.service && (
                <div style={{ fontSize: 11, color: C.greenEncreuse, marginTop: 1 }}>{user.service}</div>
              )}
            </div>
          </div>
        </nav>

        {/* ── Contenu principal ─────────────────────────────────── */}
        <main style={{ flex: 1, minWidth: 0, overflowX: 'hidden' }}>
          {renderVue()}
        </main>
      </div>
    </div>
  );
}

// ── Route protégée ───────────────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

// ── App racine — Login apparaît en PREMIER si non connecté ───────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Pages publiques */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Pages protégées — redirige vers /login si non connecté */}
          <Route path="/*" element={
            <ProtectedRoute>
              <AppContent />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}