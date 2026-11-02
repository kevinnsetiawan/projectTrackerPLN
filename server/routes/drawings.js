import { Router } from 'express';
import { query } from '../_lib/db.js';
import { isoDate } from '../_lib/business.js';
import { asyncHandler, err, drawingCols, sendStoredFile } from '../_lib/http.js';
import { requireAuth, requireRole } from '../_lib/auth.js';
import { broadcast, TOPIC } from '../_lib/events.js';

const router = Router();

// List drawings with filters + search (tanpa isi berkas — lihat drawingCols).
router.get('/drawings', asyncHandler(async (req, res) => {
  const { project_id, status, search } = req.query;
  let sql = `
    SELECT ${drawingCols('d')}, p.kode as project_kode, p.nama as project_nama, p.kontraktor as project_kontraktor
    FROM approval_drawings d
    JOIN projects p ON d.project_id = p.id
    WHERE 1=1
  `;
  const params = [];
  if (project_id && project_id !== 'all') {
    params.push(project_id);
    sql += ` AND d.project_id = $${params.length}`;
  }
  if (status && status !== 'all') {
    params.push(status);
    sql += ` AND d.status_approval = $${params.length}`;
  }
  if (search) {
    params.push(`%${search}%`);
    sql += ` AND (d.judul ILIKE $${params.length} OR d.nomor_drawing ILIKE $${params.length} OR p.nama ILIKE $${params.length})`;
  }
  sql += ` ORDER BY d.id DESC`;
  const { rows } = await query(sql, params);
  res.json(rows);
}));

// Berkas drawing (vendor / enjin). Dulu isinya ikut dalam JSON daftar drawing
// sehingga satu halaman bisa mengunduh puluhan MB base64; sekarang diambil per
// berkas saat tautan diklik. Mendukung data-URL (disimpan di DB) maupun URL
// eksternal (redirect). `?token=` dipakai karena dibuka sebagai anchor baru
// (browser tidak mengirim header Authorization).
router.get('/drawings/:id/file/:side', asyncHandler(async (req, res) => {
  const side = req.params.side === 'enjin' ? 'file_enjin' : 'file_vendor';
  const { rows } = await query(
    `SELECT id, judul, nomor_drawing, ${side} AS data FROM approval_drawings WHERE id = $1`,
    [req.params.id]
  );
  if (!rows.length) throw err('Drawing tidak ditemukan', 404);
  const row = rows[0];
  sendStoredFile(res, row.data, { filename: row.nomor_drawing || row.judul || `drawing-${row.id}` });
}));

// Create drawing (project-scoped)
router.post('/projects/:id/drawings', requireAuth, requireRole('vendor', 'admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const b = req.body || {};
  const judul = String(b.judul || '').trim();
  const nomor_drawing = String(b.nomor_drawing || '').trim();
  const kategori = String(b.kategori || 'Sipil & Konstruksi').trim();
  const file_vendor = String(b.file_vendor || '').trim();
  if (!judul || !file_vendor) throw err('Judul drawing dan dokumen vendor wajib diisi');

  const { rows } = await query(
    `INSERT INTO approval_drawings 
    (project_id, judul, nomor_drawing, kategori, file_vendor, tgl_upload_vendor, status_approval)
    VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, 'Menunggu Hardfile')
    RETURNING ${drawingCols()}`,
    [id, judul, nomor_drawing, kategori, file_vendor]
  );
  await broadcast(TOPIC.DRAWING, { project_id: Number(id), action: 'create', actor: req.user.role });
  res.status(201).json(rows[0]);
}));

// Dalkon update
router.patch('/drawings/:id/dalkon', requireAuth, requireRole('dalkon', 'admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const b = req.body || {};
  const hardfile_vendor = Boolean(b.hardfile_vendor);
  const nodin_kons = Boolean(b.nodin_kons);
  const nomor_nodin = b.nomor_nodin ? String(b.nomor_nodin).trim() : null;
  const hardfile_ke_enjin = Boolean(b.hardfile_ke_enjin);

  let status_approval = 'Menunggu Hardfile';
  if (hardfile_ke_enjin) status_approval = 'Dalam Review Engineering';
  else if (nodin_kons) status_approval = 'Menunggu Penyerahan Engineering';
  else if (hardfile_vendor) status_approval = 'Menunggu Nodin';

  const tgl_hardfile_vendor = hardfile_vendor ? (b.tgl_hardfile_vendor || isoDate(new Date())) : null;
  const tgl_nodin = nodin_kons ? (b.tgl_nodin || isoDate(new Date())) : null;
  const tgl_hardfile_ke_enjin = hardfile_ke_enjin ? (b.tgl_hardfile_ke_enjin || isoDate(new Date())) : null;
  const enjin_review_status = hardfile_ke_enjin ? 'In Review' : 'Pending';

  const { rows } = await query(
    `UPDATE approval_drawings SET
      hardfile_vendor = $1, tgl_hardfile_vendor = $2,
      nodin_kons = $3, nomor_nodin = $4, tgl_nodin = $5,
      hardfile_ke_enjin = $6, tgl_hardfile_ke_enjin = $7,
      enjin_review_status = $8, status_approval = $9,
      updated_at = now()
    WHERE id = $10 RETURNING ${drawingCols()}`,
    [
      hardfile_vendor, tgl_hardfile_vendor,
      nodin_kons, nomor_nodin, tgl_nodin,
      hardfile_ke_enjin, tgl_hardfile_ke_enjin,
      enjin_review_status, status_approval, id
    ]
  );
  if (!rows.length) throw err('Drawing tidak ditemukan', 404);
  await broadcast(TOPIC.DRAWING, { project_id: rows[0].project_id, action: 'dalkon', actor: req.user.role });
  res.json(rows[0]);
}));

// Engineering/Enjin update
router.patch('/drawings/:id/enjin', requireAuth, requireRole('enjin', 'admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const b = req.body || {};
  const review_status = String(b.enjin_review_status || 'Approved').trim();
  const catatan_enjin = String(b.catatan_enjin || '').trim();
  const incomingFile = String(b.file_enjin || '').trim();
  // '__existing__' = modal dibuka tanpa unggah berkas baru (isi berkas tidak lagi
  // ikut di daftar drawing, lihat drawingCols) -> jangan menimpa berkas lama.
  const file_enjin = incomingFile && incomingFile !== '__existing__' ? incomingFile : null;

  const status_approval = review_status === 'Approved' ? 'Approved' : 'Revisi';
  const tgl_approval_enjin = isoDate(new Date());

  const { rows } = await query(
    `UPDATE approval_drawings SET
      enjin_review_status = $1, status_approval = $2,
      catatan_enjin = $3, file_enjin = COALESCE($4, file_enjin), tgl_approval_enjin = $5,
      tgl_enjin_review = COALESCE(tgl_enjin_review, CURRENT_DATE),
      updated_at = now()
    WHERE id = $6 RETURNING ${drawingCols()}`,
    [review_status, status_approval, catatan_enjin, file_enjin, tgl_approval_enjin, id]
  );
  if (!rows.length) throw err('Drawing tidak ditemukan', 404);
  await broadcast(TOPIC.DRAWING, { project_id: rows[0].project_id, action: 'enjin', actor: req.user.role });
  res.json(rows[0]);
}));

// Delete drawing
router.delete('/drawings/:id', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const del = await query('DELETE FROM approval_drawings WHERE id = $1 RETURNING project_id', [id]);
  await broadcast(TOPIC.DRAWING, { project_id: del.rows[0] ? del.rows[0].project_id : null, action: 'delete', actor: req.user.role });
  res.json({ success: true });
}));

export default router;
