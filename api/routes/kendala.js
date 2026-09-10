import { Router } from 'express';
import { query } from '../_lib/db.js';
import { KATEGORI_KENDALA, nextKendalaCode, isoDate } from '../_lib/business.js';
import { requireAuth } from '../_lib/auth.js';
import { asyncHandler, err, getProject } from '../_lib/http.js';

const router = Router();

// List with filters + pagination
router.get('/kendala', asyncHandler(async (req, res) => {
  const { search, kategori, status, page = 1, perPage = 15 } = req.query;
  const conditions = [];
  const params = [];
  let i = 1;
  if (status && status !== 'all') { params.push(status); conditions.push(`k.status = $${i}`); i++; }
  if (kategori && kategori !== 'all') { params.push(kategori); conditions.push(`k.kategori = $${i}`); i++; }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(k.deskripsi ILIKE $${i} OR k.dampak ILIKE $${i} OR k.tindakan_mitigasi ILIKE $${i} OR p.nama ILIKE $${i} OR p.kode ILIKE $${i})`);
    i++;
  }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const offset = (Number(page) - 1) * Number(perPage);
  const countRes = await query(
    `SELECT COUNT(*)::int AS total FROM kendalas k JOIN projects p ON p.id = k.project_id ${where}`, params);
  const total = countRes.rows[0].total;
  const { rows } = await query(
    `SELECT k.*, p.kode AS project_kode, p.nama AS project_nama, p.uip AS project_uip
     FROM kendalas k JOIN projects p ON p.id = k.project_id ${where}
     ORDER BY CASE k.status WHEN 'Open' THEN 1 WHEN 'In Review' THEN 2 ELSE 3 END, k.tgl_lapor DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    [...params, Number(perPage), offset]
  );

  const counts = await query(
    `SELECT SUM(CASE WHEN status='Open' THEN 1 ELSE 0 END)::int AS open,
            SUM(CASE WHEN status='In Review' THEN 1 ELSE 0 END)::int AS inreview,
            SUM(CASE WHEN status='Resolved' THEN 1 ELSE 0 END)::int AS resolved
     FROM kendalas`);
  res.json({
    data: rows,
    pagination: { total, page: Number(page), perPage: Number(perPage), lastPage: Math.max(1, Math.ceil(total / Number(perPage))) },
    counts: counts.rows[0],
    kategoris: KATEGORI_KENDALA,
  });
}));

// Store (project-scoped)
router.post('/projects/:id/kendala', requireAuth, asyncHandler(async (req, res) => {
  const proj = await getProject(req.params.id);
  if (!proj) throw err('Project not found', 404);
  const b = req.body;
  if (!b.kategori || !b.deskripsi || !b.status) throw err('kategori, deskripsi, status wajib');

  const cnt = await query('SELECT COUNT(*)::int AS c FROM kendalas WHERE project_id=$1', [req.params.id]);
  const kode_kendala = nextKendalaCode(cnt.rows[0].c);
  const tgl_lapor = b.tgl_lapor ? isoDate(b.tgl_lapor) : new Date().toISOString().slice(0, 10);

  const { rows } = await query(
    `INSERT INTO kendalas (project_id, kode_kendala, kategori, deskripsi, dampak, tindakan_mitigasi, status, tgl_lapor, pelapor)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [req.params.id, kode_kendala, b.kategori, b.deskripsi, b.dampak || null, b.tindakan_mitigasi || null, b.status, tgl_lapor, req.user.role]
  );

  res.status(201).json({ id: rows[0].id, kode_kendala });
}));

// Update status
router.patch('/kendala/:id/status', requireAuth, asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['Open', 'In Review', 'Resolved'].includes(status)) throw err('Status tidak valid');
  const tgl_selesai = status === 'Resolved' ? new Date().toISOString().slice(0, 10) : null;
  await query('UPDATE kendalas SET status=$1, tgl_selesai=$2, updated_at=now() WHERE id=$3', [status, tgl_selesai, req.params.id]);
  res.json({ ok: true });
}));

// Update content (kategori, deskripsi, dampak, mitigasi, status)
router.put('/kendala/:id', requireAuth, asyncHandler(async (req, res) => {
  const b = req.body || {};
  const kategori = String(b.kategori || '').trim();
  const deskripsi = String(b.deskripsi || '').trim();
  if (!kategori || !deskripsi) throw err('kategori dan deskripsi wajib');
  if (!['Open', 'In Review', 'Resolved'].includes(b.status)) throw err('Status tidak valid');
  await query(
    `UPDATE kendalas SET kategori=$1, deskripsi=$2, dampak=$3, tindakan_mitigasi=$4, status=$5, updated_at=now() WHERE id=$6`,
    [kategori, deskripsi, (b.dampak || '').trim() || null, (b.tindakan_mitigasi || '').trim() || null, b.status, req.params.id]
  );
  res.json({ ok: true });
}));

// Delete
router.delete('/kendala/:id', requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await query('DELETE FROM kendalas WHERE id = $1 RETURNING id', [req.params.id]);
  if (!rows.length) throw err('Kendala tidak ditemukan', 404);
  res.json({ ok: true });
}));

export default router;
