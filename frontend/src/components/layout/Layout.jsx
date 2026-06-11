// src/components/layout/Layout.jsx
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const MENU = [
  { to:'/dashboard',    icon:'📊', label:'Tableau de bord',    roles:['rq','direction','admin'] },
  { to:'/nc',           icon:'📋', label:'Non-Conformités',     roles:null },
  { to:'/nc/nouveau',   icon:'➕', label:'Nouvelle NC',         roles:null },
  { to:'/admin/users',  icon:'👥', label:'Utilisateurs',        roles:['admin','rq'] },
  { to:'/admin/pending',icon:'🕐', label:'Inscriptions en attente',  roles:['admin','rq'] },
  { to:'/audit-logs',   icon:'🔍', label:'Journal d\'audit',    roles:['admin'] },
  { to:'/exports', icon:'📁', label:'Exports & Rapports', roles:null },
];

export default function Layout({ children }) {
  const { user, logout, is } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const visible = MENU.filter(m => !m.roles || is(...m.roles));

  return (
    <div style={{ display:'flex', minHeight:'100vh', fontFamily:'Arial' }}>
      {/* SIDEBAR */}
      <aside style={{
        width: collapsed ? 60 : 220,
        background:'#1F4E79', color:'#fff',
        display:'flex', flexDirection:'column',
        transition:'width 0.2s', flexShrink:0,
      }}>
        {/* Logo */}
        <div style={{ padding:'20px 0', textAlign:'center', borderBottom:'1px solid #2E75B6' }}>
          <div style={{ fontSize:24, fontWeight:'bold', color:'#fff' }}>
            {collapsed ? 'IN' : 'INNOFASO'}
          </div>
          {!collapsed && <div style={{ fontSize:11, color:'#BDD7EE', marginTop:4 }}>
            Gestion Qualité
          </div>}
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:'12px 0' }}>
          {visible.map(m => (
            <NavLink key={m.to} to={m.to}
              style={({ isActive }) => ({
                display:'flex', alignItems:'center', gap:12,
                padding:'10px 16px', color: isActive ? '#fff' : '#BDD7EE',
                textDecoration:'none', fontSize:14,
                background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                transition:'all 0.15s',
              })}>
              <span style={{ fontSize:18, flexShrink:0 }}>{m.icon}</span>
              {!collapsed && <span>{m.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div style={{ padding:'12px 16px', borderTop:'1px solid #2E75B6', fontSize:12 }}>
          {!collapsed && <>
            <div style={{ color:'#fff', fontWeight:'bold', marginBottom:2 }}>
              {user?.prenom} {user?.nom}
            </div>
            <div style={{ color:'#BDD7EE', marginBottom:10 }}>{user?.role}</div>
          </>}
          <button onClick={handleLogout}
            style={{ width:'100%', padding:'7px', background:'rgba(255,255,255,0.1)',
                     border:'1px solid rgba(255,255,255,0.2)', borderRadius:6,
                     color:'#fff', cursor:'pointer', fontSize:12 }}>
            {collapsed ? '🚪' : '🚪 Déconnexion'}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Topbar */}
        <header style={{ height:52, background:'#fff', borderBottom:'1px solid #E5E7EB',
                         display:'flex', alignItems:'center', padding:'0 20px',
                         justifyContent:'space-between', flexShrink:0 }}>
          <button onClick={() => setCollapsed(!collapsed)}
            style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#666' }}>
            ☰
          </button>
          <div style={{ fontSize:13, color:'#555' }}>
            Connecté : <strong>{user?.prenom} {user?.nom}</strong> —{' '}
            <span style={{ color:'#1F4E79' }}>{user?.roleLabel || user?.role}</span>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex:1, overflow:'auto', background:'#F0F4F8', padding:24 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
