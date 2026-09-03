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
  { nama: 'Tim Enjin (Engineering)', email: 'enjin@pln.local', password: 'enjin123', role: 'enjin' },
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
    const { milestones, scurves, kendalas, dokumentasis, terminBayars, drawings, ...proj } = p;
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

    // Seed Approval Drawings for first project
    if (pid === 1) {
      const sampleDrawings = [
        {
          judul: 'DWG-GI-150-001 Single Line Diagram & Layout Switchyard',
          nomor_drawing: 'DWG/2024/SRP/001',
          kategori: 'Elektromekanikal',
          file_vendor: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          tgl_upload_vendor: '2024-05-01',
          hardfile_vendor: true,
          tgl_hardfile_vendor: '2024-05-05',
          nodin_kons: true,
          nomor_nodin: 'ND-042/PLN-UIP/2024',
          tgl_nodin: '2024-05-08',
          hardfile_ke_enjin: true,
          tgl_hardfile_ke_enjin: '2024-05-10',
          enjin_review_status: 'Approved',
          tgl_enjin_review: '2024-05-12',
          status_approval: 'Approved',
          catatan_enjin: 'Disetujui penuh oleh Tim Engineering. Dokumen hasil stempel approval diunggah.',
          file_enjin: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          tgl_approval_enjin: '2024-05-15',
        },
        {
          judul: 'DWG-GI-150-002 Desain Pondasi Transformer Daya 60 MVA',
          nomor_drawing: 'DWG/2024/SRP/002',
          kategori: 'Sipil & Konstruksi',
          file_vendor: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          tgl_upload_vendor: '2024-05-15',
          hardfile_vendor: true,
          tgl_hardfile_vendor: '2024-05-18',
          nodin_kons: true,
          nomor_nodin: 'ND-058/PLN-UIP/2024',
          tgl_nodin: '2024-05-20',
          hardfile_ke_enjin: true,
          tgl_hardfile_ke_enjin: '2024-05-22',
          enjin_review_status: 'In Review',
          tgl_enjin_review: '2024-05-24',
          status_approval: 'Dalam Review Enjin',
          catatan_enjin: 'Proses review perhitungan beban tanah dan ketahanan gempa sedang berjalan.',
          file_enjin: null,
          tgl_approval_enjin: null,
        },
        {
          judul: 'DWG-GI-150-003 Skema Proteksi & Interlocking Bay Line 150 kV',
          nomor_drawing: 'DWG/2024/SRP/003',
          kategori: 'Proteksi & Kontrol',
          file_vendor: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          tgl_upload_vendor: '2024-06-01',
          hardfile_vendor: false,
          tgl_hardfile_vendor: null,
          nodin_kons: false,
          nomor_nodin: null,
          tgl_nodin: null,
          hardfile_ke_enjin: false,
          tgl_hardfile_ke_enjin: null,
          enjin_review_status: 'Pending',
          tgl_enjin_review: null,
          status_approval: 'Menunggu Kirim Hardfile',
          catatan_enjin: null,
          file_enjin: null,
          tgl_approval_enjin: null,
        },
      ];
      for (const dwg of sampleDrawings) {
        await query(
          `INSERT INTO approval_drawings
          (project_id, judul, nomor_drawing, kategori, file_vendor, tgl_upload_vendor, hardfile_vendor, tgl_hardfile_vendor, nodin_kons, nomor_nodin, tgl_nodin, hardfile_ke_enjin, tgl_hardfile_ke_enjin, enjin_review_status, tgl_enjin_review, status_approval, catatan_enjin, file_enjin, tgl_approval_enjin)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
          [
            pid, dwg.judul, dwg.nomor_drawing, dwg.kategori, dwg.file_vendor, dwg.tgl_upload_vendor,
            dwg.hardfile_vendor, dwg.tgl_hardfile_vendor, dwg.nodin_kons, dwg.nomor_nodin, dwg.tgl_nodin,
            dwg.hardfile_ke_enjin, dwg.tgl_hardfile_ke_enjin, dwg.enjin_review_status, dwg.tgl_enjin_review,
            dwg.status_approval, dwg.catatan_enjin, dwg.file_enjin, dwg.tgl_approval_enjin,
          ]
        );
      }
    }
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