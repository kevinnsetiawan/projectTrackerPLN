import { getToken, clearSession } from './auth.js';

const BASE = ''; // same origin (proxy in dev, Vercel routes /api in prod)

function buildQs(params = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '' || v === 'all') continue;
    qs.set(k, v);
  }
  return qs.toString();
}

async function request(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { headers, ...opts });
  if (res.status === 401 && !path.startsWith('/api/auth/')) {
    clearSession();
    if (window.location.pathname !== '/login') window.location.href = '/login';
  }
  if (!res.ok) {
    let msg = `Request gagal (${res.status})`;
    try {
      const data = await res.json();
      if (data.error) msg = data.error;
    } catch {}
    throw new Error(msg);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('text/csv')) return res;
  return res.json();
}

export function getProject(id) {
  return request(`/api/projects/${id}`);
}
export function login(data) {
  return request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) });
}
export function register(data) {
  return request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) });
}
export function getMe() {
  return request('/api/auth/me');
}
export function listProjects(params = {}) {
  const qs = buildQs(params);
  return request(`/api/projects${qs ? '?' + qs : ''}`);
}
export function getDashboard() {
  return request('/api/dashboard');
}
export function getMeta() {
  return request('/api/meta/options');
}
export function createProject(data) {
  return request('/api/projects', { method: 'POST', body: JSON.stringify(data) });
}
export function updateProject(id, data) {
  return request(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}
export function deleteProject(id) {
  return request(`/api/projects/${id}`, { method: 'DELETE' });
}
export function storeProgress(id, data) {
  return request(`/api/projects/${id}/progress`, { method: 'POST', body: JSON.stringify(data) });
}
export function listKendala(params = {}) {
  const qs = buildQs(params);
  return request(`/api/kendala${qs ? '?' + qs : ''}`);
}
export function storeKendala(projectId, data) {
  return request(`/api/projects/${projectId}/kendala`, { method: 'POST', body: JSON.stringify(data) });
}
export function updateKendalaStatus(id, status) {
  return request(`/api/kendala/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}
export function storeDokumentasi(projectId, data) {
  return request(`/api/projects/${projectId}/dokumentasi`, { method: 'POST', body: JSON.stringify(data) });
}
export function storeBoq(projectId, data) {
  return request(`/api/projects/${projectId}/boq`, { method: 'PUT', body: JSON.stringify(data) });
}
export function gisProjects(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/gis/projects${qs ? '?' + qs : ''}`);
}
export function getReports(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/reports${qs ? '?' + qs : ''}`);
}
export function exportCsvUrl(params = {}) {
  const qs = buildQs(params);
  return `${BASE}/api/reports/export-csv${qs ? '?' + qs : ''}`;
}
export function listDrawings(params = {}) {
  const qs = buildQs(params);
  return request(`/api/drawings${qs ? '?' + qs : ''}`);
}
export function storeDrawing(projectId, data) {
  return request(`/api/projects/${projectId}/drawings`, { method: 'POST', body: JSON.stringify(data) });
}
export function updateDrawingDalkon(drawingId, data) {
  return request(`/api/drawings/${drawingId}/dalkon`, { method: 'PATCH', body: JSON.stringify(data) });
}
export function updateDrawingEnjin(drawingId, data) {
  return request(`/api/drawings/${drawingId}/enjin`, { method: 'PATCH', body: JSON.stringify(data) });
}
export function deleteDrawing(drawingId) {
  return request(`/api/drawings/${drawingId}`, { method: 'DELETE' });
}