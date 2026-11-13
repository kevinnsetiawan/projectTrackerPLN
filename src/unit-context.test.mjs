import assert from 'node:assert/strict';

function storage() {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: (key) => data.delete(key) };
}
globalThis.localStorage = storage();
globalThis.sessionStorage = storage();
globalThis.window = { dispatchEvent() {}, location: { pathname: '/projects' } };
const auth = await import('./auth.js');
const api = await import('./api.js');
auth.setSession('token', { id: 1, nama: 'Pengguna', role: 'admin' });
auth.setUnitId('11');
auth.setAuthState({ user: { id: 1 }, context: { role: 'staff' }, capabilities: { read: true, project_write: false } });
assert.equal(auth.getUser().role, 'staff');
assert.equal(auth.can('admin'), false);
assert.equal(auth.canAction('project_write'), false);
assert.equal(auth.canAction('missing'), false);
assert.equal(localStorage.getItem('pln_protrack_unit'), null);
const firstTab = sessionStorage;
globalThis.sessionStorage = storage();
assert.equal(auth.getUnitId(), '');
auth.setUnitId('22');
globalThis.sessionStorage = firstTab;
assert.equal(auth.getUnitId(), '11');

let release;
let oldSignal;
globalThis.fetch = (_url, options) => {
  assert.equal(options.headers['X-Unit-ID'], '11');
  oldSignal = options.signal;
  return new Promise((resolve) => { release = () => resolve({ ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({ data: ['old-unit'] }) }); });
};
const stale = api.listProjects();
api.cancelUnitRequests();
auth.setUnitId('22');
assert.equal(oldSignal.aborted, true);
release();
await assert.rejects(stale, { name: 'AbortError' });
assert.equal(auth.canAction('read'), false);
globalThis.fetch = async (_url, options) => {
  assert.equal(options.headers['X-Unit-ID'], '22');
  return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({ data: ['new-unit'] }) };
};
assert.deepEqual(await api.listProjects(), { data: ['new-unit'] });
assert.equal(new URL(api.drawingFileUrl(2, 'vendor'), 'http://localhost').searchParams.get('unit'), '22');
auth.setUnitId('all');
assert.equal(new URL(api.exportCsvUrl(), 'http://localhost').searchParams.get('unit'), 'all');
auth.clearSession();
assert.equal(auth.getUnitId(), '');
assert.equal(auth.getUser(), null);

const { fileToDataUrl } = await import('./utils.js');
await assert.rejects(() => fileToDataUrl({ name: 'xss.svg', type: 'image/svg+xml', size: 10 }), /SVG tidak diizinkan/i);
await assert.rejects(() => fileToDataUrl({ name: 'vector.SVG', type: '', size: 10 }), /SVG tidak diizinkan/i);

console.log('unit context: per-tab scope, capability reset, stale response, file/export guards passed');
