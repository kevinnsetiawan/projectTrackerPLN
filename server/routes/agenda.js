import { projectScope, assertProject, requireCapability, agendaScope, assertAgenda, assertPic } from '../_lib/scope.js';
import { Router } from 'express';
import { query } from '../_lib/db.js';
import { AGENDA_STATUS, AGENDA_SURAT_STATUS, AGENDA_UMUM_LABEL, AGENDA_STATUS_PADAM, AGENDA_JENIS_PADAM, groupAgendasByPeriod, buildAgendaRekapText } from '../_lib/business.js';
import { requireAuth } from '../_lib/auth.js';
import { broadcast, TOPIC } from '../_lib/events.js';
import { asyncHandler, err, requireCapabilityOrEmptyScope } from '../_lib/http.js';

const router = Router();

const ALLOWED = [
  'project_id', 'judul', 'tgl_rapat', 'jam_rapat', 'lokasi', 'link_video', 'peserta',
  'topik', 'hasil', 'status_surat', 'nomor_surat', 'reminder_hari', 'status', 'penanggung_jawab', 'pic_user_id',
  'status_padam', 'jenis_padam', 'penyebab_padam', 'padam_mulai', 'padam_selesai', 'instruksi_kerja', 'rencana_kerja',
];

// Teks bebas agenda (trim + batas panjang; '' → null).
function text(v, max) {
  if (v === undefined) return undefined;
  return String(v || '').trim().slice(0, max) || null;
}

// Waktu padam dari input datetime-local ('YYYY-MM-DDTHH:MM'); nilai tidak valid → null.
function dateTimeLocal(v) {
  if (v === undefined) return undefined;
  const s = String(v || '').trim().replace(' ', 'T').slice(0, 16);
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s) ? s : null;
}

function sanitize(b) {
  const out = {};
  for (const k of ALLOWED) {
    if (b[k] !== undefined) out[k] = b[k];
  }
  if (out.project_id !== undefined) {
    const pid = Number(out.project_id);
    out.project_id = Number.isInteger(pid) && pid > 0 ? pid : null;
  }
  if (out.pic_user_id !== undefined) {
    const uid = Number(out.pic_user_id);
    out.pic_user_id = Number.isInteger(uid) && uid > 0 ? uid : null;
  }
  if (out.tgl_rapat) out.tgl_rapat = String(out.tgl_rapat).slice(0, 10);
  if (out.penanggung_jawab !== undefined) {
    out.penanggung_jawab = String(out.penanggung_jawab || '').trim().slice(0, 120) || null;
  }
  if (out.reminder_hari !== undefined) out.reminder_hari = Math.max(0, Number(out.reminder_hari) || 0);
  if (out.status_surat !== undefined && !AGENDA_SURAT_STATUS.includes(out.status_surat)) out.status_surat = 'Belum Dibuat';
  if (out.status !== undefined && !AGENDA_STATUS.includes(out.status)) out.status = 'Terjadwal';
  // Detail padam (hanya tampil saat status_padam = 'Padam'; nilai disimpan apa adanya).
  if (out.status_padam !== undefined && !AGENDA_STATUS_PADAM.includes(out.status_padam)) out.status_padam = 'Bukan Padam';
  if (out.jenis_padam !== undefined && out.jenis_padam && !AGENDA_JENIS_PADAM.includes(String(out.jenis_padam).trim())) {
    throw err('jenis_padam tidak valid');
  }
  if (out.jenis_padam !== undefined) out.jenis_padam = text(out.jenis_padam, 80);
  if (out.penyebab_padam !== undefined) out.penyebab_padam = text(out.penyebab_padam, 300);
  if (out.instruksi_kerja !== undefined) out.instruksi_kerja = text(out.instruksi_kerja, 2000);
  if (out.rencana_kerja !== undefined) out.rencana_kerja = text(out.rencana_kerja, 2000);
  if (out.padam_mulai !== undefined) out.padam_mulai = dateTimeLocal(out.padam_mulai);
  if (out.padam_selesai !== undefined) out.padam_selesai = dateTimeLocal(out.padam_selesai);
  return out;
}

async function loadProjectsMap(ids, req) {
  const list = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
  if (!list.length) return {};
  const scope = projectScope(req, 'p', 2);
  const { rows } = await query(`SELECT id, kode, nama FROM projects p WHERE id = ANY($1::int[]) AND (${scope.sql})`, [list, ...scope.params]);
  const map = {};
  for (const r of rows) map[r.id] = r;
  return map;
}

async function insertAgenda(b, projectId, req) {
  if (!b.judul || !b.judul.trim() || !b.tgl_rapat) throw err('judul dan tgl_rapat wajib diisi');
  b.pic_user_id = b.pic_user_id || req.user.id;
  await assertPic(req, b.pic_user_id, req.context.unit_id, projectId);
  // PIC akun tanpa label teks: isi penanggung_jawab dari nama akun supaya
  // warna kalender & daftar PJ tetap informatif.
  if (b.pic_user_id && !b.penanggung_jawab) {
    const { rows: picRows } = await query('SELECT nama FROM users WHERE id = $1', [b.pic_user_id]);
    if (!picRows[0]) throw err('PIC tidak ditemukan', 400);
    b.penanggung_jawab = picRows[0].nama;
  }
  const { rows } = await query(
    `INSERT INTO agendas
       (project_id, judul, tgl_rapat, jam_rapat, lokasi, link_video, peserta, topik, hasil,
        status_surat, nomor_surat, reminder_hari, status, penanggung_jawab, pic_user_id,
        status_padam, jenis_padam, penyebab_padam, padam_mulai, padam_selesai, instruksi_kerja, rencana_kerja, created_by, unit_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
     RETURNING id`,
    [projectId, b.judul.trim(), b.tgl_rapat, b.jam_rapat || null, b.lokasi || null, b.link_video || null,
      b.peserta || null, b.topik || null, b.hasil || null, b.status_surat || 'Belum Dibuat',
      b.nomor_surat || null, b.reminder_hari ?? 1, b.status || 'Terjadwal',
      b.penanggung_jawab || null, b.pic_user_id || null,
      b.status_padam || 'Bukan Padam', b.jenis_padam || null, b.penyebab_padam || null,
      b.padam_mulai || null, b.padam_selesai || null, b.instruksi_kerja || null, b.rencana_kerja || null,
      req.context.role, req.context.unit_id]
  );
  return { id: rows[0].id, project_id: projectId };
}

// List (cross-project) with filters + optional period grouping.
router.get('/agenda', requireAuth, requireCapabilityOrEmptyScope('agenda_read'), asyncHandler(async (req, res) => {
  const { project_id, status, periode, tgl } = req.query;
  const scope = agendaScope(req, 'a');
  const conditions = [scope.sql];
  const params = [...scope.params];
  let i = params.length + 1;
  if (project_id) { params.push(project_id); conditions.push(`a.project_id = $${i}`); i++; }
  if (status && status !== 'all') { params.push(status); conditions.push(`a.status = $${i}`); i++; }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const { rows } = await query(
    `SELECT a.*, p.kode AS project_kode, p.nama AS project_nama, p.organisasi AS project_organisasi, p.uip AS project_uip,
            u.nama AS pic_nama, pm.role AS pic_role
     FROM agendas a LEFT JOIN projects p ON p.id = a.project_id
     LEFT JOIN users u ON u.id = a.pic_user_id
     LEFT JOIN unit_memberships pm ON pm.user_id=a.pic_user_id AND pm.unit_id=a.unit_id ${where}
     ORDER BY a.tgl_rapat ASC, a.jam_rapat ASC NULLS LAST, a.id ASC`,
    params
  );

  const result = {
    data: rows,
    periods: null,
    statuses: AGENDA_STATUS,
    suratStatuses: AGENDA_SURAT_STATUS,
    padamStatuses: AGENDA_STATUS_PADAM,
    jenisPadam: AGENDA_JENIS_PADAM,
    umumLabel: AGENDA_UMUM_LABEL,
  };
  if (periode === 'minggu' || periode === 'bulan') {
    const anchor = tgl || new Date().toISOString().slice(0, 10);
    const groups = groupAgendasByPeriod(rows, periode, anchor);
    const ids = [...new Set(rows.map((r) => r.project_id))];
    const projekMap = await loadProjectsMap(ids, req);
    result.periods = groups;
    result.preview = buildAgendaRekapText(periode, anchor, groups, projekMap);
  }
  res.json(result);
}));

// List for one project (used inside ProjectShow tab).
router.get('/projects/:id/agendas', requireAuth, requireCapability('agenda_read'), asyncHandler(async (req, res) => {
  const proj = await assertProject(req, req.params.id, 'agenda_read');
  if (!proj) throw err('Project not found', 404);
  const { rows } = await query(
    'SELECT * FROM agendas WHERE project_id = $1 ORDER BY tgl_rapat DESC, id DESC',
    [req.params.id]
  );
  res.json({ data: rows });
}));

// Create (project-scoped).
router.post('/projects/:id/agendas', requireAuth, requireCapability('agenda_write'), asyncHandler(async (req, res) => {
  const proj = await assertProject(req, req.params.id, req.method === 'GET' ? 'read' : 'agenda_write');
  if (!proj) throw err('Project not found', 404);
  const created = await insertAgenda(sanitize(req.body), req.params.id, req);
  await broadcast(TOPIC.AGENDA, { project_id: Number(req.params.id), action: 'create', actor: req.context.role });
  res.status(201).json(created);
}));

// Create (global, tanpa kontrak/proyek → agenda umum lintas kontrak).
router.post('/agenda', requireAuth, requireCapability('agenda_write'), asyncHandler(async (req, res) => {
  const b = sanitize(req.body);
  if (b.project_id) await assertProject(req, b.project_id, 'agenda_write');
  const created = await insertAgenda(b, b.project_id || null, req);
  await broadcast(TOPIC.AGENDA, { project_id: b.project_id || null, unit_id: req.context.unit_id, action: 'create', actor: req.context.role });
  res.status(201).json(created);
}));

// Update a single agenda.
router.put('/agendas/:id', requireAuth, asyncHandler(async (req, res) => {
  const before = await assertAgenda(req, req.params.id, 'agenda_write');
  const b = sanitize(req.body);
  const targetProject = b.project_id === undefined ? before.project_id : b.project_id;
  if (targetProject) await assertProject(req, targetProject, 'agenda_write');
  await assertPic(req, b.pic_user_id === undefined ? before.pic_user_id : b.pic_user_id, before.unit_id, targetProject);
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
  const updated = await query(`UPDATE agendas SET ${sets.join(', ')} WHERE id = $${i} RETURNING project_id`, params);
  await broadcast(TOPIC.AGENDA, { project_id: updated.rows[0] ? updated.rows[0].project_id : null, unit_id: before.unit_id, action: 'update', actor: req.context.role });
  res.json({ ok: true });
}));

// Delete
router.delete('/agendas/:id', requireAuth, asyncHandler(async (req, res) => {
  const before = await assertAgenda(req, req.params.id, 'agenda_write');
  const deleted = await query('DELETE FROM agendas WHERE id = $1 RETURNING project_id', [req.params.id]);
  await broadcast(TOPIC.AGENDA, { project_id: before.project_id, unit_id: before.unit_id, action: 'delete', actor: req.context.role });
  res.json({ ok: true });
}));

// Daftar akun untuk pilihan PIC agenda (hanya pengelola agenda).
router.get('/agenda/pics', requireAuth, requireCapability('agenda_write'), asyncHandler(async (req, res) => {
  const projectId = req.query.project_id || null;
  if (projectId) await assertProject(req, projectId, 'agenda_write');
  const { rows } = await query(`SELECT u.id,u.nama,m.role FROM unit_memberships m JOIN users u ON u.id=m.user_id
    WHERE m.unit_id=$1 AND m.active=true AND u.active=true
    AND (m.role <> 'vendor' OR EXISTS (SELECT 1 FROM vendor_project_assignments v WHERE v.user_id=u.id AND v.unit_id=m.unit_id AND v.project_id=$2)) ORDER BY u.nama`, [req.context.unit_id, projectId]);
  res.json({ data: rows });
}));

// Rekap endpoint (groups + preview text + WA config presence).
router.get('/agenda/rekap', requireAuth, requireCapabilityOrEmptyScope('agenda_read'), asyncHandler(async (req, res) => {
  const { periode = 'minggu', tgl } = req.query;
  if (!['minggu', 'bulan'].includes(periode)) throw err('periode harus minggu atau bulan');
  const anchor = tgl || new Date().toISOString().slice(0, 10);
  const scope = agendaScope(req, 'a');
  const { rows } = await query(
    `SELECT a.*, p.kode AS project_kode, p.nama AS project_nama, p.organisasi AS project_organisasi
     FROM agendas a LEFT JOIN projects p ON p.id = a.project_id WHERE ${scope.sql} ORDER BY a.tgl_rapat ASC, a.jam_rapat ASC NULLS LAST`, scope.params
  );
  const groups = groupAgendasByPeriod(rows, periode, anchor);
  const ids = [...new Set(rows.map((r) => r.project_id))];
  const projekMap = await loadProjectsMap(ids, req);
  res.json({
    periode,
    tgl: anchor,
    groups,
    text: buildAgendaRekapText(periode, anchor, groups, projekMap),
    fonnteConfigured: Boolean(process.env.FONNTE_TOKEN && process.env.FONNTE_TARGET),
  });
}));

// Send rekap to a WhatsApp group via Fonnte.
router.post('/agenda/kirim-wa', requireAuth, requireCapability('agenda_write'), asyncHandler(async (req, res) => {
  const { periode = 'minggu', tgl } = req.body || {};
  if (!['minggu', 'bulan'].includes(periode)) throw err('periode harus minggu atau bulan');
  const token = process.env.FONNTE_TOKEN;
  const target = process.env.FONNTE_TARGET;
  if (!token || !target) {
    throw err('Integrasi WhatsApp belum dikonfigurasi (FONNTE_TOKEN / FONNTE_TARGET).', 400);
  }
  const anchor = tgl || new Date().toISOString().slice(0, 10);
  const scope = agendaScope(req, 'a');
  const { rows } = await query(
    `SELECT a.*, p.kode AS project_kode, p.nama AS project_nama, p.organisasi AS project_organisasi
     FROM agendas a LEFT JOIN projects p ON p.id = a.project_id WHERE ${scope.sql} ORDER BY a.tgl_rapat ASC, a.jam_rapat ASC NULLS LAST`, scope.params
  );
  const groups = groupAgendasByPeriod(rows, periode, anchor);
  const ids = [...new Set(rows.map((r) => r.project_id))];
  const projekMap = await loadProjectsMap(ids, req);
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
