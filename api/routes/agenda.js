import { Router } from 'express';
import { query } from '../_lib/db.js';
import { AGENDA_STATUS, AGENDA_SURAT_STATUS, groupAgendasByPeriod, buildAgendaRekapText } from '../_lib/business.js';
import { requireAuth } from '../_lib/auth.js';
import { asyncHandler, err, getProject } from '../_lib/http.js';

const router = Router();

const ALLOWED = [
  'judul', 'tgl_rapat', 'jam_rapat', 'lokasi', 'link_video', 'peserta',
  'topik', 'hasil', 'status_surat', 'nomor_surat', 'reminder_hari', 'status',
];

function sanitize(b) {
  const out = {};
  for (const k of ALLOWED) {
    if (b[k] !== undefined) out[k] = b[k];
  }
  if (out.tgl_rapat) out.tgl_rapat = String(out.tgl_rapat).slice(0, 10);
  if (out.reminder_hari !== undefined) out.reminder_hari = Math.max(0, Number(out.reminder_hari) || 0);
  if (out.status_surat !== undefined && !AGENDA_SURAT_STATUS.includes(out.status_surat)) out.status_surat = 'Belum Dibuat';
  if (out.status !== undefined && !AGENDA_STATUS.includes(out.status)) out.status = 'Terjadwal';
  return out;
}

async function loadProjectsMap(ids) {
  if (!ids.length) return {};
  const { rows } = await query('SELECT id, kode, nama FROM projects WHERE id = ANY($1::int[])', [ids]);
  const map = {};
  for (const r of rows) map[r.id] = r;
  return map;
}

// List (cross-project) with filters + optional period grouping.
router.get('/agenda', asyncHandler(async (req, res) => {
  const { project_id, status, periode, tgl } = req.query;
  const conditions = [];
  const params = [];
  let i = 1;
  if (project_id) { params.push(project_id); conditions.push(`a.project_id = $${i}`); i++; }
  if (status && status !== 'all') { params.push(status); conditions.push(`a.status = $${i}`); i++; }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const { rows } = await query(
    `SELECT a.*, p.kode AS project_kode, p.nama AS project_nama, p.uip AS project_uip
     FROM agendas a JOIN projects p ON p.id = a.project_id ${where}
     ORDER BY a.tgl_rapat ASC, a.jam_rapat ASC NULLS LAST, a.id ASC`,
    params
  );

  const result = { data: rows, periods: null, statuses: AGENDA_STATUS, suratStatuses: AGENDA_SURAT_STATUS };
  if (periode === 'minggu' || periode === 'bulan') {
    const anchor = tgl || new Date().toISOString().slice(0, 10);
    const groups = groupAgendasByPeriod(rows, periode, anchor);
    const ids = [...new Set(rows.map((r) => r.project_id))];
    const projekMap = await loadProjectsMap(ids);
    result.periods = groups;
    result.preview = buildAgendaRekapText(periode, anchor, groups, projekMap);
  }
  res.json(result);
}));

// List for one project (used inside ProjectShow tab).
router.get('/projects/:id/agendas', asyncHandler(async (req, res) => {
  const proj = await getProject(req.params.id);
  if (!proj) throw err('Project not found', 404);
  const { rows } = await query(
    'SELECT * FROM agendas WHERE project_id = $1 ORDER BY tgl_rapat DESC, id DESC',
    [req.params.id]
  );
  res.json({ data: rows });
}));

// Create (project-scoped).
router.post('/projects/:id/agendas', requireAuth, asyncHandler(async (req, res) => {
  const proj = await getProject(req.params.id);
  if (!proj) throw err('Project not found', 404);
  const b = sanitize(req.body);
  if (!b.judul || !b.tgl_rapat) throw err('judul dan tgl_rapat wajib diisi');

  const { rows } = await query(
    `INSERT INTO agendas
       (project_id, judul, tgl_rapat, jam_rapat, lokasi, link_video, peserta, topik, hasil,
        status_surat, nomor_surat, reminder_hari, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING id`,
    [req.params.id, b.judul, b.tgl_rapat, b.jam_rapat || null, b.lokasi || null, b.link_video || null,
      b.peserta || null, b.topik || null, b.hasil || null, b.status_surat || 'Belum Dibuat',
      b.nomor_surat || null, b.reminder_hari ?? 1, b.status || 'Terjadwal', req.user.role]
  );
  res.status(201).json({ id: rows[0].id });
}));

// Update a single agenda.
router.put('/agendas/:id', requireAuth, asyncHandler(async (req, res) => {
  const b = sanitize(req.body);
  if (b.judul && !b.judul.trim()) throw err('judul tidak boleh kosong');
  const sets = [];
  const params = [];
  let i = 1;
  for (const k of ALLOWED) {
    if (b[k] !== undefined) { sets.push(`${k} = $${i}`); params.push(b[k]); i++; }
  }
  if (!sets.length) throw err('Tidak ada data yang diubah');
  sets.push(`updated_at = now()`);
  params.push(req.params.id);
  await query(`UPDATE agendas SET ${sets.join(', ')} WHERE id = $${i}`, params);
  res.json({ ok: true });
}));

// Delete
router.delete('/agendas/:id', requireAuth, asyncHandler(async (req, res) => {
  await query('DELETE FROM agendas WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
}));

// Rekap endpoint (groups + preview text + WA config presence).
router.get('/agenda/rekap', asyncHandler(async (req, res) => {
  const { periode = 'minggu', tgl } = req.query;
  if (!['minggu', 'bulan'].includes(periode)) throw err('periode harus minggu atau bulan');
  const anchor = tgl || new Date().toISOString().slice(0, 10);
  const { rows } = await query(
    `SELECT a.*, p.kode AS project_kode, p.nama AS project_nama
     FROM agendas a JOIN projects p ON p.id = a.project_id ORDER BY a.tgl_rapat ASC, a.jam_rapat ASC NULLS LAST`
  );
  const groups = groupAgendasByPeriod(rows, periode, anchor);
  const ids = [...new Set(rows.map((r) => r.project_id))];
  const projekMap = await loadProjectsMap(ids);
  res.json({
    periode,
    tgl: anchor,
    groups,
    text: buildAgendaRekapText(periode, anchor, groups, projekMap),
    fonnteConfigured: Boolean(process.env.FONNTE_TOKEN && process.env.FONNTE_TARGET),
  });
}));

// Send rekap to a WhatsApp group via Fonnte.
router.post('/agenda/kirim-wa', asyncHandler(async (req, res) => {
  const { periode = 'minggu', tgl } = req.body || {};
  if (!['minggu', 'bulan'].includes(periode)) throw err('periode harus minggu atau bulan');
  const token = process.env.FONNTE_TOKEN;
  const target = process.env.FONNTE_TARGET;
  if (!token || !target) {
    throw err('Integrasi WhatsApp belum dikonfigurasi (FONNTE_TOKEN / FONNTE_TARGET).', 400);
  }
  const anchor = tgl || new Date().toISOString().slice(0, 10);
  const { rows } = await query(
    `SELECT a.*, p.kode AS project_kode, p.nama AS project_nama
     FROM agendas a JOIN projects p ON p.id = a.project_id ORDER BY a.tgl_rapat ASC, a.jam_rapat ASC NULLS LAST`
  );
  const groups = groupAgendasByPeriod(rows, periode, anchor);
  const ids = [...new Set(rows.map((r) => r.project_id))];
  const projekMap = await loadProjectsMap(ids);
  const text = buildAgendaRekapText(periode, anchor, groups, projekMap);

  const url = 'https://api.fonnte.com/send';
  const payload = new URLSearchParams({ target, message: text });
  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: token },
    body: payload,
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok || body.status === false) {
    console.error('Fonnte send failed', body);
    throw err(`Gagal mengirim ke WhatsApp: ${body.reason || body.detail || resp.status}`, 502);
  }
  res.json({ ok: true, fonnteId: body.id });
}));

export default router;
