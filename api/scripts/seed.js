// Seed script: create schema and insert the 8 project datasets.
// Works against PostgreSQL (Vercel) and PGlite (local dev/test).
import 'dotenv/config';
import { query } from '../_lib/db.js';
import { DDL } from '../_lib/schema.js';
import { SEED } from '../_lib/seedData.js';
import { recalcMilestonesFromBoq } from '../_lib/http.js';

async function seed() {
  console.log('Creating schema...');
  // Split DDL per-statement so it works on both PostgreSQL and PGlite.
  for (const stmt of DDL.split(';').map((s) => s.trim()).filter(Boolean)) {
    await query(stmt);
  }

  console.log('Deleting existing app data...');
  await query('DELETE FROM amandements');
  await query('DELETE FROM termin_bayars');
  await query('DELETE FROM boqs');
  await query('DELETE FROM lokasis');
  await query('DELETE FROM milestones');
  await query('DELETE FROM s_curves');
  await query('DELETE FROM kendalas');
  await query('DELETE FROM dokumentasis');
  await query('DELETE FROM projects');

  for (const p of SEED) {
    const { milestones, scurves, kendalas, dokumentasis, terminBayars, lokasis, amandements, boqs, ...proj } = p;
    const cols = Object.keys(proj).filter((c) => c !== 'id');
    const vals = cols.map((c) => proj[c]);
    const ph = cols.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await query(
      `INSERT INTO projects (${cols.join(', ')}) VALUES (${ph}) RETURNING id`,
      vals
    );
    const projectId = rows[0].id;

    for (const [i, l] of (lokasis || []).entries()) {
      await query(
        'INSERT INTO lokasis (project_id, nama, latitude, longitude, urutan) VALUES ($1,$2,$3,$4,$5)',
        [projectId, l.nama, l.latitude ?? null, l.longitude ?? null, l.urutan ?? i + 1]
      );
    }

    for (const m of milestones) {
      await query(
        'INSERT INTO milestones (project_id, nama, bobot, rencana, realisasi, status, urutan) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [projectId, m.nama, m.bobot, m.rencana, m.realisasi, m.status, m.urutan]
      );
    }
    for (const b of (boqs || [])) {
      const mId = b.milestone_urutan != null
        ? (await query('SELECT id FROM milestones WHERE project_id=$1 AND urutan=$2', [projectId, b.milestone_urutan])).rows[0].id
        : null;
      await query(
        'INSERT INTO boqs (project_id, uraian, satuan, volume, harga_satuan, total, progres, milestone_id, urutan) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [projectId, b.uraian, b.satuan ?? null, b.volume ?? null, b.harga_satuan ?? null,
          b.volume != null && b.harga_satuan != null ? Math.round(b.volume * b.harga_satuan * 100) / 100 : null,
          b.progres ?? 0, mId, b.urutan ?? (boqs.indexOf(b) + 1)]
      );
    }
    for (const s of scurves) {
      await query(
        'INSERT INTO s_curves (project_id, minggu, rencana, realisasi, pembuat, urutan) VALUES ($1,$2,$3,$4,$5,$6)',
        [projectId, s.minggu, s.rencana, s.realisasi ?? null, s.pembuat ?? null, s.urutan]
      );
    }
    for (const k of kendalas) {
      await query(
        'INSERT INTO kendalas (project_id, kode_kendala, kategori, deskripsi, dampak, tindakan_mitigasi, status, tgl_lapor, tgl_selesai, pelapor) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
        [projectId, k.kode_kendala, k.kategori, k.deskripsi, k.dampak ?? null, k.tindakan_mitigasi ?? null, k.status, k.tgl_lapor ?? null, k.tgl_selesai ?? null, k.pelapor ?? 'Dalkon']
      );
    }
    for (const d of dokumentasis) {
      await query(
        'INSERT INTO dokumentasis (project_id, judul, tahap, foto, tgl, keterangan) VALUES ($1,$2,$3,$4,$5,$6)',
        [projectId, d.judul, d.tahap ?? null, d.foto, d.tgl ?? null, d.keterangan ?? null]
      );
    }
    for (const [i, t] of (terminBayars || []).entries()) {
      await query(
        'INSERT INTO termin_bayars (project_id, nama, nominal, bobot, progres_fisik, status, tgl_bayar, urutan) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [projectId, t.nama, t.nominal, t.bobot, t.progres_fisik ?? 0, t.status, t.tgl_bayar ?? null, i + 1]
      );
    }
    for (const a of (amandements || [])) {
      await query(
        'INSERT INTO amandements (project_id, nomor, jenis, keterangan, file, durasi_hari, target_cod_lama, target_cod_baru, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [projectId, a.nomor ?? null, a.jenis ?? 'Perpanjangan Waktu', a.keterangan ?? null, a.file ?? null, a.durasi_hari ?? 0, a.target_cod_lama ?? null, a.target_cod_baru ?? null, a.created_by ?? null]
      );
    }
    if ((boqs || []).length) await recalcMilestonesFromBoq(projectId);
  }
  console.log(`Seeded ${SEED.length} projects.`);
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  });