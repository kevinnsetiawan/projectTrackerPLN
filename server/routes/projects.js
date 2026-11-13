import { projectScope, assertProject, assertChild, requireCapability, assignVendorToProject, assertGarduInduk, refreshIdentity, canInUnit, getCapabilities } from '../_lib/scope.js';
import { Router } from 'express';
import { query, withTransaction } from '../_lib/db.js';
import { ALL_TIPE, ALL_UIP, KATEGORI_KENDALA, STATUS_BADGE,
  deriveStatus, deviasiOf, normalizeLokasis, defaultMilestones, defaultSCurvePoints, scurvesFromBaseline, defaultTermins, normalizeTermins, validateTerminPayments, shiftIsoDate, isoDate,
} from '../_lib/business.js';
import { requireAuth } from '../_lib/auth.js';
import { broadcast, TOPIC } from '../_lib/events.js';
import { asyncHandler, err, pgNum, PROJECT_COLS, getProjectFull, recalcMilestonesFromBoq, recalcBoqBobot, boqWeightedRealisasi, extendSCurveToCod, dokumentasiCols, boqCols, kurvaDocCols, amandemenCols, sendStoredFile, requireCapabilityOrEmptyScope } from '../_lib/http.js';
import { validateStoredFile } from '../_lib/files.js';

const router = Router();

function projectLokasis(raw) {
  if (!Array.isArray(raw)) return null;
  return normalizeLokasis(raw.map((item) => {
    const value = item?.gardu_induk_id;
    const empty = value === undefined || value === null || value === '';
    if (!empty && !((typeof value === 'number' || typeof value === 'string') && /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value)))) {
      throw err('Referensi Gardu Induk tidak valid');
    }
    return { ...item, gardu_induk_id: empty ? null : Number(value) };
  }));
}

async function validateLocationGis(req, lokasis, unitId, q, existing = new Set()) {
  for (const site of lokasis || []) {
    if (site.gardu_induk_id !== null) {
      await assertGarduInduk(req, site.gardu_induk_id, { projectUnitId: unitId, allowInactiveId: existing }, q);
    }
  }
}

// List with filters + pagination
router.get('/projects', requireAuth, requireCapabilityOrEmptyScope('projects_read'), asyncHandler(async (req, res) => {
  const { search, uip, tipe, status, page = 1, perPage = 10 } = req.query;
  const scope = projectScope(req, 'projects', 1, 'projects_read');
  const conditions = [scope.sql];
  const params = [...scope.params];
  let i = params.length + 1;
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(nama ILIKE $${i} OR kode ILIKE $${i} OR lokasi ILIKE $${i} OR kontraktor ILIKE $${i}
      OR EXISTS (SELECT 1 FROM lokasis ls WHERE ls.project_id = projects.id AND ls.nama ILIKE $${i}))`);
    i++;
  }
  if (uip && uip !== 'all') { params.push(uip); conditions.push(`uip = $${i}`); i++; }
  if (tipe && tipe !== 'all') { params.push(tipe); conditions.push(`tipe = $${i}`); i++; }
  if (status && status !== 'all') { params.push(status); conditions.push(`status = $${i}`); i++; }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const offset = (Number(page) - 1) * Number(perPage);

  // Hitung total, ambil baris, dan daftar UIP sekaligus (satu gelombang paralel)
  // supaya halaman daftar proyek tidak menunggu 3 round-trip DB berurutan.
  const [countRes, listRes, distinct] = await Promise.all([
    query(`SELECT COUNT(*)::int AS total FROM projects ${where}`, params),
    query(
      `SELECT ${PROJECT_COLS} FROM projects ${where} ORDER BY status ASC, updated_at DESC LIMIT $${i} OFFSET $${i + 1}`,
      [...params, Number(perPage), offset]
    ),
    query(`SELECT DISTINCT uip FROM projects WHERE ${scope.sql} ORDER BY uip`, scope.params),
  ]);
  const total = countRes.rows[0].total;
  const { rows } = listRes;
  const distinctUip = distinct.rows.map((r) => r.uip);

  res.json({
    data: rows,
    pagination: { total, page: Number(page), perPage: Number(perPage), lastPage: Math.max(1, Math.ceil(total / Number(perPage))) },
    allUip: ALL_UIP,
    distinctUip,
    allTipe: ALL_TIPE,
    allStatus: Object.keys(STATUS_BADGE),
  });
}));

// Options for project create/edit
router.get('/meta/options', requireAuth, requireCapability('projects_read'), asyncHandler(async (req, res) => {
  res.json({ allTipe: ALL_TIPE, allUip: ALL_UIP, allStatus: Object.keys(STATUS_BADGE), kategoris: KATEGORI_KENDALA });
}));

// Minimal project lookup for scoped child forms. It never returns full project
// details or child collections and still uses the requested module scope.
router.get('/projects/options', requireAuth, asyncHandler(async (req, res) => {
  const module = String(req.query.module || 'projects').trim();
  const allowed = new Set(['projects', 'agenda', 'drawings', 'instruksi', 'kendala', 'gis', 'reports']);
  if (!allowed.has(module)) throw err('Modul proyek tidak valid');
  const action = module === 'projects' ? 'projects_read' : `${module}_read`;
  const caps = getCapabilities(req);
  if (caps[action] !== true) throw err('Akses baca modul tidak tersedia', 403);
  const scope = projectScope(req, 'p', 1, action);
  const { rows } = await query(`SELECT p.id,p.kode,p.nama FROM projects p WHERE ${scope.sql} ORDER BY p.kode,p.id`, scope.params);
  res.json({ data: rows });
}));

// Show one project (full detail)
router.get('/projects/:id', requireAuth, requireCapability('projects_read'), asyncHandler(async (req, res) => {
  await assertProject(req, req.params.id, 'projects_read');
  const proj = await getProjectFull(req.params.id, req);
  if (!proj) throw err('Project not found', 404);
  res.json(proj);
}));

// Create
router.post('/projects', requireAuth, requireCapability('project_write'), asyncHandler(async (req, res) => {
  const b = req.body;
  if (b.unit_id !== undefined && Number(b.unit_id) !== Number(req.context.unit_id)) throw err('Unit proyek tidak dapat dipindahkan', 403);
  const lokasis = projectLokasis(b.lokasis);
  const lokasiLabel = lokasis && lokasis.length
    ? lokasis[0].nama
    : String(b.lokasi || '').trim();
  if (!b.kode || !b.nama || !b.tipe || !b.uip || !lokasiLabel || !b.kontraktor) {
    throw err('Field wajib belum lengkap (kode, nama, tipe, uip, lokasi, kontraktor)');
  }
  const latitude = lokasis && lokasis.length ? lokasis[0].latitude : (b.latitude ?? null);
  const longitude = lokasis && lokasis.length ? lokasis[0].longitude : (b.longitude ?? null);
  const rencana = pgNum(b.progres_rencana) || 0;
  const realisasi = pgNum(b.progres_realisasi) || 0;
  const deviasi = deviasiOf(rencana, realisasi);
  const status = deriveStatus(realisasi, {
    tgl_selesai_garansi: b.tgl_selesai_garansi,
    barang_dicek: b.barang_dicek,
  });

  const projectId = await withTransaction(async (q) => {
    await refreshIdentity(req, q);
    if (!canInUnit(req, req.context.unit, 'project_write')) throw err('Akses ditolak', 403);
    await validateLocationGis(req, lokasis, req.context.unit_id, q);
    const { rows } = await q(
      `INSERT INTO projects (kode, nama, tipe, tegangan, uip, upp, lokasi, latitude, longitude, kontraktor,
        nomor_kontrak, tgl_kontrak, nomor_spmk, nilai_kontrak, tgl_mulai, target_cod, status, tgl_selesai_garansi, barang_dicek,
        progres_rencana, progres_realisasi, deviasi, penyerapan_anggaran, deskripsi, organisasi, unit_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26) RETURNING id`,
      [b.kode, b.nama, b.tipe, b.tegangan || '150 kV', b.uip, b.upp || null, lokasiLabel,
        latitude, longitude, b.kontraktor, b.nomor_kontrak || null,
        b.tgl_kontrak || null, b.nomor_spmk || null,
        pgNum(b.nilai_kontrak) || 0, b.tgl_mulai || null, b.target_cod || null, status,
        b.tgl_selesai_garansi || null, b.barang_dicek ? true : false,
        rencana, realisasi, deviasi, pgNum(b.penyerapan_anggaran) || 0, b.deskripsi || null,
        b.organisasi || null, req.context.unit_id]
    );
    const projectId = rows[0].id;
    await assignVendorToProject(req, projectId, q);

    for (const s of lokasis || []) {
      await q(
        'INSERT INTO lokasis (project_id, unit_id, nama, latitude, longitude, urutan, gardu_induk_id) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [projectId, req.context.unit_id, s.nama, s.latitude, s.longitude, s.urutan, s.gardu_induk_id]
      );
    }

    for (const m of defaultMilestones(realisasi, { tgl_mulai: b.tgl_mulai, target_cod: b.target_cod })) {
      await q(
        'INSERT INTO milestones (project_id, nama, bobot, rencana, realisasi, status, urutan, tgl_mulai, tgl_selesai) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [projectId, m.nama, m.bobot, m.rencana, m.realisasi, m.status, m.urutan, m.tgl_mulai || null, m.tgl_selesai || null]
      );
    }
    const nilaiKontrak = pgNum(b.nilai_kontrak) || 0;
    let sRows = (Array.isArray(b.baseline_per_bulan) && b.baseline_per_bulan.length)
      ? scurvesFromBaseline(b.baseline_per_bulan)
      : [];
    if (!sRows.length) {
      sRows = defaultSCurvePoints(rencana, realisasi, { tgl_mulai: b.tgl_mulai, target_cod: b.target_cod });
    }
    for (const s of sRows) {
      await q(
        'INSERT INTO s_curves (project_id, minggu, bulan, rencana, realisasi, pembuat, urutan) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [projectId, s.minggu, s.bulan || null, s.rencana, s.realisasi, s.pembuat || null, s.urutan]
      );
    }
    const termins = (Array.isArray(b.termins) && b.termins.length)
      ? normalizeTermins(b.termins, nilaiKontrak)
      : defaultTermins(nilaiKontrak);
    for (const t of termins) {
      await q(
        'INSERT INTO termin_bayars (project_id, nama, nominal, bobot, progres_fisik, status, tgl_bayar, urutan) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [projectId, t.nama, t.nominal, t.bobot, t.progres_fisik ?? 0, t.status, t.tgl_bayar, t.urutan]
      );
    }

    return projectId;
  });

  await broadcast(TOPIC.PROJECTS, { project_id: projectId, action: 'create', actor: req.context.role });
  res.status(201).json(await getProjectFull(projectId, req));
}));

// Update
router.put('/projects/:id', requireAuth, asyncHandler(async (req, res) => {
  const proj = await assertProject(req, req.params.id, 'project_write');
  if (!proj) throw err('Project not found', 404);
  const b = req.body;
  if (b.unit_id !== undefined && Number(b.unit_id) !== Number(req.context.unit_id)) throw err('Unit proyek tidak dapat dipindahkan', 403);
  const lokasis = projectLokasis(b.lokasis);
  const lokasiLabel = lokasis && lokasis.length ? lokasis[0].nama : (b.lokasi || proj.lokasi);
  const latitude = lokasis && lokasis.length ? lokasis[0].latitude : (b.latitude ?? proj.latitude);
  const longitude = lokasis && lokasis.length ? lokasis[0].longitude : (b.longitude ?? proj.longitude);
  const rencana = pgNum(b.progres_rencana) ?? pgNum(proj.progres_rencana) ?? 0;
  const realisasi = pgNum(b.progres_realisasi) ?? pgNum(proj.progres_realisasi) ?? 0;
  const deviasi = deviasiOf(rencana, realisasi);
  const status = deriveStatus(realisasi, {
    tgl_selesai_garansi: b.tgl_selesai_garansi ?? proj.tgl_selesai_garansi,
    barang_dicek: b.barang_dicek ?? proj.barang_dicek,
  });

  await withTransaction(async (q) => {
    await refreshIdentity(req, q);
    const current = await assertProject(req, req.params.id, 'project_write', q);
    if (lokasis) {
      const existing = await q('SELECT gardu_induk_id FROM lokasis WHERE project_id=$1 FOR UPDATE', [current.id]);
      await validateLocationGis(req, lokasis, current.unit_id, q, new Set(existing.rows.map(r => r.gardu_induk_id)));
    }
    await q(
      `UPDATE projects SET kode=$1, nama=$2, tipe=$3, tegangan=$4, uip=$5, upp=$6, lokasi=$7, latitude=$8,
        longitude=$9, kontraktor=$10, nomor_kontrak=$11, tgl_kontrak=$12, nomor_spmk=$13, nilai_kontrak=$14,
        tgl_mulai=$15, target_cod=$16, status=$17, tgl_selesai_garansi=$18, barang_dicek=$19,
        progres_rencana=$20, progres_realisasi=$21, deviasi=$22, penyerapan_anggaran=$23, deskripsi=$24, organisasi=$25, updated_at=now()
       WHERE id=$26`,
      [b.kode || proj.kode, b.nama || proj.nama, b.tipe || proj.tipe, b.tegangan || proj.tegangan,
        b.uip || proj.uip, b.upp ?? proj.upp, lokasiLabel, latitude, longitude,
        b.kontraktor || proj.kontraktor, b.nomor_kontrak ?? proj.nomor_kontrak,
        b.tgl_kontrak ?? proj.tgl_kontrak, b.nomor_spmk ?? proj.nomor_spmk,
        pgNum(b.nilai_kontrak) ?? pgNum(proj.nilai_kontrak), b.tgl_mulai ?? proj.tgl_mulai, b.target_cod ?? proj.target_cod,
        status, b.tgl_selesai_garansi ?? proj.tgl_selesai_garansi, b.barang_dicek ?? proj.barang_dicek,
        rencana, realisasi, deviasi, pgNum(b.penyerapan_anggaran) ?? pgNum(proj.penyerapan_anggaran),
        b.deskripsi ?? proj.deskripsi, b.organisasi ?? proj.organisasi, req.params.id]
    );

    if (lokasis) {
      await q('DELETE FROM lokasis WHERE project_id = $1', [req.params.id]);
      for (const s of lokasis) {
        await q(
          'INSERT INTO lokasis (project_id, unit_id, nama, latitude, longitude, urutan, gardu_induk_id) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [req.params.id, current.unit_id, s.nama, s.latitude, s.longitude, s.urutan, s.gardu_induk_id]
        );
      }
    }

    if (Array.isArray(b.termins)) {
      const nilaiNow = pgNum(b.nilai_kontrak) ?? pgNum(proj.nilai_kontrak) ?? 0;
      const termins = normalizeTermins(b.termins, nilaiNow, { preserve: true });
      const payMsg = validateTerminPayments(termins, realisasi, nilaiNow);
      if (payMsg) throw err(payMsg);
      await q('DELETE FROM termin_bayars WHERE project_id = $1', [req.params.id]);
      for (const t of termins) {
        await q(
          'INSERT INTO termin_bayars (project_id, nama, nominal, bobot, progres_fisik, status, tgl_bayar, urutan) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
          [req.params.id, t.nama, t.nominal, t.bobot, t.progres_fisik ?? 0, t.status, t.tgl_bayar, t.urutan]
        );
      }
    }

    if (Array.isArray(b.baseline_per_bulan) && b.baseline_per_bulan.length) {
      const base = scurvesFromBaseline(b.baseline_per_bulan);
      const exist = await q('SELECT id, urutan FROM s_curves WHERE project_id=$1 ORDER BY urutan, id', [req.params.id]);
      for (let k = 0; k < base.length; k++) {
        const row = base[k];
        if (exist.rows[k]) {
          await q('UPDATE s_curves SET minggu=$1, bulan=$2, rencana=$3, pembuat=$4, updated_at=now() WHERE id=$5',
            [row.minggu, row.bulan, row.rencana, 'dalkon', exist.rows[k].id]);
        } else {
          const last = await q('SELECT COALESCE(MAX(urutan),0)::int AS m FROM s_curves WHERE project_id=$1', [req.params.id]);
          await q('INSERT INTO s_curves (project_id, minggu, bulan, rencana, realisasi, pembuat, urutan) VALUES ($1,$2,$3,$4,NULL,$5,$6)',
            [req.params.id, row.minggu, row.bulan, row.rencana, 'dalkon', last.rows[0].m + 1]);
        }
      }
    }

  });

  await broadcast(TOPIC.PROJECTS, { project_id: Number(req.params.id), action: 'update', actor: req.context.role });
  res.json(await getProjectFull(req.params.id, req));
}));

// Delete
router.delete('/projects/:id', requireAuth, asyncHandler(async (req, res) => {
  const proj = await assertProject(req, req.params.id, 'project_delete');
  if (!proj) throw err('Project not found', 404);
  const audience = await query('SELECT user_id FROM vendor_project_assignments WHERE project_id=$1 AND unit_id=$2', [proj.id, proj.unit_id]);
  await query('DELETE FROM projects WHERE id = $1', [req.params.id]);
  await broadcast(TOPIC.PROJECTS, { project_id: Number(req.params.id), unit_id: proj.unit_id, audience_vendor_ids: audience.rows.map(r => r.user_id), action: 'delete', actor: req.context.role });
  res.json({ ok: true, message: `Proyek ${proj.nama} berhasil dihapus.` });
}));

// Progress store (weekly/monthly). Vendor mengisi progres per item BOQ;
// progres_realisasi proyek dihitung dari bobot tertimbang BOQ bila tersedia.
router.post('/projects/:id/progress', requireAuth, asyncHandler(async (req, res) => {
  const proj = await assertProject(req, req.params.id, 'progress');
  if (!proj) throw err('Project not found', 404);
  const b = req.body;
  if (b.unit_id !== undefined && Number(b.unit_id) !== Number(req.context.unit_id)) throw err('Unit proyek tidak dapat dipindahkan', 403);
  const rencana = pgNum(b.progres_rencana);
  let realisasi = pgNum(b.progres_realisasi);
  if (rencana === null) throw err('progres_rencana wajib');
  if (realisasi === null) throw err('progres_realisasi wajib');

  for (const [table, items] of [['boqs', b.boq_items], ['milestones', b.milestones]]) {
    for (const item of (Array.isArray(items) ? items : [])) {
      if (!item?.id) continue;
      const child = await assertChild(req, table, item.id, 'progress');
      if (Number(child.project_id) !== Number(req.params.id)) throw err('Data tidak ditemukan', 404);
    }
  }
  if (Array.isArray(b.boq_items) && b.boq_items.length) {
    for (const it of b.boq_items) {
      if (!it || !it.id) continue;
      const pg = Math.min(100, Math.max(0, pgNum(it.progres) ?? 0));
      await query(
        'UPDATE boqs SET progres = $1, updated_at = now() WHERE id = $2 AND project_id = $3',
        [pg, it.id, req.params.id]
      );
    }
    await recalcMilestonesFromBoq(req.params.id);
  }

  // Realisasi fisik = Σ(bobot x progres) / Σ(bobot) dari seluruh item BOQ.
  const realisasiBoq = await boqWeightedRealisasi(req.params.id);
  if (realisasiBoq !== null) realisasi = realisasiBoq;

  const deviasi = deviasiOf(rencana, realisasi);
  const newStatus = deriveStatus(realisasi, {
    tgl_selesai_garansi: proj.tgl_selesai_garansi,
    barang_dicek: proj.barang_dicek,
  });

  await query(
    `UPDATE projects SET progres_rencana=$1, progres_realisasi=$2, deviasi=$3, status=$4,
      penyerapan_anggaran=$5, updated_at=now() WHERE id=$6`,
    [rencana, realisasi, deviasi, newStatus,
      b.penyerapan_anggaran !== undefined && b.penyerapan_anggaran !== '' ? pgNum(b.penyerapan_anggaran) : proj.penyerapan_anggaran,
      req.params.id]
  );

  if (b.minggu_label) {
    const exist = await query('SELECT id, urutan FROM s_curves WHERE project_id=$1 AND minggu=$2', [req.params.id, b.minggu_label]);
    if (exist.rows.length) {
      // Rencana tidak boleh turun drastis dari bulan sebelumnya (agar kurva tetap naik monoton).
      const prev = await query(
        'SELECT COALESCE(MAX(rencana),0)::numeric AS r FROM s_curves WHERE project_id=$1 AND urutan < $2',
        [req.params.id, exist.rows[0].urutan]
      );
      const rencanaPlan = Math.min(100, Math.max(rencana, Number(prev.rows[0].r) || 0));
      await query('UPDATE s_curves SET rencana=$1, realisasi=$2, catatan=$3, pembuat=$4, updated_at=now() WHERE id=$5',
        [rencanaPlan, realisasi, b.catatan || null, req.context.role, exist.rows[0].id]);
    } else {
      const maxRes = await query(
        'SELECT COALESCE(MAX(urutan),0)::int AS m, COALESCE(MAX(rencana),0)::numeric AS r FROM s_curves WHERE project_id=$1',
        [req.params.id]
      );
      const rencanaPlan = Math.min(100, Math.max(rencana, Number(maxRes.rows[0].r) || 0));
      await query('INSERT INTO s_curves (project_id, minggu, rencana, realisasi, catatan, pembuat, urutan) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [req.params.id, b.minggu_label, rencanaPlan, realisasi, b.catatan || null, req.context.role, maxRes.rows[0].m + 1]);
    }
  }

  if (Array.isArray(b.milestones)) {
    for (const item of b.milestones) {
      if (!item.id) continue;
      const mReal = pgNum(item.realisasi);
      const mStatus = item.status;
      if (mReal !== null && mStatus) {
        await query('UPDATE milestones SET realisasi=$1, status=$2, updated_at=now() WHERE id=$3 AND project_id=$4 AND NOT EXISTS (SELECT 1 FROM boqs b WHERE b.milestone_id = milestones.id)',
          [mReal, mStatus, item.id, req.params.id]);
      }
    }
  }

  await broadcast(TOPIC.PROGRESS, { project_id: Number(req.params.id), action: 'progress', actor: req.context.role });
  await broadcast(TOPIC.PROJECTS, { project_id: Number(req.params.id), action: 'progress', actor: req.context.role });
  res.json(await getProjectFull(req.params.id, req));
}));

// Update jadwal & rincian pekerjaan tahapan/milestones (Gantt + detail rincian).
// Khusus Vendor yang berhak menyusun jadwal kerja & rincian tahap.
// Dua mode:
//   - Tanpa `replace`: update sebagian (misal rincian satu tahap), kirim array
//     milestone: [{ id, tgl_mulai, tgl_selesai, rincian?: { desc, items }[] }].
//   - `replace: true`: kelola lengkap daftar tahapan (ubah nama/bobot/tanggal,
//     tambah, hapus, urutkan ulang). Kirim SELURUH tahapan yang ingin dipertahankan.
router.put('/projects/:id/milestones', requireAuth, asyncHandler(async (req, res) => {
  const proj = await assertProject(req, req.params.id, 'project_write');
  if (!proj) throw err('Project not found', 404);
  const items = Array.isArray(req.body?.milestones) ? req.body.milestones : [];
  const replace = Boolean(req.body?.replace);
  for (const item of items) {
    if (!item?.id) continue;
    const child = await assertChild(req, 'milestones', item.id, 'project_write');
    if (Number(child.project_id) !== Number(req.params.id)) throw err('Tahapan tidak ditemukan', 404);
  }

  const validateDates = (item) => {
    const fromIso = item.tgl_mulai ? isoDate(item.tgl_mulai) : null;
    const toIso = item.tgl_selesai ? isoDate(item.tgl_selesai) : null;
    if (fromIso && toIso && new Date(toIso) < new Date(fromIso)) {
      throw err('Tanggal selesai lebih awal dari tanggal mulai pada salah satu tahapan');
    }
    return [fromIso, toIso];
  };
  const buildRincian = (item) => {
    if (!item.rincian) return null;
    const { desc, items: ri } = item.rincian;
    return JSON.stringify({ desc: String(desc || '').trim(), items: Array.isArray(ri) ? ri.map((x) => String(x).trim()).filter(Boolean) : [] });
  };

  if (!replace) {
    if (!items.length) throw err('Belum ada data tahapan yang dikirim');
    for (const item of items) {
      if (!item || !item.id) continue;
      const [fromIso, toIso] = validateDates(item);
      const rincian = buildRincian(item);
      await query(
        'UPDATE milestones SET tgl_mulai = $1, tgl_selesai = $2, rincian = COALESCE($3, rincian), updated_at = now() WHERE id = $4 AND project_id = $5',
        [fromIso, toIso, rincian, item.id, req.params.id]
      );
    }
    await broadcast(TOPIC.MILESTONES, { project_id: Number(req.params.id), action: 'update', actor: req.context.role });
    return res.json(await getProjectFull(req.params.id, req));
  }

  if (!items.length) throw err('Minimal satu tahapan harus dipertahankan');
  const existing = await query('SELECT id FROM milestones WHERE project_id = $1', [req.params.id]);
  const existingIds = new Set(existing.rows.map((r) => r.id));
  const keptIds = [];
  for (const [i, item] of items.entries()) {
    const urutan = i + 1;
    const nama = String(item && item.nama || '').trim() || `Tahap ${urutan}`;
    const bobot = Math.min(100, Math.max(0, Number(item && item.bobot) || 0));
    const [fromIso, toIso] = validateDates(item || {});
    const rincian = buildRincian(item || {});
    const id = Number(item && item.id) || null;
    if (id && existingIds.has(id)) {
      keptIds.push(id);
      await query(
        'UPDATE milestones SET nama = $1, bobot = $2, urutan = $3, tgl_mulai = $4, tgl_selesai = $5, rincian = COALESCE($6, rincian), updated_at = now() WHERE id = $7 AND project_id = $8',
        [nama, bobot, urutan, fromIso, toIso, rincian, id, req.params.id]
      );
    } else {
      const ins = await query(
        'INSERT INTO milestones (project_id, nama, bobot, rencana, realisasi, status, urutan, tgl_mulai, tgl_selesai, rincian) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id',
        [req.params.id, nama, bobot, 0, 0, 'Pending', urutan, fromIso, toIso, rincian]
      );
      keptIds.push(ins.rows[0].id);
    }
  }
  await query('DELETE FROM milestones WHERE project_id = $1 AND id != ALL($2::int[])', [req.params.id, keptIds]);
  await recalcMilestonesFromBoq(req.params.id);
  await broadcast(TOPIC.MILESTONES, { project_id: Number(req.params.id), action: 'update', actor: req.context.role });
  res.json(await getProjectFull(req.params.id, req));
}));

// Termin bayar: replace all (model pembayaran = progres fisik x 95% x nilai kontrak).
// Validasi: progres bayar (akumulasi) tidak boleh melebihi progres fisik proyek.
router.put('/projects/:id/termins', requireAuth, asyncHandler(async (req, res) => {
  const proj = await assertProject(req, req.params.id, 'termin_write');
  if (!proj) throw err('Project not found', 404);
  const b = req.body || {};
  const nilai = pgNum(b.nilai_kontrak) ?? pgNum(proj.nilai_kontrak) ?? 0;
  const termins = normalizeTermins(Array.isArray(b.termins) ? b.termins : [], nilai, { preserve: true });
  const payMsg = validateTerminPayments(termins, pgNum(proj.progres_realisasi), nilai);
  if (payMsg) throw err(payMsg);
  await query('DELETE FROM termin_bayars WHERE project_id = $1', [req.params.id]);
  for (const t of termins) {
    await query(
      'INSERT INTO termin_bayars (project_id, nama, nominal, bobot, progres_fisik, status, tgl_bayar, urutan) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [req.params.id, t.nama, t.nominal, t.bobot, t.progres_fisik ?? 0, t.status, t.tgl_bayar, t.urutan]
    );
  }
  await broadcast(TOPIC.TERMINS, { project_id: Number(req.params.id), action: 'update', actor: req.context.role });
  res.json(await getProjectFull(req.params.id, req));
}));

// Dokumen Kurva S (PDF/Excel): lampiran baseline kurva S proyek.
// Bila file Excel berisi kolom periode + rencana/realisasi, frontend mengirim
// `series` (data kurva S hasil parse) yang disimpan & dipakai untuk menggambar grafik.
router.post('/projects/:id/kurva-s-dokumen', requireAuth, asyncHandler(async (req, res) => {
  const proj = await assertProject(req, req.params.id, 'project_write');
  if (!proj) throw err('Project not found', 404);
  const b = req.body || {};
  const fileData = validateStoredFile(b.file_data, { label: 'Dokumen Kurva S' });
  if (!b.nama || !fileData) throw err('Nama dan file dokumen Kurva S wajib diisi');
  let series = null;
  if (Array.isArray(b.series) && b.series.length) {
    const vals = [];
    for (const s of b.series) {
      const minggu = s && String(s.minggu ?? '').trim();
      if (!minggu) continue;
      vals.push({
        minggu,
        rencana: pgNum(s.rencana) ?? 0,
        realisasi: s.realisasi === null || s.realisasi === undefined ? null : pgNum(s.realisasi),
      });
    }
    if (vals.length) series = JSON.stringify(vals);
  }
  const { rows } = await query(
    'INSERT INTO s_curve_documents (project_id, nama, jenis, file_data, keterangan, series, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
    [req.params.id, String(b.nama).trim(), b.jenis || 'file', fileData, b.keterangan || null, series, req.context.role]
  );
  if (series) {
    await query('UPDATE projects SET kurva_s_series = $1, updated_at = now() WHERE id = $2', [series, req.params.id]);
  }
  await broadcast(TOPIC.KURVA, { project_id: Number(req.params.id), action: 'create', actor: req.context.role });
  res.status(201).json(rows[0]);
}));

// Simpan / perbarui data titik kurva S proyek (dipakai untuk grafik kurva S di web).
// Bisa berasal dari parse Excel otomatis atau isian manual bila vendor mengunggah PDF.
router.post('/projects/:id/kurva-s-series', requireAuth, asyncHandler(async (req, res) => {
  const proj = await assertProject(req, req.params.id, 'project_write');
  if (!proj) throw err('Project not found', 404);
  const b = req.body || {};
  let series = null;
  if (Array.isArray(b.series) && b.series.length) {
    const vals = [];
    for (const s of b.series) {
      const minggu = s && String(s.minggu ?? '').trim();
      if (!minggu) continue;
      vals.push({
        minggu,
        rencana: pgNum(s.rencana) ?? 0,
        realisasi: s.realisasi === null || s.realisasi === undefined ? null : pgNum(s.realisasi),
      });
    }
    if (vals.length) series = JSON.stringify(vals);
  }
  await query('UPDATE projects SET kurva_s_series = $1, updated_at = now() WHERE id = $2', [series, req.params.id]);
  await broadcast(TOPIC.KURVA, { project_id: Number(req.params.id), action: 'update', actor: req.context.role });
  res.json(await getProjectFull(req.params.id, req));
}));

router.delete('/projects/:id/kurva-s-dokumen/:docId', requireAuth, asyncHandler(async (req, res) => {
  const bound = await assertChild(req, 's_curve_documents', req.params.docId, 'project_write');
  if (Number(bound.project_id) !== Number(req.params.id)) throw err('Data tidak ditemukan', 404);
  await assertProject(req, req.params.id, 'project_write');
  await query('DELETE FROM s_curve_documents WHERE id = $1 AND project_id = $2', [req.params.docId, req.params.id]);
  await broadcast(TOPIC.KURVA, { project_id: Number(req.params.id), action: 'delete', actor: req.context.role });
  res.json({ ok: true });
}));

// Berkas dokumen Kurva S diambil per dokumen (isi base64 tidak ikut di detail proyek).
router.get('/kurva-s-dokumen/:id/file', requireAuth, asyncHandler(async (req, res) => {
  await assertChild(req, 's_curve_documents', req.params.id, 'read');
  const { rows } = await query('SELECT id, nama, file_data FROM s_curve_documents WHERE id = $1', [req.params.id]);
  if (!rows.length) throw err('Dokumen Kurva S tidak ditemukan', 404);
  const row = rows[0];
  sendStoredFile(res, row.file_data, { filename: row.nama || `kurva-s-${row.id}` });
}));

// Amendemen: dokumen perpanjangan durasi (role dalkon). Menggeser target COD otomatis.
router.get('/amandemen', requireAuth, asyncHandler(async (req, res) => {
  const { project_id } = req.query;
  const scope = projectScope(req, 'p');
  if (project_id) {
    await assertProject(req, project_id, 'read');
    const { rows } = await query(`SELECT ${amandemenCols()} FROM amandements WHERE project_id = $1 ORDER BY id DESC`, [project_id]);
    return res.json(rows);
  }
  const { rows } = await query(
    `SELECT ${amandemenCols('a')}, p.kode AS project_kode, p.nama AS project_nama FROM amandements a
     JOIN projects p ON p.id = a.project_id WHERE ${scope.sql} ORDER BY a.id DESC`, scope.params
  );
  res.json(rows);
}));

router.post('/amandemen', requireAuth, asyncHandler(async (req, res) => {
  const b = req.body || {};
  const proj = await assertProject(req, b.project_id, 'amandemen_write');
  if (!proj) throw err('Project not found', 404);
  const durasi = Math.max(0, Math.round(Number(b.durasi_hari) || 0));
  if (!durasi) throw err('durasi_hari (penambahan hari) wajib > 0');
  const lama = proj.target_cod;
  if (!lama) throw err('Target COD proyek belum diatur');
  const baru = shiftIsoDate(lama, durasi);
  const file = validateStoredFile(b.file, { label: 'Dokumen amandemen' });
  const { rows } = await query(
    `INSERT INTO amandements (project_id, nomor, jenis, keterangan, file, durasi_hari, target_cod_lama, target_cod_baru, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [b.project_id, b.nomor || null, b.jenis || 'Perpanjangan Waktu', b.keterangan || null, file,
      durasi, lama, baru, (req.user.nama || req.user.email)]
  );
  await query('UPDATE projects SET target_cod = $1, updated_at = now() WHERE id = $2', [baru, b.project_id]);
  await extendSCurveToCod(b.project_id, durasi);
  await broadcast(TOPIC.AMANDEMEN, { project_id: Number(b.project_id), action: 'create', actor: req.context.role });
  await broadcast(TOPIC.PROJECTS, { project_id: Number(b.project_id), action: 'cod', actor: req.context.role });
  res.status(201).json(rows[0]);
}));

// Amandemen delete: remove record and restore target COD ke nilai sebelum amandemen
router.delete('/amandemen/:id', requireAuth, asyncHandler(async (req, res) => {
  await assertChild(req, 'amandements', req.params.id, 'amandemen_write');
  const { rows } = await query('SELECT project_id, target_cod_lama FROM amandements WHERE id = $1', [req.params.id]);
  if (!rows.length) throw err('Amandemen tidak ditemukan', 404);
  const a = rows[0];
  await query('DELETE FROM amandements WHERE id = $1', [req.params.id]);
  if (a.target_cod_lama) {
    await query('UPDATE projects SET target_cod = $1, updated_at = now() WHERE id = $2', [a.target_cod_lama, a.project_id]);
  }
  await broadcast(TOPIC.AMANDEMEN, { project_id: Number(a.project_id), action: 'delete', actor: req.context.role });
  await broadcast(TOPIC.PROJECTS, { project_id: Number(a.project_id), action: 'cod', actor: req.context.role });
  res.json({ ok: true });
}));

// Dokumen amandemen (dulu base64 ikut di detail proyek).
router.get('/amandemen/:id/file', requireAuth, asyncHandler(async (req, res) => {
  await assertChild(req, 'amandements', req.params.id, 'read');
  const { rows } = await query('SELECT id, nomor, file FROM amandements WHERE id = $1', [req.params.id]);
  if (!rows.length) throw err('Amandemen tidak ditemukan', 404);
  sendStoredFile(res, rows[0].file, { filename: rows[0].nomor || `amandemen-${rows[0].id}` });
}));

// BOQ Kontrak helpers ------------------------------------------------------

async function ensureDefaultBoqGroup(projectId, q = query) {
  const { rows } = await q(
    'SELECT id FROM boq_groups WHERE project_id = $1 AND nama = $2 ORDER BY id LIMIT 1',
    [projectId, 'BOQ Kontrak']
  );
  if (rows.length) return rows[0].id;
  const ins = await q(
    'INSERT INTO boq_groups (project_id, nama) VALUES ($1,$2) RETURNING id',
    [projectId, 'BOQ Kontrak']
  );
  return ins.rows[0].id;
}

async function replaceBoqGroup(projectId, groupId, items, role, q = query) {
  const group = await q('SELECT id FROM boq_groups WHERE id=$1 AND project_id=$2', [groupId, projectId]);
  if (!group.rows.length) throw err('BOQ tidak ditemukan', 404);
  for (const it of (Array.isArray(items) ? items : [])) {
    if (!it.milestone_id) continue;
    const m = await q('SELECT id FROM milestones WHERE id=$1 AND project_id=$2', [it.milestone_id, projectId]);
    if (!m.rows.length) throw err('Tahapan tidak ditemukan', 404);
  }
  const existing = await q('SELECT * FROM boqs WHERE boq_group_id = $1 AND project_id=$2', [groupId, projectId]);
  const existingByUrutan = new Map(existing.rows.map((r) => [r.urutan, r]));
  const existingById = new Map(existing.rows.map((r) => [r.id, r]));
  await q('DELETE FROM boqs WHERE boq_group_id = $1 AND project_id=$2', [groupId, projectId]);
  for (const [i, it] of (Array.isArray(items) ? items : []).entries()) {
    const urutan = it.urutan ?? (i + 1);
    // Cocokkan baris lama lewat id (paling akurat), lalu urutan, lalu posisi.
    const prev = (it.id && existingById.get(Number(it.id)))
      || existingByUrutan.get(urutan) || existingByUrutan.get(i + 1) || {};
    // Isi foto tidak lagi ikut dikirim di detail proyek (lihat boqCols), jadi:
    //   undefined / '__existing__' -> pakai foto lama, null/'' -> hapus foto.
    // Nilai baru tetap divalidasi (MIME + ukuran) sebelum masuk database.
    const keep = (incoming, prevVal, label) => {
      if (incoming === undefined || incoming === '__existing__') return prevVal || null;
      return validateStoredFile(incoming, { label }) || null;
    };
    let fotoVendor = keep(it.foto_vendor, prev.foto_vendor, 'Foto BOQ vendor');
    let fotoDalkon = keep(it.foto_dalkon, prev.foto_dalkon, 'Foto BOQ dalkon');
    if (role === 'vendor') fotoDalkon = prev.foto_dalkon || null;
    if (role === 'dalkon') fotoVendor = prev.foto_vendor || null;
    const vol = it.volume === '' || it.volume === null || it.volume === undefined ? null : Number(it.volume);
    const price = it.harga_satuan === '' || it.harga_satuan === null || it.harga_satuan === undefined ? null : Number(it.harga_satuan);
    const total = vol != null && price != null
      ? Math.round(vol * price * 100) / 100
      : (price != null ? price : null);
    const progres = it.progres === '' || it.progres === null || it.progres === undefined ? 0 : Number(it.progres);
    const milestoneId = it.milestone_id ? Number(it.milestone_id) : null;
    await q(
      'INSERT INTO boqs (project_id, boq_group_id, uraian, satuan, volume, harga_satuan, total, progres, foto_vendor, foto_dalkon, milestone_id, urutan) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
      [projectId, groupId, it.uraian || '-', it.satuan || null, vol, price, total, progres, fotoVendor, fotoDalkon, milestoneId, urutan]
    );
  }
  await recalcBoqBobot(groupId, q);
  await recalcMilestonesFromBoq(projectId, q);
}

// BOQ Kontrak (replace-all, backward compatible: targets the default group only)
router.put('/projects/:id/boq', requireAuth, asyncHandler(async (req, res) => {
  const proj = await assertProject(req, req.params.id, 'project_write');
  if (!proj) throw err('Project not found', 404);
  const b = req.body || {};
  await withTransaction(async (q) => {
    const groupId = await ensureDefaultBoqGroup(req.params.id, q);
    await replaceBoqGroup(req.params.id, groupId, b.items, req.context.role, q);
    if (b.image_url && b.image_url !== '__existing__') {
      const imageUrl = validateStoredFile(b.image_url, { label: 'Gambar BOQ' });
      if (imageUrl) {
        await q('UPDATE projects SET boq_image = $1, updated_at = now() WHERE id = $2', [imageUrl, req.params.id]);
      }
    }
  });
  await broadcast(TOPIC.BOQ, { project_id: Number(req.params.id), action: 'replace', actor: req.context.role });
  res.json(await getProjectFull(req.params.id, req));
}));

// BOQ Kontrak: create a new BOQ document (auto-save on Excel upload)
router.post('/projects/:id/boq', requireAuth, asyncHandler(async (req, res) => {
  const proj = await assertProject(req, req.params.id, 'project_write');
  if (!proj) throw err('Project not found', 404);
  const b = req.body || {};
  const items = Array.isArray(b.items) ? b.items : [];
  if (!items.length) throw err('Belum ada item BOQ untuk disimpan');
  const nama = String(b.nama || '').trim() || 'BOQ Kontrak';
  await withTransaction(async (q) => {
    const { rows } = await q(
      'INSERT INTO boq_groups (project_id, nama, created_by) VALUES ($1,$2,$3) RETURNING id',
      [req.params.id, nama, req.user.nama || req.user.email]
    );
    await replaceBoqGroup(req.params.id, rows[0].id, items, req.context.role, q);
  });
  await broadcast(TOPIC.BOQ, { project_id: Number(req.params.id), action: 'create', actor: req.context.role });
  res.status(201).json(await getProjectFull(req.params.id, req));
}));

// BOQ Kontrak: update items of one existing BOQ document
router.put('/projects/:id/boq/:groupId', requireAuth, asyncHandler(async (req, res) => {
  const bound = await assertChild(req, 'boq_groups', req.params.groupId, 'project_write');
  if (Number(bound.project_id) !== Number(req.params.id)) throw err('Data tidak ditemukan', 404);
  const proj = await assertProject(req, req.params.id, 'project_write');
  if (!proj) throw err('Project not found', 404);
  const group = await query('SELECT * FROM boq_groups WHERE id = $1 AND project_id = $2', [req.params.groupId, req.params.id]);
  if (!group.rows.length) throw err('BOQ tidak ditemukan', 404);
  const b = req.body || {};
  await withTransaction(async (q) => {
    await replaceBoqGroup(req.params.id, req.params.groupId, b.items, req.context.role, q);
  });
  await broadcast(TOPIC.BOQ, { project_id: Number(req.params.id), action: 'update', actor: req.context.role });
  res.json(await getProjectFull(req.params.id, req));
}));

// BOQ Kontrak: delete one BOQ document (items removed via cascade)
router.delete('/projects/:id/boq/:groupId', requireAuth, asyncHandler(async (req, res) => {
  const bound = await assertChild(req, 'boq_groups', req.params.groupId, 'project_write');
  if (Number(bound.project_id) !== Number(req.params.id)) throw err('Data tidak ditemukan', 404);
  const proj = await assertProject(req, req.params.id, 'project_write');
  if (!proj) throw err('Project not found', 404);
  const del = await query('DELETE FROM boq_groups WHERE id = $1 AND project_id = $2 RETURNING id', [req.params.groupId, req.params.id]);
  if (!del.rows.length) throw err('BOQ tidak ditemukan', 404);
  await recalcMilestonesFromBoq(req.params.id);
  await broadcast(TOPIC.BOQ, { project_id: Number(req.params.id), action: 'delete', actor: req.context.role });
  res.json(await getProjectFull(req.params.id, req));
}));

// Foto item BOQ (vendor/dalkon) diambil per item saat ditampilkan.
router.get('/boqs/:id/foto/:side', requireAuth, asyncHandler(async (req, res) => {
  await assertChild(req, 'boqs', req.params.id, 'read');
  const side = req.params.side === 'dalkon' ? 'foto_dalkon' : 'foto_vendor';
  const { rows } = await query(`SELECT id, uraian, ${side} AS data FROM boqs WHERE id = $1`, [req.params.id]);
  if (!rows.length) throw err('Item BOQ tidak ditemukan', 404);
  const row = rows[0];
  sendStoredFile(res, row.data, { filename: `boq-${row.id}-${req.params.side}` });
}));

// Dokumentasi store
router.post('/projects/:id/dokumentasi', requireAuth, asyncHandler(async (req, res) => {
  const proj = await assertProject(req, req.params.id, 'project_write');
  if (!proj) throw err('Project not found', 404);
  const b = req.body;
  if (b.unit_id !== undefined && Number(b.unit_id) !== Number(req.context.unit_id)) throw err('Unit proyek tidak dapat dipindahkan', 403);
  if (!b.judul || !b.tahap) throw err('judul dan tahap wajib');
  const foto = validateStoredFile(b.foto_url || b.foto, { label: 'Foto dokumentasi' }) || '';
  const tgl = b.tgl ? isoDate(b.tgl) : new Date().toISOString().slice(0, 10);
  const { rows } = await query(
    'INSERT INTO dokumentasis (project_id, judul, tahap, foto, tgl, keterangan) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
    [req.params.id, b.judul, b.tahap, foto, tgl, b.keterangan || null]
  );
  await broadcast(TOPIC.DOKUMENTASI, { project_id: Number(req.params.id), action: 'create', actor: req.context.role });
  res.status(201).json({ id: rows[0].id });
}));

// Dokumentasi update (judul, tahap, foto, keterangan)
router.put('/projects/:id/dokumentasi/:docId', requireAuth, asyncHandler(async (req, res) => {
  const bound = await assertChild(req, 'dokumentasis', req.params.docId, 'project_write');
  if (Number(bound.project_id) !== Number(req.params.id)) throw err('Data tidak ditemukan', 404);
  const proj = await assertProject(req, req.params.id, 'project_write');
  if (!proj) throw err('Project not found', 404);
  const b = req.body;
  if (b.unit_id !== undefined && Number(b.unit_id) !== Number(req.context.unit_id)) throw err('Unit proyek tidak dapat dipindahkan', 403);
  if (!b.judul || !b.tahap) throw err('judul dan tahap wajib');
  // '__existing__' = berkas lama dipertahankan (isi foto tidak ikut di respons,
  // lihat dokumentasiCols). Nilai lain (termasuk '') mengganti/menghapus berkas.
  const rawFoto = b.foto_url !== undefined ? b.foto_url : b.foto;
  const foto = rawFoto === '__existing__'
    ? null
    : (validateStoredFile(rawFoto, { label: 'Foto dokumentasi' }) || '');
  const tgl = b.tgl ? isoDate(b.tgl) : new Date().toISOString().slice(0, 10);
  await query(
    'UPDATE dokumentasis SET judul=$1, tahap=$2, foto=COALESCE($3, foto), tgl=$4, keterangan=$5, updated_at=now() WHERE id=$6 AND project_id=$7',
    [b.judul, b.tahap, foto, tgl, b.keterangan || null, req.params.docId, req.params.id]
  );
  await broadcast(TOPIC.DOKUMENTASI, { project_id: Number(req.params.id), action: 'update', actor: req.context.role });
  res.json({ ok: true });
}));

// Dokumentasi delete
router.delete('/projects/:id/dokumentasi/:docId', requireAuth, asyncHandler(async (req, res) => {
  const bound = await assertChild(req, 'dokumentasis', req.params.docId, 'project_write');
  if (Number(bound.project_id) !== Number(req.params.id)) throw err('Data tidak ditemukan', 404);
  const proj = await assertProject(req, req.params.id, 'project_write');
  if (!proj) throw err('Project not found', 404);
  const del = await query('DELETE FROM dokumentasis WHERE id=$1 AND project_id=$2 RETURNING id', [req.params.docId, req.params.id]);
  if (!del.rows.length) throw err('Dokumentasi tidak ditemukan', 404);
  await broadcast(TOPIC.DOKUMENTASI, { project_id: Number(req.params.id), action: 'delete', actor: req.context.role });
  res.json({ ok: true });
}));

// Foto/dokumen LK diambil per baris dokumentasi (dulu base64 ikut di detail proyek).
router.get('/dokumentasi/:id/foto', requireAuth, asyncHandler(async (req, res) => {
  await assertChild(req, 'dokumentasis', req.params.id, 'read');
  const { rows } = await query('SELECT id, judul, foto FROM dokumentasis WHERE id = $1', [req.params.id]);
  if (!rows.length) throw err('Dokumentasi tidak ditemukan', 404);
  const row = rows[0];
  sendStoredFile(res, row.foto, { filename: row.judul || `dokumentasi-${row.id}` });
}));

// Instruksi Kerja dipindah ke server/routes/instruksi.js (alur approval berjenjang).

export default router;
