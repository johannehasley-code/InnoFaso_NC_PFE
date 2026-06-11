// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authAPI } from '../services/api';

const Ctx = createContext(null);
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimerRef = useRef(null);

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  const logout = useCallback(async () => {
    const rt = localStorage.getItem('refreshToken');
    try { await authAPI.logout(rt); } catch {}
    clearInactivityTimer();
    localStorage.clear();
    setUser(null);
  }, [clearInactivityTimer]);

  const startInactivityTimer = useCallback(() => {
    clearInactivityTimer();
    inactivityTimerRef.current = window.setTimeout(() => {
      logout();
    }, INACTIVITY_TIMEOUT_MS);
  }, [clearInactivityTimer, logout]);

  const resetInactivityTimer = useCallback(() => {
    if (user) startInactivityTimer();
  }, [startInactivityTimer, user]);

  useEffect(() => {
    const t = localStorage.getItem('accessToken');
    if (t) {
      authAPI.me()
        .then(r => setUser(r.data.data))
        .catch(() => localStorage.clear())
        .finally(() => setLoading(false));
    } else setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    startInactivityTimer();
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetInactivityTimer));

    return () => {
      clearInactivityTimer();
      events.forEach(event => window.removeEventListener(event, resetInactivityTimer));
    };
  }, [user, resetInactivityTimer, startInactivityTimer, clearInactivityTimer]);

  const login = useCallback(async (email, password) => {
    const r = await authAPI.login({ email, password });
    const { accessToken, refreshToken, user:u } = r.data.data;
    localStorage.setItem('accessToken',  accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(u);
    startInactivityTimer();
    return u;
  }, [startInactivityTimer]);

  const can = useCallback(perm => {
    const p = user?.permissions || {};
    return !!(p.all || p[perm]);
  }, [user]);

  const is = useCallback((...roles) => roles.includes(user?.role), [user]);

  return (
    <Ctx.Provider value={{ user, loading, login, logout, can, is }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth doit être dans AuthProvider');
  return c;
};
