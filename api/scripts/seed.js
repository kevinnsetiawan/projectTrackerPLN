// Seed script: create schema and insert the 8 project datasets.
import 'dotenv/config';
import { query } from '../_lib/db.js';
import { DDL } from '../_lib/schema.js';
import { SEED } from '../_lib/seedData.js';

async function seed() {
  console.log('Creating schema...');
  await query(DDL);

  console.log('Deleting existing app data...');
  await query('DELETE FROM milestones');
  await query('DELETE FROM s_curves');
  await query('DELETE FROM kendalas');
  await query('DELETE FROM dokumentasis');
  await query('DELETE FROM projects');

  for (const p of SEED) {
    const { milestones, scurves, kendalas, dokumentasis, ...proj } = p;
    const cols = Object.keys(proj);
    const vals = cols.map((c) => proj[c]);
    const ph = cols.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await query(
      `INSERT INTO projects (${cols.join(', ')}) VALUES (${ph}) RETURNING id`,
      vals
    );
    const projectId = rows[0].id;

    for (const m of milestones) {
      await query(
        'INSERT INTO milestones (project_id, nama, bobot, rencana, realisasi, status, urutan) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [projectId, m.nama, m.bobot, m.rencana, m.realisasi, m.status, m.urutan]
      );
    }
    for (const s of scurves) {
      await query(
        'INSERT INTO s_curves (project_id, minggu, rencana, realisasi, urutan) VALUES ($1,$2,$3,$4,$5)',
        [projectId, s.minggu, s.rencana, s.realisasi ?? null, s.urutan]
      );
    }
    for (const k of kendalas) {
      await query(
        'INSERT INTO kendalas (project_id, kode_kendala, kategori, deskripsi, dampak, tindakan_mitigasi, status, tgl_lapor, tgl_selesai) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [projectId, k.kode_kendala, k.kategori, k.deskripsi, k.dampak ?? null, k.tindakan_mitigasi ?? null, k.status, k.tgl_lapor ?? null, k.tgl_selesai ?? null]
      );
    }
    for (const d of dokumentasis) {
      await query(
        'INSERT INTO dokumentasis (project_id, judul, tahap, foto, tgl, keterangan) VALUES ($1,$2,$3,$4,$5,$6)',
        [projectId, d.judul, d.tahap ?? null, d.foto, d.tgl ?? null, d.keterangan ?? null]
      );
    }
  }
  console.log(`Seeded ${SEED.length} projects.`);
  process.exit(0);
}

seed().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});