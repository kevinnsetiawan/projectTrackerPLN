import { Router } from 'express';
import { query } from '../_lib/db.js';
import {
  IK_APPROVAL_LEVELS, IK_TAHAP, IK_STATUS,
  isoDate, ikLevelForRole, ikPendingLevel, ikStatusFromApprovals,
} from '../_lib/business.js';
import { asyncHandler, err, getProject } from '../_lib/http.js';
import { requireAuth, requireRole } from '../_lib/auth.js';
import { broadcast, TOPIC } from '../_lib/events.js';

const router = Router();

const BOOL_FIELDS = ['jsa', 'wp', 'dp3', 'on_safety', 'on_quality', 'on_schedule', 'on_supervision'];
const DATE_FIELDS = ['tgl_kontrak', 'tgl_survei', 'tgl_pembahasan', 'tgl_penjadwalan', 'tgl_izin'];

function cleanText(v, max = 2000) {
  return String(v ?? '').trim().slice(0, max);
}

function tahapOr(v, fallback = 'Pembahasan IK') {
  const s = cleanText(v, 60);
  return IK_TAHAP.includes(s) ? s : fallback;
}

// Payload proses pekerjaan eksternal (tahap, tanggal, perizinan, indikator).
// `prev` dipakai saat update agar field yang tidak dikirim tidak ter-reset.
function prosesPayload(b, prev = {}) {
  const out = {};
  out.tahap = b.tahap !== undefined ? tahapOr(b.tahap, prev.tahap || 'Pembahasan IK') : (prev.tahap || 'Pembahasan IK');
  for (const f of DATE_FIELDS) {
    if (b[f] === undefined) out[f] = prev[f] ?? null;
    else out[f] = b[f] ? isoDate(b[f]) : null;
  }
  for (const f of BOOL_FIELDS) {
    out[f] = b[f] === undefined ? Boolean(prev[f]) : Boolean(b[f]);
  }
  return out;
}

// Lampirkan baris approval putaran aktif ke setiap IK. Baris kosong berarti
// IK lama (sebelum fitur approval) yang dianggap sudah approved.
async function attachApprovals(rows) {
  if (!rows.length) return rows;
  const ph = rows.map((_, i) => `$${i + 1}`).join(',');
  const { rows: apps } = await query(
    `SELECT a.* FROM ik_approvals a
     JOIN instruksi_kerja ik ON ik.id = a.instruksi_id AND ik.putaran = a.putaran
     WHERE a.instruksi_id IN (${ph})
     ORDER BY a.level`,
    rows.map((r) => r.id)
  );
  const byId = new Map();
  for (const a of apps) {
    if (!byId.has(a.instruksi_id)) byId.set(a.instruksi_id, []);
    byId.get(a.instruksi_id).push(a);
  }
  return rows.map((r) => ({ ...r, approvals: byId.get(r.id) || [] }));
}

async function getIk(id) {
  const { rows } = await query('SELECT * FROM instruksi_kerja WHERE id = $1', [id]);
  return rows[0] || null;
}

async function getIkDetail(id) {
  const ik = await getIk(id);
  if (!ik) return null;
  const [current, history] = await Promise.all([
    query(
      'SELECT * FROM ik_approvals WHERE instruksi_id = $1 AND putaran = $2 ORDER BY level',
      [id, ik.putaran]
    ),
    query(
      'SELECT * FROM ik_approvals WHERE instruksi_id = $1 ORDER BY putaran DESC, level',
      [id]
    ),
  ]);
  return { ...ik, approvals: current.rows, riwayat: history.rows };
}

// Insert tiga baris approval (satu per jenjang) untuk putaran tertentu.
async function seedApprovalRows(instruksiId, putaran) {
  for (const lv of IK_APPROVAL_LEVELS) {
    await query(
      `INSERT INTO ik_approvals (instruksi_id, putaran, level, level_nama, peran, status)
       VALUES ($1,$2,$3,$4,$5,'Pending')`,
      [instruksiId, putaran, lv.level, lv.nama, lv.peran]
    );
  }
}

// Daftar IK lintas proyek untuk halaman "Approval IK".
router.get('/instruksi', asyncHandler(async (req, res) => {
  const { project_id, status, tahap, search } = req.query;
  let sql = `
    SELECT ik.*, p.kode AS project_kode, p.nama AS project_nama, p.kontraktor AS project_kontraktor
    FROM instruksi_kerja ik
    JOIN projects p ON p.id = ik.project_id
    WHERE 1=1
  `;
  const params = [];
  if (project_id && project_id !== 'all') {
    params.push(project_id);
    sql += ` AND ik.project_id = $${params.length}`;
  }
  if (status && status !== 'all') {
    params.push(status);
    sql += ` AND ik.status_approval = $${params.length}`;
  }
  if (tahap && tahap !== 'all') {
    params.push(tahap);
    sql += ` AND ik.tahap = $${params.length}`;
  }
  if (search) {
    params.push(`%${search}%`);
    sql += ` AND (ik.judul ILIKE $${params.length} OR ik.nomor_instruksi ILIKE $${params.length} OR p.nama ILIKE $${params.length})`;
  }
  sql += ' ORDER BY ik.id DESC';
  const { rows } = await query(sql, params);
  res.json(await attachApprovals(rows));
}));

// Detail satu IK + riwayat approval semua putaran.
router.get('/instruksi/:id', asyncHandler(async (req, res) => {
  const ik = await getIkDetail(req.params.id);
  if (!ik) throw err('Instruksi kerja tidak ditemukan', 404);
  res.json(ik);
}));

// Ajukan IK baru (project-scoped) — langsung masuk antrean approval ULTG.
router.post('/projects/:id/instruksi', requireAuth, requireRole('vendor', 'dalkon', 'admin'), asyncHandler(async (req, res) => {
  const proj = await getProject(req.params.id);
  if (!proj) throw err('Project not found', 404);
  const b = req.body || {};
  const judul = cleanText(b.judul, 300);
  const file = cleanText(b.file, 10000000);
  if (!judul || !file) throw err('Judul dan file instruksi kerja wajib diisi');
  const nomor = b.nomor_instruksi ? cleanText(b.nomor_instruksi, 120) : null;
  const jenis = b.jenis ? cleanText(b.jenis, 80) : 'Instruksi Kerja';
  const tgl = b.tgl ? isoDate(b.tgl) : new Date().toISOString().slice(0, 10);
  const p = prosesPayload(b);

  const { rows } = await query(
    `INSERT INTO instruksi_kerja
      (project_id, judul, nomor_instruksi, jenis, file, keterangan, tgl,
       status_approval, tahap, tgl_kontrak, tgl_survei, tgl_pembahasan, tgl_penjadwalan, tgl_izin,
       jsa, wp, dp3, on_safety, on_quality, on_schedule, on_supervision, putaran)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,1)
     RETURNING *`,
    [
      req.params.id, judul, nomor, jenis, file, b.keterangan ? cleanText(b.keterangan) : null, tgl,
      IK_STATUS.MENUNGGU_ULTG, p.tahap, p.tgl_kontrak, p.tgl_survei, p.tgl_pembahasan, p.tgl_penjadwalan, p.tgl_izin,
      p.jsa, p.wp, p.dp3, p.on_safety, p.on_quality, p.on_schedule, p.on_supervision,
    ]
  );
  const ik = rows[0];
  await seedApprovalRows(ik.id, 1);
  await broadcast(TOPIC.INSTRUKSI, { project_id: Number(req.params.id), action: 'create', actor: req.user.role });
  res.status(201).json(await getIkDetail(ik.id));
}));

// Ubah data / tahap / perizinan / indikator IK. Alur approval tidak di-reset
// di sini — pengajuan ulang punya endpoint sendiri agar jejaknya jelas.
router.put('/instruksi/:id', requireAuth, requireRole('vendor', 'dalkon', 'admin'), asyncHandler(async (req, res) => {
  const ik = await getIk(req.params.id);
  if (!ik) throw err('Instruksi kerja tidak ditemukan', 404);
  // Setelah masuk jenjang approval (ULTG disetujui / sedang direview), isi IK
  // tidak boleh diubah diam-diam agar keputusan jenjang sebelumnya tetap sah.
  if (req.user.role !== 'admin' && ![IK_STATUS.MENUNGGU_ULTG, IK_STATUS.REVISI, IK_STATUS.DITOLAK].includes(ik.status_approval)) {
    throw err('IK sedang dalam proses approval / sudah approved sehingga tidak dapat diubah. Tunggu keputusan jenjang atau minta Administrator.', 403);
  }
  const b = req.body || {};
  const judul = cleanText(b.judul ?? ik.judul, 300);
  if (!judul) throw err('Judul instruksi wajib diisi');
  const file = cleanText(b.file ?? ik.file, 10000000) || ik.file;
  const tgl = b.tgl ? isoDate(b.tgl) : ik.tgl;
  const p = prosesPayload(b, ik);

  const { rows } = await query(
    `UPDATE instruksi_kerja SET
      judul=$1, nomor_instruksi=$2, jenis=$3, file=$4, keterangan=$5, tgl=$6,
      tahap=$7, tgl_kontrak=$8, tgl_survei=$9, tgl_pembahasan=$10, tgl_penjadwalan=$11, tgl_izin=$12,
      jsa=$13, wp=$14, dp3=$15, on_safety=$16, on_quality=$17, on_schedule=$18, on_supervision=$19,
      updated_at=now()
     WHERE id=$20 RETURNING *`,
    [
      judul,
      b.nomor_instruksi !== undefined ? (cleanText(b.nomor_instruksi, 120) || null) : ik.nomor_instruksi,
      b.jenis !== undefined ? (cleanText(b.jenis, 80) || 'Instruksi Kerja') : ik.jenis,
      file,
      b.keterangan !== undefined ? (cleanText(b.keterangan) || null) : ik.keterangan,
      tgl,
      p.tahap, p.tgl_kontrak, p.tgl_survei, p.tgl_pembahasan, p.tgl_penjadwalan, p.tgl_izin,
      p.jsa, p.wp, p.dp3, p.on_safety, p.on_quality, p.on_schedule, p.on_supervision,
      ik.id,
    ]
  );
  await broadcast(TOPIC.INSTRUKSI, { project_id: rows[0].project_id, action: 'update', actor: req.user.role });
  res.json(await getIkDetail(ik.id));
}));

// Ajukan ulang setelah Revisi/Ditolak: putaran naik, approval mulai dari ULTG.
router.post('/instruksi/:id/ajukan-ulang', requireAuth, requireRole('vendor', 'dalkon', 'admin'), asyncHandler(async (req, res) => {
  const ik = await getIk(req.params.id);
  if (!ik) throw err('Instruksi kerja tidak ditemukan', 404);
  if (![IK_STATUS.REVISI, IK_STATUS.DITOLAK].includes(ik.status_approval)) {
    throw err('IK hanya bisa diajukan ulang setelah berstatus Revisi atau Ditolak');
  }
  const putaran = (Number(ik.putaran) || 1) + 1;
  await query(
    `UPDATE instruksi_kerja SET putaran=$1, status_approval=$2, updated_at=now() WHERE id=$3`,
    [putaran, IK_STATUS.MENUNGGU_ULTG, ik.id]
  );
  await seedApprovalRows(ik.id, putaran);
  await broadcast(TOPIC.INSTRUKSI, { project_id: ik.project_id, action: 'resubmit', actor: req.user.role });
  res.json(await getIkDetail(ik.id));
}));

// Keputusan approval per jenjang: ULTG (dalkon) -> UPT (enjin) -> Unit Induk (admin).
// Admin (superuser) boleh memutuskan di jenjang mana pun.
router.patch('/instruksi/:id/approve', requireAuth, requireRole('dalkon', 'enjin', 'admin'), asyncHandler(async (req, res) => {
  const ik = await getIk(req.params.id);
  if (!ik) throw err('Instruksi kerja tidak ditemukan', 404);
  const b = req.body || {};

  const { rows } = await query(
    'SELECT * FROM ik_approvals WHERE instruksi_id = $1 AND putaran = $2 ORDER BY level',
    [ik.id, ik.putaran]
  );
  const pending = ikPendingLevel(rows);
  if (pending === null) throw err('Tidak ada jenjang approval yang menunggu keputusan');

  let level = ikLevelForRole(req.user.role);
  if (req.user.role === 'admin' && b.level !== undefined && b.level !== '') {
    level = Number(b.level);
  } else if (req.user.role === 'admin') {
    level = pending;
  }
  if (!level) throw err('Peran ini tidak punya jenjang approval IK', 403);
  if (level !== pending) {
    const target = IK_APPROVAL_LEVELS.find((l) => l.level === pending);
    throw err(`Menunggu keputusan jenjang ${target ? target.nama : pending} terlebih dahulu`, 409);
  }

  const keputusan = cleanText(b.keputusan || b.status || 'Approved', 30);
  if (!['Approved', 'Revisi', 'Ditolak'].includes(keputusan)) {
    throw err('Keputusan approval harus Approved, Revisi, atau Ditolak');
  }
  const catatan = b.catatan !== undefined ? (cleanText(b.catatan) || null) : null;
  const file = b.file !== undefined ? (cleanText(b.file, 10000000) || null) : null;

  await query(
    `UPDATE ik_approvals SET status=$1, catatan=$2, file=COALESCE($3, file),
      approver=$4, tgl=now(), updated_at=now()
     WHERE instruksi_id=$5 AND putaran=$6 AND level=$7`,
    [keputusan, catatan, file, req.user.nama || req.user.email || req.user.role, ik.id, ik.putaran, level]
  );

  const fresh = await query(
    'SELECT * FROM ik_approvals WHERE instruksi_id = $1 AND putaran = $2 ORDER BY level',
    [ik.id, ik.putaran]
  );
  const status = ikStatusFromApprovals(fresh.rows);
  await query('UPDATE instruksi_kerja SET status_approval=$1, updated_at=now() WHERE id=$2', [status, ik.id]);
  await broadcast(TOPIC.INSTRUKSI, { project_id: ik.project_id, action: 'approve', actor: req.user.role });
  res.json(await getIkDetail(ik.id));
}));

// Hapus IK (beserta baris approval via ON DELETE CASCADE).
router.delete('/instruksi/:id', requireAuth, requireRole('vendor', 'dalkon', 'admin'), asyncHandler(async (req, res) => {
  const ik = await getIk(req.params.id);
  if (!ik) throw err('Instruksi kerja tidak ditemukan', 404);
  if (req.user.role !== 'admin' && ![IK_STATUS.MENUNGGU_ULTG, IK_STATUS.REVISI, IK_STATUS.DITOLAK].includes(ik.status_approval)) {
    throw err('IK yang sedang diproses / sudah approved hanya dapat dihapus oleh Administrator.', 403);
  }
  const { rows } = await query('DELETE FROM instruksi_kerja WHERE id = $1 RETURNING project_id', [ik.id]);
  if (!rows.length) throw err('Instruksi kerja tidak ditemukan', 404);
  await broadcast(TOPIC.INSTRUKSI, { project_id: rows[0].project_id, action: 'delete', actor: req.user.role });
  res.json({ ok: true });
}));

export default router;
