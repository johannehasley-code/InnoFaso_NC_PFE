// src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout       from './components/layout/Layout';
import Login        from './pages/auth/Login';
import Register     from './pages/auth/Register';
import Dashboard    from './pages/dashboard/Dashboard';
import NcList       from './pages/nc/NcList';
import NcForm       from './pages/nc/NcForm';
import AdminUsers   from './pages/admin/AdminUsers';
import PendingUsers from './pages/admin/PendingUsers';
import AuditLogs    from './pages/admin/AuditLogs';
import Exports from './pages/exports/Exports';

const Denied = () => (
  <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',
               fontFamily:'Arial',flexDirection:'column',gap:12}}>
    <span style={{fontSize:48}}>🚫</span>
    <h2 style={{color:'#DC2626',margin:0}}>Accès refusé</h2>
    <p style={{color:'#666'}}>Vous n'avez pas les droits nécessaires pour cette page.</p>
    <a href="/dashboard" style={{color:'#1F4E79'}}>← Retour au tableau de bord</a>
  </div>
);

const WithLayout = ({ element }) => <Layout>{element}</Layout>;

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Pages publiques ─────────────────────────────── */}
          <Route path="/login"        element={<Login />} />
          <Route path="/register"     element={<Register />} />
          <Route path="/acces-refuse" element={<Denied />} />

          {/* ── Authentifié — tout le monde ─────────────────── */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard"  element={<WithLayout element={<Dashboard />} />} />
            <Route path="/nc"         element={<WithLayout element={<NcList />} />} />
            <Route path="/nc/nouveau" element={<WithLayout element={<NcForm />} />} />
            <Route path="/exports" element={<WithLayout element={<Exports />} />} />

          </Route>

          {/* ── Admin + RQ ───────────────────────────────────── */}
          <Route element={<ProtectedRoute roles={['admin','rq']} />}>
            <Route path="/admin/users"   element={<WithLayout element={<AdminUsers />} />} />
            <Route path="/admin/pending" element={<WithLayout element={<PendingUsers />} />} />
          </Route>

          {/* ── Admin uniquement ─────────────────────────────── */}
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/audit-logs" element={<WithLayout element={<AuditLogs />} />} />
          </Route>

          {/* ── Redirections ─────────────────────────────────── */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
