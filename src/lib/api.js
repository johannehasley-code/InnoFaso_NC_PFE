// // src/lib/api.js — toutes les requêtes passent par /api (proxy Vite -> backend).
// const BASE = '/api';

// async function req(url, options = {}) {
//   const token = localStorage.getItem('accessToken');
//   const res = await fetch(BASE + url, {
//     headers: {
//       'Content-Type': 'application/json',
//       ...(token ? { Authorization: `Bearer ${token}` } : {}),
//     },
//     ...options,
//   });

//   if (res.status === 401) {
//     localStorage.clear();
//     window.location.href = '/login';
//     throw new Error('Session expirée.');
//   }

//   const data = await res.json().catch(() => ({}));
//   if (!res.ok) {
//     const err = new Error(data.message || data.erreur || `Erreur ${res.status}`);
//     err.code   = data.code;
//     err.status = res.status;
//     throw err;
//   }
//   return data;
// }

// // Fetch brut (pour blobs PDF/Excel)
// function reqBlob(url) {
//   const token = localStorage.getItem('accessToken');
//   return fetch(BASE + url, {
//     headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
//   });
// }

// // ── Workflow NC (compatible FicheNC.jsx) ─────────────────────
// export const api = {
//   services:        ()           => req('/services'),
//   listerNc:        ()           => req('/nc'),
//   obtenirNc:       (id)         => req(`/nc/${id}`),
//   creerNc:         (d)          => req('/nc',                  { method: 'POST',  body: JSON.stringify(d) }),
//   majNc:           (id, patch)  => req(`/nc/${id}`,            { method: 'PATCH', body: JSON.stringify(patch) }),
//   soumettre:       (id)         => req(`/nc/${id}/soumettre`,  { method: 'POST',  body: '{}' }),
//   transition:      (id, action) => req(`/nc/${id}/transition`, { method: 'POST',  body: JSON.stringify({ action }) }),
//   sms:             ()           => req('/sms'),
//   rappels:         ()           => req('/rappels'),
//   executerRappels: (date)       => req('/rappels/executer',    { method: 'POST',  body: JSON.stringify({ date }) }),
// };

// // ── Auth ──────────────────────────────────────────────────────
// export const authAPI = {
//   login:      (email, password) => req('/auth/login',    { method: 'POST', body: JSON.stringify({ email, password }) }),
//   logout:     (refreshToken)    => req('/auth/logout',   { method: 'POST', body: JSON.stringify({ refreshToken }) }),
//   me:         ()                => req('/auth/me'),
//   register:   (data)            => req('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
//   checkEmail: (email)           => req(`/auth/check-email?email=${encodeURIComponent(email)}`),
// };

// // ── Utilisateurs ──────────────────────────────────────────────
// export const usersAPI = {
//   getAll:     ()           => req('/users'),
//   getRoles:   ()           => req('/users/roles/list'),
//   create:     (data)       => req('/users',                  { method: 'POST',   body: JSON.stringify(data) }),
//   update:     (id, data)   => req(`/users/${id}`,            { method: 'PUT',    body: JSON.stringify(data) }),
//   unlock:     (id)         => req(`/users/${id}/unlock`,     { method: 'PUT' }),
//   getPending: ()           => req('/users/pending/list'),
//   activate:   (id, roleId) => req(`/users/${id}/activate`,  { method: 'PUT',    body: JSON.stringify({ roleId }) }),
//   reject:     (id)         => req(`/users/${id}/reject`,     { method: 'DELETE' }),
// };

// // ── Audit ─────────────────────────────────────────────────────
// export const auditAPI = {
//   getLogs: (params = {}) => {
//     const qs = new URLSearchParams({ limit: 200, ...params }).toString();
//     return req(`/audit-logs?${qs}`);
//   },
// };

// // ── Exports ───────────────────────────────────────────────────
// export const exportsAPI = {
//   searchNc: (params = {}) => {
//     const p = { ...params };
//     Object.keys(p).forEach(k => !p[k] && p[k] !== 0 && delete p[k]);
//     return req(`/exports/nc?${new URLSearchParams(p)}`);
//   },
//   exportPDF:      (id)          => reqBlob(`/exports/nc/${id}/pdf`),
//   exportExcel:    (params = {}) => {
//     const p = { ...params };
//     Object.keys(p).forEach(k => !p[k] && delete p[k]);
//     delete p.limit; delete p.offset;
//     return reqBlob(`/exports/nc/excel?${new URLSearchParams(p)}`);
//   },
//   rapportMensuel: (mois, annee) => reqBlob(`/exports/rapport-mensuel?mois=${mois}&annee=${annee}`),
// };



// src/lib/api.js
const BASE = '/api';

async function req(url, options = {}) {
  const token = localStorage.getItem('accessToken');

  // Routes publiques
  const publicRoutes = [
    '/auth/login',
    '/auth/register',
    '/auth/check-email',
  ];

  // Construction des headers
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // Ajouter le token uniquement pour les routes protégées
  if (token && !publicRoutes.some(route => url.startsWith(route))) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(BASE + url, {
    ...options,
    headers,
  });

  // Récupération de la réponse
  const data = await res.json().catch(() => ({}));

  // Session expirée uniquement pour les routes protégées
  if (
    res.status === 401 &&
    !publicRoutes.some(route => url.startsWith(route))
  ) {
    localStorage.clear();

    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }

    const err = new Error('Session expirée.');
    err.status = 401;
    throw err;
  }

  // Gestion des autres erreurs
  if (!res.ok) {
    let message =
      data.message ||
      data.erreur ||
      `Erreur ${res.status}`;

    if (res.status === 429) {
      message =
        'Trop de tentatives de connexion. Veuillez réessayer dans quelques minutes.';
    }

    const err = new Error(message);
    err.code = data.code;
    err.status = res.status;
    throw err;
  }

  return data;
}

// Fetch brut (PDF, Excel)
function reqBlob(url) {
  const token = localStorage.getItem('accessToken');

  return fetch(BASE + url, {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {},
  });
}

// ── Workflow NC ─────────────────────────────────────
export const api = {
  services:        ()           => req('/services'),
  listerNc:        ()           => req('/nc'),
  obtenirNc:       (id)         => req(`/nc/${id}`),
  creerNc:         (d)          => req('/nc', { method: 'POST', body: JSON.stringify(d) }),
  majNc:           (id, patch)  => req(`/nc/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  soumettre:       (id)         => req(`/nc/${id}/soumettre`, { method: 'POST', body: '{}' }),
  transition:      (id, action) => req(`/nc/${id}/transition`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  }),
  sms:             ()           => req('/sms'),
  rappels:         ()           => req('/rappels'),
  executerRappels: (date)       => req('/rappels/executer', {
    method: 'POST',
    body: JSON.stringify({ date }),
  }),
  transfererFiche: (id, payload) =>
    req(`/nc/${id}/transferer`, { method: 'POST', body: JSON.stringify(payload) }),
  listerColonnesPerso: ()              => req('/colonnes-perso'),
  creerColonnePerso:   (d)             => req('/colonnes-perso', { method: 'POST', body: JSON.stringify(d) }),
  supprimerColonnePerso: (id)          => req(`/colonnes-perso/${id}`, { method: 'DELETE' }),
  majValeursPerso:     (ncId, valeurs) => req(`/nc/${ncId}/valeurs-perso`, {
    method: 'PUT',
    body: JSON.stringify({ valeurs }),
  }),
 

};

// ── Auth ─────────────────────────────────────────────
export const authAPI = {
  login: (email, password) =>
    req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: (refreshToken) =>
    req('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  me: () => req('/auth/me'),

  register: (data) =>
    req('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  checkEmail: (email) =>
    req(`/auth/check-email?email=${encodeURIComponent(email)}`),
};

// ── Utilisateurs ─────────────────────────────────────
export const usersAPI = {
  getAll: () => req('/users'),

  getRoles: () => req('/users/roles/list'),

  create: (data) =>
    req('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id, data) =>
    req(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  unlock: (id) =>
    req(`/users/${id}/unlock`, {
      method: 'PUT',
    }),

  getPending: () => req('/users/pending/list'),

  activate: (id, roleId) =>
    req(`/users/${id}/activate`, {
      method: 'PUT',
      body: JSON.stringify({ roleId }),
    }),

  reject: (id) =>
    req(`/users/${id}/reject`, {
      method: 'DELETE',
    }),
};

// ── Audit ────────────────────────────────────────────
export const auditAPI = {
  getLogs: (params = {}) => {
    const qs = new URLSearchParams({
      limit: 200,
      ...params,
    }).toString();

    return req(`/audit-logs?${qs}`);
  },
};

// ── Exports ──────────────────────────────────────────
export const exportsAPI = {
  searchNc: (params = {}) => {
    const p = { ...params };

    Object.keys(p).forEach(
      (k) => !p[k] && p[k] !== 0 && delete p[k]
    );

    return req(`/exports/nc?${new URLSearchParams(p)}`);
  },

  exportPDF: (id) => reqBlob(`/exports/nc/${id}/pdf`),

  exportExcel: (params = {}) => {
    const p = { ...params };

    Object.keys(p).forEach((k) => !p[k] && delete p[k]);

    delete p.limit;
    delete p.offset;

    return req(`/exports/nc/excel?${new URLSearchParams(p)}`);
  },

  rapportMensuel: (mois, annee) =>
    reqBlob(`/exports/rapport-mensuel?mois=${mois}&annee=${annee}`),
};