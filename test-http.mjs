// Full HTTP end-to-end test against the Express API backed by in-memory PGlite.
process.env.DB_DRIVER = 'pglite';

import http from 'http';
import { query } from './api/_lib/db.js';
import { DDL } from './api/_lib/schema.js';
import { SEED } from './api/_lib/seedData.js';
import { hashPassword } from './api/_lib/auth.js';
import app from './api/index.js';

let failures = 0;
function check(name, cond) {
  if (cond) {
    console.log('  ✓', name);
  } else {
    failures++;
    console.log('  ✗', name);
  }
}

function j(r) {
  return r && r.json ? r.json : {};
}

async function seed() {
  for (const stmt of DDL.split(';').map((s) => s.trim()).filter(Boolean)) await query(stmt);
  for (const p of SEED) {
    const { milestones, scurves, kendalas, dokumentasis, terminBayars, ...proj } = p;
    const cols = Object.keys(proj).filter((c) => c !== 'id');
    const vals = cols.map((c) => proj[c]);
    const ph = cols.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await query(`INSERT INTO projects (${cols.join(', ')}) VALUES (${ph}) RETURNING id`, vals);
    const pid = rows[0].id;
    for (const m of milestones) await query('INSERT INTO milestones (project_id, nama, bobot, rencana, realisasi, status, urutan) VALUES ($1,$2,$3,$4,$5,$6,$7)', [pid, m.nama, m.bobot, m.rencana, m.realisasi, m.status, m.urutan]);
    for (const s of scurves) await query('INSERT INTO s_curves (project_id, minggu, rencana, realisasi, urutan) VALUES ($1,$2,$3,$4,$5)', [pid, s.minggu, s.rencana, s.realisasi ?? null, s.urutan]);
    for (const k of kendalas) await query('INSERT INTO kendalas (project_id, kode_kendala, kategori, deskripsi, dampak, tindakan_mitigasi, status, tgl_lapor, tgl_selesai) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [pid, k.kode_kendala, k.kategori, k.deskripsi, k.dampak ?? null, k.tindakan_mitigasi ?? null, k.status, k.tgl_lapor ?? null, k.tgl_selesai ?? null]);
    for (const d of dokumentasis) await query('INSERT INTO dokumentasis (project_id, judul, tahap, foto, tgl, keterangan) VALUES ($1,$2,$3,$4,$5,$6)', [pid, d.judul, d.tahap ?? null, d.foto, d.tgl ?? null, d.keterangan ?? null]);
    for (const [i, t] of (terminBayars || []).entries()) await query('INSERT INTO termin_bayars (project_id, nama, nominal, bobot, status, tgl_bayar, urutan) VALUES ($1,$2,$3,$4,$5,$6,$7)', [pid, t.nama, t.nominal, t.bobot, t.status, t.tgl_bayar ?? null, i + 1]);
  }
  await query('INSERT INTO users (nama, email, password_hash, role) VALUES ($1,$2,$3,$4)', ['Tester', 'test@pln.local', hashPassword('test123'), 'admin']);
}

const server = http.createServer(app);
const base = 'http://127.0.0.1:PORT';

async function req(path, opts = {}) {
  const url = base.replace('PORT', server.address().port) + path;
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const { headers: _h, ...rest } = opts;
  const res = await fetch(url, { headers, ...rest });
  return { res, json: res.headers.get('content-type')?.includes('json') ? await res.json() : null };
}

async function main() {
  await seed();
  const after = await query('SELECT COUNT(*)::int AS c FROM projects');
  console.log('SEED DEBUG: projects in DB =', after.rows[0].c);
  await new Promise((r) => server.listen(0, r));

  console.log('\n=== Auth ===');
  let r = await req('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'test@pln.local', password: 'test123' }) });
  check('POST /api/auth/login 200', r.res.status === 200);
  check('  has token', typeof r.json.token === 'string');
  const token = r.json.token;
  const auth = (o = {}) => ({ ...o, headers: { Authorization: `Bearer ${token}`, ...(o.headers || {}) } });
  r = await req('/api/projects', { method: 'POST', body: JSON.stringify({}), headers: {} });
  check('POST /api/projects tanpa token 401', r.res.status === 401);

  console.log('\n=== Dashboard ===');
  r = await req('/api/dashboard');
  check('GET /api/dashboard 200', r.res.status === 200);
  check('  8 projects', r.json.totalProjects === 8);
  check('  criticalProjects present', Array.isArray(r.json.criticalProjects));

  console.log('\n=== Projects ===');
  r = await req('/api/projects');
  check('GET /api/projects 200', r.res.status === 200);
  check('  data length 8', r.json.data.length === 8);
  check('  allTipe 8 items', r.json.allTipe.length === 8);

  r = await req('/api/projects?status=Critical');
  check('  filter Critical -> 2', r.json.data.length === 2);

  r = await req('/api/projects?search=Rekayasa');
  check('  search "Rekayasa" matches', r.json.data.length > 0);

  console.log('\n=== Project detail ===');
  r = await req('/api/projects/1');
  check('GET /api/projects/1 200', r.res.status === 200);
  check('  kode GI-150-SRP', r.json.kode === 'GI-150-SRP');
  check('  milestones > 0', r.json.milestones.length > 0);
  check('  scurves > 0', r.json.scurves.length > 0);

  console.log('\n=== Kendala ===');
  r = await req('/api/kendala');
  check('GET /api/kendala 200', r.res.status === 200);
  check('  counts present', r.json.counts && r.json.counts.open >= 0);
  check('  kategoris 6', r.json.kategoris.length === 6);

  console.log('\n=== GIS ===');
  r = await req('/api/gis/projects');
  check('GET /api/gis/projects 200', r.res.status === 200);
  check('  has lat/lng', r.json.length > 0 && r.json[0].lat !== undefined);

  console.log('\n=== Reports ===');
  r = await req('/api/reports');
  check('GET /api/reports 200', r.res.status === 200);
  check('  data 8', r.json.data.length === 8);

  console.log('\n=== CSV export ===');
  r = await req('/api/reports/export-csv');
  const buf = Buffer.from(await r.res.arrayBuffer());
  const hasBom = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
  check('CSV 200', r.res.status === 200);
  check('  has UTF-8 BOM bytes', hasBom);
  const text = buf.toString('utf8');
  check('  has header', text.includes('ID Proyek,Kode'));
  check('  includes GI-150-SRP', text.includes('GI-150-SRP'));

  console.log('\n=== CREATE project ===');
  r = await req('/api/projects', auth({
    method: 'POST',
    body: JSON.stringify({ kode: 'TEST-001', nama: 'Proyek Uji', tipe: 'Gardu Induk (GI)', uip: 'UIP JBB (Jawa Bagian Barat)', lokasi: 'Test', kontraktor: 'PT Test', progres_rencana: 30, progres_realisasi: 20 }),
  }));
  check('POST /api/projects 201', r.res.status === 201);
  check('  auto status Critical (dev -10)', r.json.status === 'Critical');
  check('  auto milestones 5', r.json.milestones.length === 5);
  check('  auto scurves 4', r.json.scurves.length === 4);

  console.log('\n=== PROGRESS store ===');
  r = await req('/api/projects/1/progress', auth({
    method: 'POST',
    body: JSON.stringify({ minggu_label: 'M-99 (Test)', progres_rencana: 90, progres_realisasi: 95, milestones: [] }),
  }));
  check('POST progress 200', r.res.status === 200);
  check('  progress stored 95', Number(r.json.progres_realisasi) === 95);

  console.log('\n=== KENDALA store + status ===');
  r = await req('/api/projects/1/kendala', auth({
    method: 'POST',
    body: JSON.stringify({ kategori: 'Material', deskripsi: 'Tes kendala', status: 'Open' }),
  }));
  check('POST kendala 201', r.res.status === 201);
  check('  code K-02', r.json.kode_kendala === 'K-02');

  console.log('\n=== BOQ store ===');
  r = await req('/api/projects/1/boq', auth({
    method: 'PUT',
    body: JSON.stringify({ items: [{ uraian: 'Erection Tower', satuan: 'UNIT', volume: 5, harga_satuan: 100, foto_vendor: 'A', foto_dalkon: 'B' }] }),
  }));
  check('PUT /boq 200', r.res.status === 200);
  check('  boqs stored 1', r.json.boqs.length === 1);

  console.log('\n=== Error handling ===');
  r = await req('/api/projects/9999');
  check('GET missing project 404', r.res.status === 404);
  r = await req('/api/projects', auth({ method: 'POST', body: JSON.stringify({}) }));
  check('POST empty 400', r.res.status === 400);

  console.log('\n' + (failures === 0 ? 'ALL HTTP TESTS PASSED' : `${failures} TEST(S) FAILED`));
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('HTTP TEST ERROR:', e);
  process.exit(1);
});