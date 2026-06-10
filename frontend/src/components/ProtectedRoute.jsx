// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ roles, permission }) {
  const { user, loading, is, can } = useAuth();

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',
                 fontFamily:'Arial',flexDirection:'column',gap:12,color:'#1F4E79'}}>
      <div style={{width:40,height:40,border:'4px solid #D6E4F0',borderTopColor:'#1F4E79',
                   borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
      <span>Chargement...</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !is(...roles)) return <Navigate to="/acces-refuse" replace />;
  if (permission && !can(permission)) return <Navigate to="/acces-refuse" replace />;
  return <Outlet />;
}
