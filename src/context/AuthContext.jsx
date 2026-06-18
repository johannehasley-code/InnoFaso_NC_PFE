// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../lib/api.js';
import { C } from '../lib/theme.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Vérification du token au démarrage
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { setLoading(false); return; }
    authAPI.me()
      .then(data => setUser(data.data || data))
      .catch(() => { localStorage.clear(); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login(email, password);
    const { accessToken, refreshToken, user: u } = res.data;
    localStorage.setItem('accessToken',  accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(u);
    return u;
  };

  const logout = async () => {
    const rt = localStorage.getItem('refreshToken');
    try { await authAPI.logout(rt); } catch {}
    localStorage.clear();
    setUser(null);
  };

  // Vérification des rôles (utilisé dans Layout)
  const is = (...roles) => roles.includes(user?.role);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: C.bg, fontFamily: C.police,
      color: C.texteDoux, fontSize: 14, gap: 12 }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%',
        border: `2px solid ${C.greenBord}`, borderTopColor: C.green,
        animation: 'spin 0.8s linear infinite' }} />
      Chargement…
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <AuthContext.Provider value={{ user, login, logout, is }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);