// src/App.jsx
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
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

// ── Détection d'un écran mobile (breakpoint 768px) ──────────────────────────
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= breakpoint
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return isMobile;
}

// ── Icône hamburger / fermeture (menu mobile) ───────────────────────────────
function IMenu({ ouvert = false, t = 20 }) {
  if (ouvert) {
    return (
      <svg width={t} height={t} viewBox="0 0 24 24" fill="none">
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width={t} height={t} viewBox="0 0 24 24" fill="none">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const SERVICES_DEFAUT = [
  { code: 'production',  libelle: 'Production' },
  { code: 'qualite',     libelle: 'Qualité / SMI' },
  { code: 'logistique',  libelle: 'Logistique & Approvisionnement' },
  { code: 'maintenance', libelle: 'Maintenance' },
  { code: 'commercial',  libelle: 'Commercial' },
];

// ── Élément de navigation latérale ──────────────────────────────────────────
function NavItem({ icon, label, active, onClick, collapsed }) {
  return (
    <button onClick={onClick} title={collapsed ? label : undefined} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      width: '100%', padding: collapsed ? '9px 0' : '9px 14px',
      justifyContent: collapsed ? 'center' : 'flex-start',
      borderRadius: 8,
      border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: active ? 700 : 500,
      background: active ? C.greenBg : 'transparent',
      color: active ? C.greenFonce : C.texteDoux,
      transition: 'all .15s', textAlign: 'left', fontFamily: C.police,
    }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.bgVoile; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ color: active ? C.green : C.gris, display: 'flex' }}>{icon}</span>
      {!collapsed && label}
      {!collapsed && active && <span style={{ marginLeft: 'auto', width: 6, height: 6,
        borderRadius: '50%', background: C.green }} />}
    </button>
  );
}

// ── Section de navigation ────────────────────────────────────────────────────
function NavSection({ label, collapsed }) {
  if (collapsed) return <div style={{ height: 10 }} />;
  return (
    <div style={{ fontSize: 10.5, fontWeight: 700, color: C.texteFaible,
      letterSpacing: '.08em', textTransform: 'uppercase',
      padding: '12px 14px 4px', marginTop: 4 }}>
      {label}
    </div>
  );
}

// ── Petit chevron pour le bouton plier/déplier ──────────────────────────────
function IChevron({ ouvert = true, t = 16 }) {
  return (
    <svg width={t} height={t} viewBox="0 0 24 24" fill="none"
      style={{ transform: ouvert ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform .15s' }}>
      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Layout principal après connexion ─────────────────────────────────────────
function AppContent({ ncIdInitial = null }) {
  const { user, logout, is } = useAuth();
  const [vue,      setVue]      = useState(ncIdInitial ? 'fiche' : 'dashboard');
  const [ncId,     setNcId]     = useState(ncIdInitial);
  const [services, setServices] = useState(SERVICES_DEFAUT);
  const [tick,     setTick]     = useState(0);
  const [sidebarReplie, setSidebarReplie] = useState(
    () => localStorage.getItem('innofaso_sidebar_replie') === '1'
  );
  const isMobile = useIsMobile(768);
  const [drawerOuvert, setDrawerOuvert] = useState(false);

  useEffect(() => {
    localStorage.setItem('innofaso_sidebar_replie', sidebarReplie ? '1' : '0');
  }, [sidebarReplie]);

  // Sur mobile, le drawer se referme automatiquement après un changement de
  // vue (clic sur un lien du menu), pour libérer l'écran.
  const changerVue = (v) => { setVue(v); if (isMobile) setDrawerOuvert(false); };

  useEffect(() => {
    api.services().then(setServices).catch(() => {});
  }, []);

  const ouvrir  = id => { setNcId(id);   setVue('fiche'); };
  const nouveau = ()  => { setNcId(null); setVue('fiche'); };
  const retour  = ()  => { setVue('dashboard'); setTick(t => t + 1); };

  // Entête droite — compactée sur mobile (icônes seules, sans les libellés
  // ni le détail nom/rôle, pour ne pas déborder sur petit écran).
  const droite = (
    <div style={{ display: 'flex', gap: isMobile ? 6 : 10, alignItems: 'center' }}>
      {vue === 'fiche'
        ? <Btn variant="ghost"   onClick={retour} title="Tableau de bord"><IRetour t={16}/> {!isMobile && 'Tableau de bord'}</Btn>
        : <Btn variant="primary" onClick={nouveau} title="Nouvelle fiche"><IPlus  t={17}/> {!isMobile && 'Nouvelle fiche'}</Btn>
      }
      <div style={{ display: 'flex', alignItems: 'center', gap: 8,
        padding: isMobile ? '4px' : '5px 11px',
        background: C.surfaceAlt, borderRadius: 8, border: `1px solid ${C.border}` }}>
        <div title={`${user?.prenom || ''} ${user?.nom || ''}`} style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg,${C.greenFonce},${C.green})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 12 }}>
          {user?.prenom?.[0]}{user?.nom?.[0]}
        </div>
        {!isMobile && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.texte, lineHeight: 1.2 }}>
              {user?.prenom} {user?.nom}
            </div>
            <div style={{ fontSize: 11, color: C.texteDoux }}>{user?.roleLabel || user?.role}</div>
          </div>
        )}
      </div>
      <button onClick={logout} title="Déconnexion" style={{ fontSize: 12, color: C.rouge, background: 'none',
        border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: C.police, whiteSpace: 'nowrap' }}>
        {isMobile ? '⏻' : 'Déconnexion'}
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
        menuVisible={isMobile}
        menuOuvert={drawerOuvert}
        onMenuClick={() => setDrawerOuvert(v => !v)}
      />

      <div style={{ display: 'flex', position: 'relative' }}>

        {/* ── Fond sombre derrière le tiroir de menu (mobile uniquement) ──── */}
        {isMobile && drawerOuvert && (
          <div onClick={() => setDrawerOuvert(false)} style={{
            position: 'fixed', inset: 0, top: 64, background: 'rgba(15,25,18,.4)',
            zIndex: 34,
          }} />
        )}

        {/* ── Sidebar (fixe en tiroir sur mobile, fil normal sur desktop) ── */}
        <nav style={{
          width: isMobile ? 240 : (sidebarReplie ? 64 : 230),
          flexShrink: 0,
          padding: (sidebarReplie && !isMobile) ? '16px 6px 24px' : '16px 10px 24px',
          position: isMobile ? 'fixed' : 'sticky',
          top: isMobile ? 64 : 64,
          left: 0,
          height: isMobile ? 'calc(100vh - 64px)' : 'calc(100vh - 64px)',
          overflowY: 'auto', overflowX: 'hidden', borderRight: `1px solid ${C.border}`,
          background: C.surface, display: 'flex', flexDirection: 'column',
          transition: isMobile ? 'transform .2s ease' : 'width .18s ease',
          zIndex: 35,
          transform: isMobile ? (drawerOuvert ? 'translateX(0)' : 'translateX(-100%)') : 'none',
          boxShadow: isMobile && drawerOuvert ? '4px 0 18px rgba(0,0,0,.18)' : 'none',
        }}>
          {/* Bouton plier/déplier (desktop) ou fermer (mobile) */}
          <button onClick={() => isMobile ? setDrawerOuvert(false) : setSidebarReplie(v => !v)}
            title={isMobile ? 'Fermer le menu' : (sidebarReplie ? 'Déplier le menu' : 'Plier le menu')}
            style={{
              display: 'flex', alignItems: 'center',
              justifyContent: (sidebarReplie && !isMobile) ? 'center' : 'flex-end',
              width: '100%', padding: '4px 6px 10px', background: 'none',
              border: 'none', cursor: 'pointer', color: C.texteFaible,
            }}>
            {isMobile ? <IMenu ouvert t={16} /> : <IChevron ouvert={!sidebarReplie} t={16} />}
          </button>

          <NavSection label="Principal" collapsed={sidebarReplie && !isMobile} />
          <NavItem icon={<IJauge    t={17}/>} label="Tableau de bord"   active={vue === 'dashboard'} onClick={() => changerVue('dashboard')} collapsed={sidebarReplie && !isMobile} />
          <NavItem icon={<IFiche    t={17}/>} label="Non-Conformités"   active={vue === 'nc-list'}   onClick={() => changerVue('nc-list')} collapsed={sidebarReplie && !isMobile} />
          <NavItem icon={<IEnregistrer t={17}/>} label="Exports & Rapports" active={vue === 'exports'}  onClick={() => changerVue('exports')} collapsed={sidebarReplie && !isMobile} />

          {is('admin', 'rq') && <>
            <NavSection label="Administration" collapsed={sidebarReplie && !isMobile} />
            <NavItem icon={<IUser     t={17}/>} label="Utilisateurs"        active={vue === 'users'}    onClick={() => changerVue('users')} collapsed={sidebarReplie && !isMobile} />
            <NavItem icon={<IHorloge  t={17}/>} label="Inscriptions"        active={vue === 'pending'}  onClick={() => changerVue('pending')} collapsed={sidebarReplie && !isMobile} />
            <NavItem icon={<IRecherche t={17}/>} label="Journal d'audit"    active={vue === 'audit'}    onClick={() => changerVue('audit')} collapsed={sidebarReplie && !isMobile} />
          </>}

          {/* Profil bas de sidebar */}
          <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
            {(sidebarReplie && !isMobile) ? (
              <div title={`${user?.prenom || ''} ${user?.nom || ''}`} style={{
                width: 32, height: 32, borderRadius: '50%', margin: '0 auto',
                background: `linear-gradient(135deg,${C.greenFonce},${C.green})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 12,
              }}>
                {user?.prenom?.[0]}{user?.nom?.[0]}
              </div>
            ) : (
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
            )}
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

// ── Pont entre l'URL /fiche/:id (lien email) et la navigation interne ───────
function OuvrirFicheDepuisUrl() {
  const { id } = useParams();
  return <AppContent ncIdInitial={id} />;
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

          {/* Lien direct vers une fiche précise (transfert par email) */}
          <Route path="/fiche/:id" element={
            <ProtectedRoute>
              <OuvrirFicheDepuisUrl />
            </ProtectedRoute>
          } />

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