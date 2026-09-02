import express from 'express';
import cors from 'cors';
import { query } from './_lib/db.js';
import {
  ALL_TIPE, ALL_UIP, KATEGORI_KENDALA, STATUS_BADGE,
  deriveStatus, deviasiOf, defaultMilestones, defaultSCurvePoints, defaultTermins, nextKendalaCode,
  formatNilaiKontrak, nilaiMilyar, fmtDate, isoDate, CSV_HEADERS,
} from './_lib/business.js';
import {
  ROLES, hashPassword, verifyPassword, signToken, verifyToken,
  requireAuth, requireRole, publicUser,
} from './_lib/auth.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

// ---------- helpers ----------
function pgNum(v) {
  return v === null || v === undefined ? null : Number(v);
}

async function getProject(id) {
  const { rows } = await query('SELECT * FROM projects WHERE id = $1', [id]);
  return rows[0] || null;
}

async function getProjectFull(id) {
  const proj = await getProject(id);
  if (!proj) return null;
  const [ms, sc, kn, dk, tb, bq] = await Promise.all([
    query('SELECT * FROM milestones WHERE project_id = $1 ORDER BY urutan, id', [id]),
    query('SELECT * FROM s_curves WHERE project_id = $1 ORDER BY urutan, id', [id]),
    query('SELECT * FROM kendalas WHERE project_id = $1 ORDER BY id DESC', [id]),
    query('SELECT * FROM dokumentasis WHERE project_id = $1 ORDER BY id DESC', [id]),
    query('SELECT * FROM termin_bayars WHERE project_id = $1 ORDER BY urutan, id', [id]),
    query('SELECT * FROM boqs WHERE project_id = $1 ORDER BY urutan, id', [id]),
  ]);
  return { ...proj, milestones: ms.rows, scurves: sc.rows, kendalas: kn.rows, dokumentasis: dk.rows, terminBayars: tb.rows, boqs: bq.rows };
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function err(msg, code = 400) {
  const e = new Error(msg);
  e.status = code;
  return e;
}

// ---------- Auth ----------
app.post('/api/auth/register', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const nama = String(b.nama || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const password = String(b.password || '');
  const role = ROLES.includes(b.role) ? b.role : 'vendor';
  if (!nama || !email || !password) throw err('Nama, email, dan password wajib diisi');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw err('Format email tidak valid');
  if (password.length < 6) throw err('Password minimal 6 karakter');
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length) throw err('Email sudah terdaftar', 409);
  const { rows } = await query(
    'INSERT INTO users (nama, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING *',
    [nama, email, hashPassword(password), role]
  );
  const user = publicUser(rows[0]);
  res.status(201).json({ token: signToken(user), user });
}));

app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const email = String(b.email || '').trim().toLowerCase();
  const password = String(b.password || '');
  if (!email || !password) throw err('Email dan password wajib diisi');
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  const row = rows[0];
  if (!row || !verifyPassword(password, row.password_hash)) throw err('Email atau password salah', 401);
  const user = publicUser(row);
  res.json({ token: signToken(user), user });
}));

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ---------- Dashboard ----------
app.get('/api/dashboard', asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM projects');
  const totalProjects = rows.length;
  const statusCounts = { 'In Progress': 0, Critical: 0, Testing: 0, 'COD / Energized': 0, Planning: 0 };
  for (const p of rows) statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;

  const avgRencana = rows.length ? rows.reduce((s, p) => s + pgNum(p.progres_rencana), 0) / rows.length : 0;
  const avgRealisasi = rows.length ? rows.reduce((s, p) => s + pgNum(p.progres_realisasi), 0) / rows.length : 0;
  const avgDeviasi = avgRealisasi - avgRencana;
  const totalNilaiKontrak = rows.reduce((s, p) => s + pgNum(p.nilai_kontrak), 0);
  const totalPenyerapanRp = rows.reduce((s, p) => s + pgNum(p.nilai_kontrak) * (pgNum(p.penyerapan_anggaran) || 0) / 100, 0);
  const avgPenyerapanPersen = totalNilaiKontrak ? Math.round((totalPenyerapanRp / totalNilaiKontrak) * 1000) / 10 : 0;

  const { rows: knRows } = await query(`SELECT * FROM kendalas WHERE status != 'Resolved'`);
  const openKendalas = knRows.length;

  const criticalProjects = rows.filter((p) => p.status === 'Critical' || pgNum(p.deviasi) < -5);
  const recentProjects = [...rows].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 5);

  const uipCounts = {};
  const tipeCounts = {};
  for (const p of rows) {
    uipCounts[p.uip] = (uipCounts[p.uip] || 0) + 1;
    tipeCounts[p.tipe] = (tipeCounts[p.tipe] || 0) + 1;
  }

  // Portfolio S-curve derived from the individual project S-curves (dummy/seed data),
  // aggregated per stage (`urutan`) so it stays consistent with the real dataset.
  const { rows: scRows } = await query(
    'SELECT project_id, minggu, rencana, realisasi, urutan FROM s_curves ORDER BY urutan, id'
  );
  const byUrutan = {};
  const urutanOrder = [];
  for (const s of scRows) {
    if (!byUrutan[s.urutan]) {
      byUrutan[s.urutan] = { rencana: [], realisasi: [], minggu: s.minggu };
      urutanOrder.push(s.urutan);
    }
    byUrutan[s.urutan].rencana.push(pgNum(s.rencana));
    if (pgNum(s.realisasi) !== null && s.realisasi !== null) {
      byUrutan[s.urutan].realisasi.push(pgNum(s.realisasi));
    }
  }
  urutanOrder.sort((a, b) => a - b);
  const safeNum = (arr) => {
    if (!arr.length) return null;
    const r = arr.reduce((s, v) => s + v, 0) / arr.length;
    return Math.round(r * 10) / 10;
  };
  const portfolioSCurve = {
    labels: urutanOrder.map((u) => byUrutan[u].minggu),
    rencana: urutanOrder.map((u) => safeNum(byUrutan[u].rencana)),
    realisasi: urutanOrder.map((u) => safeNum(byUrutan[u].realisasi)),
  };

  res.json({
    totalProjects,
    inProgressCount: statusCounts['In Progress'] || 0,
    statusCounts,
    avgRencana: Math.round(avgRencana * 10) / 10,
    avgRealisasi: Math.round(avgRealisasi * 10) / 10,
    avgDeviasi: Math.round(avgDeviasi * 10) / 10,
    totalNilaiKontrak,
    totalPenyerapanRp,
    avgPenyerapanPersen,
    openKendalas,
    criticalProjects,
    recentProjects,
    uipCounts,
    tipeCounts,
    portfolioSCurve,
  });
}));

// ---------- Projects list (with filters + pagination) ----------
app.get('/api/projects', asyncHandler(async (req, res) => {
  const { search, uip, tipe, status, page = 1, perPage = 10 } = req.query;
  const conditions = [];
  const params = [];
  let i = 1;
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(nama ILIKE $${i} OR kode ILIKE $${i} OR lokasi ILIKE $${i} OR kontraktor ILIKE $${i})`);
    i++;
  }
  if (uip && uip !== 'all') { params.push(uip); conditions.push(`uip = $${i}`); i++; }
  if (tipe && tipe !== 'all') { params.push(tipe); conditions.push(`tipe = $${i}`); i++; }
  if (status && status !== 'all') { params.push(status); conditions.push(`status = $${i}`); i++; }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const offset = (Number(page) - 1) * Number(perPage);

  const countRes = await query(`SELECT COUNT(*)::int AS total FROM projects ${where}`, params);
  const total = countRes.rows[0].total;
  const { rows } = await query(
    `SELECT * FROM projects ${where} ORDER BY status ASC, updated_at DESC LIMIT $${i} OFFSET $${i + 1}`,
    [...params, Number(perPage), offset]
  );
  const distinct = await query('SELECT DISTINCT uip FROM projects ORDER BY uip');
  const distinctUip = distinct.rows.map((r) => r.uip);

  res.json({
    data: rows,
    pagination: { total, page: Number(page), perPage: Number(perPage), lastPage: Math.max(1, Math.ceil(total / Number(perPage))) },
    allUip: ALL_UIP,
    distinctUip,
    allTipe: ALL_TIPE,
  });
}));

// ---------- Project show ----------
app.get('/api/projects/:id', asyncHandler(async (req, res) => {
  const proj = await getProjectFull(req.params.id);
  if (!proj) throw err('Project not found', 404);
  res.json(proj);
}));

// ---------- Options for project create/edit ----------
app.get('/api/meta/options', asyncHandler(async (req, res) => {
  res.json({ allTipe: ALL_TIPE, allUip: ALL_UIP, allStatus: Object.keys(STATUS_BADGE), kategoris: KATEGORI_KENDALA });
}));

// ---------- Project create ----------
app.post('/api/projects', requireAuth, asyncHandler(async (req, res) => {
  const b = req.body;
  if (!b.kode || !b.nama || !b.tipe || !b.uip || !b.lokasi || !b.kontraktor) {
    throw err('Field wajib belum lengkap (kode, nama, tipe, uip, lokasi, kontraktor)');
  }
  const rencana = pgNum(b.progres_rencana) || 0;
  const realisasi = pgNum(b.progres_realisasi) || 0;
  const deviasi = deviasiOf(rencana, realisasi);
  const status = deriveStatus(rencana, realisasi);

  const { rows } = await query(
    `INSERT INTO projects (kode, nama, tipe, tegangan, uip, upp, lokasi, latitude, longitude, kontraktor,
      nomor_kontrak, nilai_kontrak, tgl_mulai, target_cod, status, progres_rencana, progres_realisasi,
      deviasi, penyerapan_anggaran, deskripsi)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING id`,
    [b.kode, b.nama, b.tipe, b.tegangan || '150 kV', b.uip, b.upp || null, b.lokasi,
      b.latitude ?? null, b.longitude ?? null, b.kontraktor, b.nomor_kontrak || null,
      pgNum(b.nilai_kontrak) || 0, b.tgl_mulai || null, b.target_cod || null, status,
      rencana, realisasi, deviasi, pgNum(b.penyerapan_anggaran) || 0, b.deskripsi || null]
  );
  const projectId = rows[0].id;

  for (const m of defaultMilestones(realisasi)) {
    await query(
      'INSERT INTO milestones (project_id, nama, bobot, rencana, realisasi, status, urutan) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [projectId, m.nama, m.bobot, m.rencana, m.realisasi, m.status, m.urutan]
    );
  }
  for (const s of defaultSCurvePoints(rencana, realisasi)) {
    await query(
      'INSERT INTO s_curves (project_id, minggu, rencana, realisasi, urutan) VALUES ($1,$2,$3,$4,$5)',
      [projectId, s.minggu, s.rencana, s.realisasi, s.urutan]
    );
  }
  for (const t of defaultTermins(pgNum(b.nilai_kontrak))) {
    await query(
      'INSERT INTO termin_bayars (project_id, nama, nominal, bobot, status, tgl_bayar, urutan) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [projectId, t.nama, t.nominal, t.bobot, t.status, t.tgl_bayar, t.urutan]
    );
  }

  res.status(201).json(await getProjectFull(projectId));
}));

// ---------- Project update ----------
app.put('/api/projects/:id', requireAuth, asyncHandler(async (req, res) => {
  const proj = await getProject(req.params.id);
  if (!proj) throw err('Project not found', 404);
  const b = req.body;
  const rencana = pgNum(b.progres_rencana) ?? pgNum(proj.progres_rencana) ?? 0;
  const realisasi = pgNum(b.progres_realisasi) ?? pgNum(proj.progres_realisasi) ?? 0;
  const deviasi = deviasiOf(rencana, realisasi);
  const status = b.status || proj.status;

  await query(
    `UPDATE projects SET kode=$1, nama=$2, tipe=$3, tegangan=$4, uip=$5, upp=$6, lokasi=$7, latitude=$8,
      longitude=$9, kontraktor=$10, nomor_kontrak=$11, nilai_kontrak=$12, tgl_mulai=$13, target_cod=$14,
      status=$15, progres_rencana=$16, progres_realisasi=$17, deviasi=$18, penyerapan_anggaran=$19, deskripsi=$20, updated_at=now()
     WHERE id=$21`,
    [b.kode || proj.kode, b.nama || proj.nama, b.tipe || proj.tipe, b.tegangan || proj.tegangan,
      b.uip || proj.uip, b.upp ?? proj.upp, b.lokasi || proj.lokasi, b.latitude ?? proj.latitude,
      b.longitude ?? proj.longitude, b.kontraktor || proj.kontraktor, b.nomor_kontrak ?? proj.nomor_kontrak,
      pgNum(b.nilai_kontrak) ?? pgNum(proj.nilai_kontrak), b.tgl_mulai ?? proj.tgl_mulai, b.target_cod ?? proj.target_cod,
      status, rencana, realisasi, deviasi, pgNum(b.penyerapan_anggaran) ?? pgNum(proj.penyerapan_anggaran),
      b.deskripsi ?? proj.deskripsi, req.params.id]
  );
  res.json(await getProjectFull(req.params.id));
}));

// ---------- Project delete ----------
app.delete('/api/projects/:id', requireAuth, asyncHandler(async (req, res) => {
  const proj = await getProject(req.params.id);
  if (!proj) throw err('Project not found', 404);
  await query('DELETE FROM projects WHERE id = $1', [req.params.id]);
  res.json({ ok: true, message: `Proyek ${proj.nama} berhasil dihapus.` });
}));

// ---------- Progress store (weekly) ----------
app.post('/api/projects/:id/progress', requireAuth, asyncHandler(async (req, res) => {
  const proj = await getProject(req.params.id);
  if (!proj) throw err('Project not found', 404);
  const b = req.body;
  const rencana = pgNum(b.progres_rencana);
  const realisasi = pgNum(b.progres_realisasi);
  if (rencana === null || realisasi === null) throw err('progres_rencana dan progres_realisasi wajib');

  const deviasi = deviasiOf(rencana, realisasi);
  const newStatus = deriveStatus(rencana, realisasi, proj.status);

  await query(
    `UPDATE projects SET progres_rencana=$1, progres_realisasi=$2, deviasi=$3, status=$4,
      penyerapan_anggaran=$5, updated_at=now() WHERE id=$6`,
    [rencana, realisasi, deviasi, newStatus,
      b.penyerapan_anggaran !== undefined && b.penyerapan_anggaran !== '' ? pgNum(b.penyerapan_anggaran) : proj.penyerapan_anggaran,
      req.params.id]
  );

  // S-curve upsert keyed on (project_id, minggu).
  if (b.minggu_label) {
    const exist = await query('SELECT id FROM s_curves WHERE project_id=$1 AND minggu=$2', [req.params.id, b.minggu_label]);
    if (exist.rows.length) {
      await query('UPDATE s_curves SET rencana=$1, realisasi=$2, catatan=$3, updated_at=now() WHERE id=$4',
        [rencana, realisasi, b.catatan || null, exist.rows[0].id]);
    } else {
      const maxRes = await query('SELECT COALESCE(MAX(urutan),0) AS m FROM s_curves WHERE project_id=$1', [req.params.id]);
      await query('INSERT INTO s_curves (project_id, minggu, rencana, realisasi, catatan, urutan) VALUES ($1,$2,$3,$4,$5,$6)',
        [req.params.id, b.minggu_label, rencana, realisasi, b.catatan || null, maxRes.rows[0].m + 1]);
    }
  }

  // Milestone updates.
  if (Array.isArray(b.milestones)) {
    for (const item of b.milestones) {
      if (!item.id) continue;
      const mReal = pgNum(item.realisasi);
      const mStatus = item.status;
      if (mReal !== null && mStatus) {
        await query('UPDATE milestones SET realisasi=$1, status=$2, updated_at=now() WHERE id=$3 AND project_id=$4',
          [mReal, mStatus, item.id, req.params.id]);
      }
    }
  }

  res.json(await getProjectFull(req.params.id));
}));

// ---------- Kendala list ----------
app.get('/api/kendala', asyncHandler(async (req, res) => {
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

// ---------- Kendala store ----------
app.post('/api/projects/:id/kendala', requireAuth, asyncHandler(async (req, res) => {
  const proj = await getProject(req.params.id);
  if (!proj) throw err('Project not found', 404);
  const b = req.body;
  if (!b.kategori || !b.deskripsi || !b.status) throw err('kategori, deskripsi, status wajib');

  const cnt = await query('SELECT COUNT(*)::int AS c FROM kendalas WHERE project_id=$1', [req.params.id]);
  const kode_kendala = nextKendalaCode(cnt.rows[0].c);
  const tgl_lapor = b.tgl_lapor ? isoDate(b.tgl_lapor) : new Date().toISOString().slice(0, 10);

  const { rows } = await query(
    `INSERT INTO kendalas (project_id, kode_kendala, kategori, deskripsi, dampak, tindakan_mitigasi, status, tgl_lapor)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [req.params.id, kode_kendala, b.kategori, b.deskripsi, b.dampak || null, b.tindakan_mitigasi || null, b.status, tgl_lapor]
  );

  // Business side-effect: opening kendala on deviating In-Progress project -> Critical.
  if (b.status === 'Open' && proj.status === 'In Progress' && pgNum(proj.deviasi) < 0) {
    await query("UPDATE projects SET status='Critical', updated_at=now() WHERE id=$1", [req.params.id]);
  }
  res.status(201).json({ id: rows[0].id, kode_kendala });
}));

// ---------- Kendala update status ----------
app.patch('/api/kendala/:id/status', requireAuth, asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['Open', 'In Review', 'Resolved'].includes(status)) throw err('Status tidak valid');
  const tgl_selesai = status === 'Resolved' ? new Date().toISOString().slice(0, 10) : null;
  await query('UPDATE kendalas SET status=$1, tgl_selesai=$2, updated_at=now() WHERE id=$3', [status, tgl_selesai, req.params.id]);
  res.json({ ok: true });
}));

// ---------- BOQ Kontrak (replace all) ----------
app.put('/api/projects/:id/boq', requireAuth, asyncHandler(async (req, res) => {
  const proj = await getProject(req.params.id);
  if (!proj) throw err('Project not found', 404);
  const b = req.body || {};
  const items = Array.isArray(b.items) ? b.items : [];
  const { role } = req.user;
  // Preserve photos the caller is not allowed to touch (vendor -> dalkon's, dalkon -> vendor's).
  const existing = await query('SELECT * FROM boqs WHERE project_id = $1', [req.params.id]);
  const existingByUrutan = new Map(existing.rows.map((r) => [r.urutan, r]));
  await query('DELETE FROM boqs WHERE project_id = $1', [req.params.id]);
  for (const [i, it] of items.entries()) {
    const urutan = it.urutan ?? (i + 1);
    const prev = existingByUrutan.get(urutan) || existingByUrutan.get(i + 1) || {};
    let fotoVendor = it.foto_vendor || null;
    let fotoDalkon = it.foto_dalkon || null;
    if (role === 'vendor') fotoDalkon = prev.foto_dalkon || null;
    if (role === 'dalkon') fotoVendor = prev.foto_vendor || null;
    const vol = it.volume === '' || it.volume === null || it.volume === undefined ? null : Number(it.volume);
    const price = it.harga_satuan === '' || it.harga_satuan === null || it.harga_satuan === undefined ? null : Number(it.harga_satuan);
    const total = vol != null && price != null
      ? Math.round(vol * price * 100) / 100
      : (price != null ? price : null);
    await query(
      'INSERT INTO boqs (project_id, uraian, satuan, volume, harga_satuan, total, foto_vendor, foto_dalkon, urutan) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [req.params.id, it.uraian || '-', it.satuan || null, vol, price, total, fotoVendor, fotoDalkon, urutan]
    );
  }
  if (b.image_url) {
    await query('UPDATE projects SET boq_image = $1, updated_at = now() WHERE id = $2', [b.image_url, req.params.id]);
  }
  res.json(await getProjectFull(req.params.id));
}));

// ---------- Dokumentasi store ----------
app.post('/api/projects/:id/dokumentasi', requireAuth, asyncHandler(async (req, res) => {
  const proj = await getProject(req.params.id);
  if (!proj) throw err('Project not found', 404);
  const b = req.body;
  if (!b.judul || !b.tahap) throw err('judul dan tahap wajib');
  // We accept a URL; file uploads are out of scope for the free serverless variant.
  const foto = b.foto_url || b.foto || '';
  const tgl = b.tgl ? isoDate(b.tgl) : new Date().toISOString().slice(0, 10);
  const { rows } = await query(
    'INSERT INTO dokumentasis (project_id, judul, tahap, foto, tgl, keterangan) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
    [req.params.id, b.judul, b.tahap, foto, tgl, b.keterangan || null]
  );
  res.status(201).json({ id: rows[0].id });
}));

// ---------- GIS data ----------
app.get('/api/gis/projects', asyncHandler(async (req, res) => {
  const { uip, tipe, status } = req.query;
  const conditions = ['latitude IS NOT NULL', 'longitude IS NOT NULL'];
  const params = [];
  let i = 1;
  if (uip && uip !== 'all') { params.push(uip); conditions.push(`uip = $${i}`); i++; }
  if (tipe && tipe !== 'all') { params.push(tipe); conditions.push(`tipe = $${i}`); i++; }
  if (status && status !== 'all') { params.push(status); conditions.push(`status = $${i}`); i++; }
  const where = 'WHERE ' + conditions.join(' AND ');
  const { rows } = await query(`SELECT * FROM projects ${where} ORDER BY kode`, params);
  const data = rows.map((p) => ({
    id: p.id, kode: p.kode, nama: p.nama, tipe: p.tipe, tegangan: p.tegangan,
    uip: p.uip, upp: p.upp, lokasi: p.lokasi, lat: pgNum(p.latitude), lng: pgNum(p.longitude),
    status: p.status, progres_rencana: pgNum(p.progres_rencana), progres_realisasi: pgNum(p.progres_realisasi),
    deviasi: pgNum(p.deviasi), target_cod: fmtDate(p.target_cod), url: `/projects/${p.id}`,
  }));
  res.json(data);
}));

// ---------- Reports ----------
app.get('/api/reports', asyncHandler(async (req, res) => {
  const { uip, tipe, status } = req.query;
  const conditions = [];
  const params = [];
  let i = 1;
  if (uip && uip !== 'all') { params.push(uip); conditions.push(`uip = $${i}`); i++; }
  if (tipe && tipe !== 'all') { params.push(tipe); conditions.push(`tipe = $${i}`); i++; }
  if (status && status !== 'all') { params.push(status); conditions.push(`status = $${i}`); i++; }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const { rows } = await query(`SELECT * FROM projects ${where} ORDER BY status ASC`, params);
  res.json({ data: rows, allUip: ALL_UIP, allTipe: ALL_TIPE, allStatus: Object.keys(STATUS_BADGE) });
}));

// ---------- Export CSV ----------
app.get('/api/reports/export-csv', asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM projects ORDER BY kode');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  const date = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Disposition', `attachment; filename="PLN_ProTrack_Laporan_Konstruksi_${date}.csv"`);
  // UTF-8 BOM
  let csv = '\uFEFF' + CSV_HEADERS.join(',') + '\n';
  for (const r of rows) {
    const row = [
      r.id, r.kode, r.nama, r.tipe, r.tegangan, r.uip, r.upp || '', r.lokasi,
      r.kontraktor, r.nomor_kontrak || '', Number(r.nilai_kontrak).toLocaleString('id-ID'),
      isoDate(r.tgl_mulai) || '', isoDate(r.target_cod) || '', r.status,
      pgNum(r.progres_rencana), pgNum(r.progres_realisasi), pgNum(r.deviasi), pgNum(r.penyerapan_anggaran),
    ];
    csv += row.map(csvEscape).join(',') + '\n';
  }
  res.send(csv);
}));

function csvEscape(v) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

// ---------- error handler ----------
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

export default app;