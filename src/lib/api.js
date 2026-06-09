// Client API — toutes les requêtes passent par /api (proxy Vite -> backend).
const BASE = '/api';

async function req(url, options = {}) {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.erreur || `Erreur ${res.status}`);
    err.code = data.code;
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  services: () => req('/services'),
  listerNc: () => req('/nc'),
  obtenirNc: (id) => req(`/nc/${id}`),
  creerNc: (donnees) => req('/nc', { method: 'POST', body: JSON.stringify(donnees) }),
  majNc: (id, patch) => req(`/nc/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  soumettre: (id) => req(`/nc/${id}/soumettre`, { method: 'POST', body: '{}' }),
  transition: (id, action) =>
    req(`/nc/${id}/transition`, { method: 'POST', body: JSON.stringify({ action }) }),
  sms: () => req('/sms'),
  rappels: () => req('/rappels'),
  executerRappels: (date) =>
    req('/rappels/executer', { method: 'POST', body: JSON.stringify({ date }) }),
};
