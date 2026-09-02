// Local deployment WITHOUT a PostgreSQL server: run the API backed by an
// in-memory PGlite instance pre-loaded with the seed dataset.
// Usage: node api/local-server-pglite.mjs  (then `npm run dev` for the frontend)
import 'dotenv/config';
import http from 'http';
import { query } from './_lib/db.js';
import { DDL } from './_lib/schema.js';
import { SEED } from './_lib/seedData.js';
import { hashPassword } from './_lib/auth.js';
import app from './index.js';

const DEMO_USERS = [
  { nama: 'Admin Pro-Track', email: 'admin@pln.local', password: 'admin123', role: 'admin' },
  { nama: 'Kontraktor PT Selaras Energi', email: 'vendor@pln.local', password: 'vendor123', role: 'vendor' },
  { nama: 'Dalkon UIP JBB', email: 'dalkon@pln.local', password: 'dalkon123', role: 'dalkon' },
];

async function seed() {
  for (const stmt of DDL.split(';').map((s) => s.trim()).filter(Boolean)) {
    await query(stmt);
  }
  for (const u of DEMO_USERS) {
    await query(
      'INSERT INTO users (nama, email, password_hash, role) VALUES ($1,$2,$3,$4) ON CONFLICT (email) DO NOTHING',
      [u.nama, u.email, hashPassword(u.password), u.role]
    );
  }
  for (const p of SEED) {
    const { milestones, scurves, kendalas, dokumentasis, terminBayars, ...proj } = p;
    const cols = Object.keys(proj).filter((c) => c !== 'id');
    const vals = cols.map((c) => proj[c]);
    const ph = cols.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await query(
      `INSERT INTO projects (${cols.join(', ')}) VALUES (${ph}) RETURNING id`,
      vals
    );
    const pid = rows[0].id;
    for (const m of milestones)
      await query('INSERT INTO milestones (project_id, nama, bobot, rencana, realisasi, status, urutan) VALUES ($1,$2,$3,$4,$5,$6,$7)', [pid, m.nama, m.bobot, m.rencana, m.realisasi, m.status, m.urutan]);
    for (const s of scurves)
      await query('INSERT INTO s_curves (project_id, minggu, rencana, realisasi, urutan) VALUES ($1,$2,$3,$4,$5)', [pid, s.minggu, s.rencana, s.realisasi ?? null, s.urutan]);
    for (const k of kendalas)
      await query('INSERT INTO kendalas (project_id, kode_kendala, kategori, deskripsi, dampak, tindakan_mitigasi, status, tgl_lapor, tgl_selesai) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [pid, k.kode_kendala, k.kategori, k.deskripsi, k.dampak ?? null, k.tindakan_mitigasi ?? null, k.status, k.tgl_lapor ?? null, k.tgl_selesai ?? null]);
    for (const d of dokumentasis)
      await query('INSERT INTO dokumentasis (project_id, judul, tahap, foto, tgl, keterangan) VALUES ($1,$2,$3,$4,$5,$6)', [pid, d.judul, d.tahap ?? null, d.foto, d.tgl ?? null, d.keterangan ?? null]);
    for (const [i, t] of (terminBayars || []).entries())
      await query('INSERT INTO termin_bayars (project_id, nama, nominal, bobot, status, tgl_bayar, urutan) VALUES ($1,$2,$3,$4,$5,$6,$7)', [pid, t.nama, t.nominal, t.bobot, t.status, t.tgl_bayar ?? null, i + 1]);
  }
}

process.env.DB_DRIVER = 'pglite';
const port = process.env.PORT || 4000;

seed()
  .then(() => {
    http.createServer(app).listen(port, () => {
      console.log(`API (PGlite, seeded) running at http://localhost:${port}`);
    });
  })
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  });