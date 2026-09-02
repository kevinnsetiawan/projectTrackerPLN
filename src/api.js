const BASE = ''; // same origin (proxy in dev, Vercel routes /api in prod)

async function request(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
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
export function listProjects(params = {}) {
  const qs = new URLSearchParams(params).toString();
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
  const qs = new URLSearchParams(params).toString();
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
export function gisProjects(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/gis/projects${qs ? '?' + qs : ''}`);
}
export function getReports(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/reports${qs ? '?' + qs : ''}`);
}
export function exportCsvUrl(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return `${BASE}/api/reports/export-csv${qs ? '?' + qs : ''}`;
}