// src/services/api.js
import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
});

API.interceptors.request.use(cfg => {
  const t = localStorage.getItem('accessToken');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

let refreshing = false;
let queue = [];
const flush = (err, token) => { queue.forEach(p => err ? p.reject(err) : p.resolve(token)); queue=[]; };

API.interceptors.response.use(r => r, async err => {
  const orig = err.config;
  if (err.response?.status === 401 && !orig._retry) {
    if (refreshing) return new Promise((res,rej) => queue.push({resolve:res,reject:rej}))
      .then(t => { orig.headers.Authorization=`Bearer ${t}`; return API(orig); });
    orig._retry = true; refreshing = true;
    const rt = localStorage.getItem('refreshToken');
    if (!rt) { window.location.href='/login'; return Promise.reject(err); }
    try {
      const r = await axios.post(`${process.env.REACT_APP_API_URL||'http://localhost:5000/api'}/auth/refresh`,{refreshToken:rt});
      const nt = r.data.data.accessToken;
      localStorage.setItem('accessToken', nt);
      flush(null, nt);
      orig.headers.Authorization = `Bearer ${nt}`;
      return API(orig);
    } catch(e) { flush(e); localStorage.clear(); window.location.href='/login'; return Promise.reject(e); }
    finally { refreshing=false; }
  }
  return Promise.reject(err);
});

export const authAPI = {
  login:      d     => API.post('/auth/login', d),
  logout:     rt    => API.post('/auth/logout', { refreshToken:rt }),
  refresh:    rt    => API.post('/auth/refresh', { refreshToken:rt }),
  me:         ()    => API.get('/auth/me'),
  register:   d     => API.post('/auth/register', d),
  checkEmail: email => API.get('/auth/check-email', { params:{ email } }),
};

export const usersAPI = {
  getAll:       ()           => API.get('/users'),
  getById:      id           => API.get(`/users/${id}`),
  getRoles:     ()           => API.get('/users/roles/list'),
  create:       d            => API.post('/users', d),
  update:       (id,d)       => API.put(`/users/${id}`, d),
  unlock:       id           => API.put(`/users/${id}/unlock`),
  changePass:   (id,d)       => API.put(`/users/${id}/password`, d),
  getPending:   ()           => API.get('/users/pending/list'),
  activate:     (id, roleId) => API.put(`/users/${id}/activate`, { roleId }),
  reject:       id           => API.delete(`/users/${id}/reject`),
};

export const ncAPI = {
  getAll:       p    => API.get('/nc', { params:p }),
  getById:      id   => API.get(`/nc/${id}`),
  create:       d    => API.post('/nc', d),
  updateStatut: (id,s) => API.put(`/nc/${id}/statut`, { statut:s }),
  getStats:     ()   => API.get('/nc/stats'),
};

export const auditAPI = {
  getLogs: p => API.get('/audit-logs', { params:p }),
};

export default API;
