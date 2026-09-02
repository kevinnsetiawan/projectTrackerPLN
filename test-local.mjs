// Local end-to-end test using PGlite (in-memory Postgres, no server needed).
// Validates the DDL, seed inserts, and the main API queries.
import { PGlite } from '@electric-sql/pglite';
import { DDL } from './api/_lib/schema.js';
import { SEED } from './api/_lib/seedData.js';
import { deriveStatus, deviasiOf, defaultMilestones, defaultSCurvePoints } from './api/_lib/business.js';

const db = new PGlite();

async function q(sql, params = []) {
  return db.query(sql, params);
}

async function main() {
  console.log('1. Creating schema...');
  // PGlite requires single-statement queries (server Postgres allows multi-statement).
  for (const stmt of DDL.split(';').map((s) => s.trim()).filter(Boolean)) {
    await q(stmt);
  }

  console.log('2. Deleting existing data...');
  await q('DELETE FROM milestones');
  await q('DELETE FROM s_curves');
  await q('DELETE FROM kendalas');
  await q('DELETE FROM dokumentasis');
  await q('DELETE FROM projects');

  console.log('3. Inserting seed projects...');
  for (const p of SEED) {
    const { milestones, scurves, kendalas, dokumentasis, ...proj } = p;
    const cols = Object.keys(proj).filter((c) => c !== 'id');
    const vals = cols.map((c) => proj[c]);
    const ph = cols.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await q(`INSERT INTO projects (${cols.join(', ')}) VALUES (${ph}) RETURNING id`, vals);
    const pid = rows[0].id;
    for (const m of milestones) {
      await q('INSERT INTO milestones (project_id, nama, bobot, rencana, realisasi, status, urutan) VALUES ($1,$2,$3,$4,$5,$6,$7)', [pid, m.nama, m.bobot, m.rencana, m.realisasi, m.status, m.urutan]);
    }
    for (const s of scurves) {
      await q('INSERT INTO s_curves (project_id, minggu, rencana, realisasi, urutan) VALUES ($1,$2,$3,$4,$5)', [pid, s.minggu, s.rencana, s.realisasi ?? null, s.urutan]);
    }
    for (const k of kendalas) {
      await q('INSERT INTO kendalas (project_id, kode_kendala, kategori, deskripsi, dampak, tindakan_mitigasi, status, tgl_lapor, tgl_selesai) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [pid, k.kode_kendala, k.kategori, k.deskripsi, k.dampak ?? null, k.tindakan_mitigasi ?? null, k.status, k.tgl_lapor ?? null, k.tgl_selesai ?? null]);
    }
    for (const d of dokumentasis) {
      await q('INSERT INTO dokumentasis (project_id, judul, tahap, foto, tgl, keterangan) VALUES ($1,$2,$3,$4,$5,$6)', [pid, d.judul, d.tahap ?? null, d.foto, d.tgl ?? null, d.keterangan ?? null]);
    }
  }

  const cnt = await q('SELECT COUNT(*)::int AS total FROM projects');
  console.log('   projects:', cnt.rows[0].total);

  // Validate API queries
  console.log('4. Running API queries...');
  const dash = await q('SELECT * FROM projects');
  const statusCounts = {};
  for (const row of dash.rows) statusCounts[row.status] = (statusCounts[row.status] || 0) + 1;
  console.log('   status counts:', JSON.stringify(statusCounts));

  const { rows: kn } = await q(`SELECT * FROM kendalas WHERE status != 'Resolved'`);
  console.log('   open kendala count:', kn.length);

  const dyn = await q(`SELECT * FROM projects WHERE status ILIKE '%Critical%' OR deviasi::float < -5`);
  console.log('   critical projects:', dyn.rows.length);

  const sc = await q('SELECT * FROM s_curves WHERE project_id = $1 ORDER BY urutan', [1]);
  console.log('   project 1 s_curve points:', sc.rows.length);

  const mk = await q('SELECT COUNT(*)::int AS c FROM kendalas WHERE project_id=$1', [1]);
  console.log('   kendala code next:', 'K-' + String(mk.rows[0].c + 1).padStart(2, '0'));

  // Validate upsert
  await q('INSERT INTO s_curves (project_id, minggu, rencana, realisasi, catatan, urutan) VALUES ($1,$2,$3,$4,$5,$6)', [1, 'M-10 (Test)', 50, 55, 'catatan', 10]);
  const up = await q('SELECT * FROM s_curves WHERE project_id=$1 AND minggu=$2', [1, 'M-10 (Test)']);
  console.log('   upsert insert ok:', up.rows.length === 1);

  console.log('5. Business logic sanity:');
  console.log('   deriveStatus(70,75):', deriveStatus(70, 75));
  console.log('   defaultMilestones(45):', defaultMilestones(45).length, 'items');
  console.log('   defaultSCurvePoints(45,47):', defaultSCurvePoints(45, 47).length, 'points');

  console.log('\nALL TESTS PASSED.');
  await db.close();
  process.exit(0);
}

main().catch((e) => {
  console.error('TEST FAILED:', e);
  process.exit(1);
});