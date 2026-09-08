import { Router } from 'express';
import { query } from '../_lib/db.js';
import { ALL_TIPE, ALL_UIP, KATEGORI_KENDALA, STATUS_BADGE,
  deriveStatus, deviasiOf, normalizeLokasis, defaultMilestones, defaultSCurvePoints, defaultTermins, terminNominal, shiftIsoDate, isoDate,
} from '../_lib/business.js';
import { requireAuth, requireRole } from '../_lib/auth.js';
import { asyncHandler, err, pgNum, getProject, getProjectFull, recalcMilestonesFromBoq, extendSCurveToCod } from '../_lib/http.js';

const router = Router();

// List with filters + pagination
router.get('/projects', asyncHandler(async (req, res) => {
  const { search, uip, tipe, status, page = 1, perPage = 10 } = req.query;
  const conditions = [];
  const params = [];
  let i = 1;
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

// Options for project create/edit
router.get('/meta/options', asyncHandler(async (req, res) => {
  res.json({ allTipe: ALL_TIPE, allUip: ALL_UIP, allStatus: Object.keys(STATUS_BADGE), kategoris: KATEGORI_KENDALA });
}));

// Show one project (full detail)
router.get('/projects/:id', asyncHandler(async (req, res) => {
  const proj = await getProjectFull(req.params.id);
  if (!proj) throw err('Project not found', 404);
  res.json(proj);
}));

// Create
router.post('/projects', requireAuth, asyncHandler(async (req, res) => {
  const b = req.body;
  const lokasis = normalizeLokasis(b.lokasis);
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

  const { rows } = await query(
    `INSERT INTO projects (kode, nama, tipe, tegangan, uip, upp, lokasi, latitude, longitude, kontraktor,
      nomor_kontrak, tgl_kontrak, nomor_spmk, nilai_kontrak, tgl_mulai, target_cod, status, tgl_selesai_garansi, barang_dicek,
      progres_rencana, progres_realisasi, deviasi, penyerapan_anggaran, deskripsi)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24) RETURNING id`,
    [b.kode, b.nama, b.tipe, b.tegangan || '150 kV', b.uip, b.upp || null, lokasiLabel,
      latitude, longitude, b.kontraktor, b.nomor_kontrak || null,
      b.tgl_kontrak || null, b.nomor_spmk || null,
      pgNum(b.nilai_kontrak) || 0, b.tgl_mulai || null, b.target_cod || null, status,
      b.tgl_selesai_garansi || null, b.barang_dicek ? true : false,
      rencana, realisasi, deviasi, pgNum(b.penyerapan_anggaran) || 0, b.deskripsi || null]
  );
  const projectId = rows[0].id;

  for (const s of lokasis || []) {
    await query(
      'INSERT INTO lokasis (project_id, nama, latitude, longitude, urutan) VALUES ($1,$2,$3,$4,$5)',
      [projectId, s.nama, s.latitude, s.longitude, s.urutan]
    );
  }

  for (const m of defaultMilestones(realisasi)) {
    await query(
      'INSERT INTO milestones (project_id, nama, bobot, rencana, realisasi, status, urutan) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [projectId, m.nama, m.bobot, m.rencana, m.realisasi, m.status, m.urutan]
    );
  }
  for (const s of defaultSCurvePoints(rencana, realisasi)) {
    await query(
      'INSERT INTO s_curves (project_id, minggu, rencana, realisasi, pembuat, urutan) VALUES ($1,$2,$3,$4,$5,$6)',
      [projectId, s.minggu, s.rencana, s.realisasi, s.pembuat || null, s.urutan]
    );
  }
  for (const t of defaultTermins(pgNum(b.nilai_kontrak))) {
    await query(
      'INSERT INTO termin_bayars (project_id, nama, nominal, bobot, progres_fisik, status, tgl_bayar, urutan) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [projectId, t.nama, t.nominal, t.bobot, t.progres_fisik ?? 0, t.status, t.tgl_bayar, t.urutan]
    );
  }

  res.status(201).json(await getProjectFull(projectId));
}));

// Update
router.put('/projects/:id', requireAuth, asyncHandler(async (req, res) => {
  const proj = await getProject(req.params.id);
  if (!proj) throw err('Project not found', 404);
  const b = req.body;
  const lokasis = normalizeLokasis(b.lokasis);
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

  await query(
    `UPDATE projects SET kode=$1, nama=$2, tipe=$3, tegangan=$4, uip=$5, upp=$6, lokasi=$7, latitude=$8,
      longitude=$9, kontraktor=$10, nomor_kontrak=$11, tgl_kontrak=$12, nomor_spmk=$13, nilai_kontrak=$14,
      tgl_mulai=$15, target_cod=$16, status=$17, tgl_selesai_garansi=$18, barang_dicek=$19,
      progres_rencana=$20, progres_realisasi=$21, deviasi=$22, penyerapan_anggaran=$23, deskripsi=$24, updated_at=now()
     WHERE id=$25`,
    [b.kode || proj.kode, b.nama || proj.nama, b.tipe || proj.tipe, b.tegangan || proj.tegangan,
      b.uip || proj.uip, b.upp ?? proj.upp, lokasiLabel, latitude, longitude,
      b.kontraktor || proj.kontraktor, b.nomor_kontrak ?? proj.nomor_kontrak,
      b.tgl_kontrak ?? proj.tgl_kontrak, b.nomor_spmk ?? proj.nomor_spmk,
      pgNum(b.nilai_kontrak) ?? pgNum(proj.nilai_kontrak), b.tgl_mulai ?? proj.tgl_mulai, b.target_cod ?? proj.target_cod,
      status, b.tgl_selesai_garansi ?? proj.tgl_selesai_garansi, b.barang_dicek ?? proj.barang_dicek,
      rencana, realisasi, deviasi, pgNum(b.penyerapan_anggaran) ?? pgNum(proj.penyerapan_anggaran),
      b.deskripsi ?? proj.deskripsi, req.params.id]
  );

  if (lokasis) {
    await query('DELETE FROM lokasis WHERE project_id = $1', [req.params.id]);
    for (const s of lokasis) {
      await query(
        'INSERT INTO lokasis (project_id, nama, latitude, longitude, urutan) VALUES ($1,$2,$3,$4,$5)',
        [req.params.id, s.nama, s.latitude, s.longitude, s.urutan]
      );
    }
  }

  res.json(await getProjectFull(req.params.id));
}));

// Delete
router.delete('/projects/:id', requireAuth, asyncHandler(async (req, res) => {
  const proj = await getProject(req.params.id);
  if (!proj) throw err('Project not found', 404);
  await query('DELETE FROM projects WHERE id = $1', [req.params.id]);
  res.json({ ok: true, message: `Proyek ${proj.nama} berhasil dihapus.` });
}));

// Progress store (weekly)
router.post('/projects/:id/progress', requireAuth, asyncHandler(async (req, res) => {
  const proj = await getProject(req.params.id);
  if (!proj) throw err('Project not found', 404);
  const b = req.body;
  const rencana = pgNum(b.progres_rencana);
  const realisasi = pgNum(b.progres_realisasi);
  if (rencana === null || realisasi === null) throw err('progres_rencana dan progres_realisasi wajib');

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
    const exist = await query('SELECT id FROM s_curves WHERE project_id=$1 AND minggu=$2', [req.params.id, b.minggu_label]);
    if (exist.rows.length) {
      await query('UPDATE s_curves SET rencana=$1, realisasi=$2, catatan=$3, pembuat=$4, updated_at=now() WHERE id=$5',
        [rencana, realisasi, b.catatan || null, req.user.role, exist.rows[0].id]);
    } else {
      const maxRes = await query('SELECT COALESCE(MAX(urutan),0) AS m FROM s_curves WHERE project_id=$1', [req.params.id]);
      await query('INSERT INTO s_curves (project_id, minggu, rencana, realisasi, catatan, pembuat, urutan) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [req.params.id, b.minggu_label, rencana, realisasi, b.catatan || null, req.user.role, maxRes.rows[0].m + 1]);
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

  res.json(await getProjectFull(req.params.id));
}));

// Termin bayar: replace all (model pembayaran = progres fisik x 95% x nilai kontrak).
router.put('/projects/:id/termins', requireAuth, asyncHandler(async (req, res) => {
  const proj = await getProject(req.params.id);
  if (!proj) throw err('Project not found', 404);
  const b = req.body || {};
  const items = Array.isArray(b.termins) ? b.termins : [];
  const nilai = pgNum(b.nilai_kontrak) ?? pgNum(proj.nilai_kontrak) ?? 0;
  await query('DELETE FROM termin_bayars WHERE project_id = $1', [req.params.id]);
  for (const [i, t] of items.entries()) {
    const urutan = t.urutan ?? (i + 1);
    const fisik = pgNum(t.progres_fisik);
    const isRetensi = /retensi/i.test(String(t.nama || ''));
    const nominal = isRetensi ? Math.round(nilai * 0.05) : terminNominal(fisik, nilai);
    await query(
      'INSERT INTO termin_bayars (project_id, nama, nominal, bobot, progres_fisik, status, tgl_bayar, urutan) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [req.params.id, t.nama || 'Termin', nominal, isRetensi ? 5 : (fisik ?? 0), fisik, t.status || 'Belum Bayar', t.tgl_bayar || null, urutan]
    );
  }
  res.json(await getProjectFull(req.params.id));
}));

// Amendemen: dokumen perpanjangan durasi (role dalkon). Menggeser target COD otomatis.
router.get('/amandemen', asyncHandler(async (req, res) => {
  const { project_id } = req.query;
  if (project_id) {
    const { rows } = await query('SELECT * FROM amandements WHERE project_id = $1 ORDER BY id DESC', [project_id]);
    return res.json(rows);
  }
  const { rows } = await query(
    `SELECT a.*, p.kode AS project_kode, p.nama AS project_nama FROM amandements a
     JOIN projects p ON p.id = a.project_id ORDER BY a.id DESC`
  );
  res.json(rows);
}));

router.post('/amandemen', requireAuth, requireRole('dalkon', 'admin'), asyncHandler(async (req, res) => {
  const b = req.body || {};
  const proj = await getProject(b.project_id);
  if (!proj) throw err('Project not found', 404);
  const durasi = Math.max(0, Math.round(Number(b.durasi_hari) || 0));
  if (!durasi) throw err('durasi_hari (penambahan hari) wajib > 0');
  const lama = proj.target_cod;
  if (!lama) throw err('Target COD proyek belum diatur');
  const baru = shiftIsoDate(lama, durasi);
  const { rows } = await query(
    `INSERT INTO amandements (project_id, nomor, jenis, keterangan, file, durasi_hari, target_cod_lama, target_cod_baru, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [b.project_id, b.nomor || null, b.jenis || 'Perpanjangan Waktu', b.keterangan || null, b.file || null,
      durasi, lama, baru, (req.user.nama || req.user.email)]
  );
  await query('UPDATE projects SET target_cod = $1, updated_at = now() WHERE id = $2', [baru, b.project_id]);
  await extendSCurveToCod(b.project_id, durasi);
  res.status(201).json(rows[0]);
}));

// BOQ Kontrak helpers ------------------------------------------------------

async function ensureDefaultBoqGroup(projectId) {
  const { rows } = await query(
    'SELECT id FROM boq_groups WHERE project_id = $1 AND nama = $2 ORDER BY id LIMIT 1',
    [projectId, 'BOQ Kontrak']
  );
  if (rows.length) return rows[0].id;
  const ins = await query(
    'INSERT INTO boq_groups (project_id, nama) VALUES ($1,$2) RETURNING id',
    [projectId, 'BOQ Kontrak']
  );
  return ins.rows[0].id;
}

async function replaceBoqGroup(projectId, groupId, items, role) {
  const existing = await query('SELECT * FROM boqs WHERE boq_group_id = $1', [groupId]);
  const existingByUrutan = new Map(existing.rows.map((r) => [r.urutan, r]));
  await query('DELETE FROM boqs WHERE boq_group_id = $1', [groupId]);
  for (const [i, it] of (Array.isArray(items) ? items : []).entries()) {
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
    const progres = it.progres === '' || it.progres === null || it.progres === undefined ? 0 : Number(it.progres);
    const milestoneId = it.milestone_id ? Number(it.milestone_id) : null;
    await query(
      'INSERT INTO boqs (project_id, boq_group_id, uraian, satuan, volume, harga_satuan, total, progres, foto_vendor, foto_dalkon, milestone_id, urutan) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
      [projectId, groupId, it.uraian || '-', it.satuan || null, vol, price, total, progres, fotoVendor, fotoDalkon, milestoneId, urutan]
    );
  }
  await recalcMilestonesFromBoq(projectId);
}

// BOQ Kontrak (replace-all, backward compatible: targets the default group only)
router.put('/projects/:id/boq', requireAuth, asyncHandler(async (req, res) => {
  const proj = await getProject(req.params.id);
  if (!proj) throw err('Project not found', 404);
  const b = req.body || {};
  const groupId = await ensureDefaultBoqGroup(req.params.id);
  await replaceBoqGroup(req.params.id, groupId, b.items, req.user.role);
  if (b.image_url) {
    await query('UPDATE projects SET boq_image = $1, updated_at = now() WHERE id = $2', [b.image_url, req.params.id]);
  }
  res.json(await getProjectFull(req.params.id));
}));

// BOQ Kontrak: create a new BOQ document (auto-save on Excel upload)
router.post('/projects/:id/boq', requireAuth, asyncHandler(async (req, res) => {
  const proj = await getProject(req.params.id);
  if (!proj) throw err('Project not found', 404);
  const b = req.body || {};
  const items = Array.isArray(b.items) ? b.items : [];
  if (!items.length) throw err('Belum ada item BOQ untuk disimpan');
  const nama = String(b.nama || '').trim() || 'BOQ Kontrak';
  const { rows } = await query(
    'INSERT INTO boq_groups (project_id, nama, created_by) VALUES ($1,$2,$3) RETURNING id',
    [req.params.id, nama, req.user.nama || req.user.email]
  );
  await replaceBoqGroup(req.params.id, rows[0].id, items, req.user.role);
  res.status(201).json(await getProjectFull(req.params.id));
}));

// BOQ Kontrak: update items of one existing BOQ document
router.put('/projects/:id/boq/:groupId', requireAuth, asyncHandler(async (req, res) => {
  const proj = await getProject(req.params.id);
  if (!proj) throw err('Project not found', 404);
  const group = await query('SELECT * FROM boq_groups WHERE id = $1 AND project_id = $2', [req.params.groupId, req.params.id]);
  if (!group.rows.length) throw err('BOQ tidak ditemukan', 404);
  const b = req.body || {};
  await replaceBoqGroup(req.params.id, req.params.groupId, b.items, req.user.role);
  res.json(await getProjectFull(req.params.id));
}));

// BOQ Kontrak: delete one BOQ document (items removed via cascade)
router.delete('/projects/:id/boq/:groupId', requireAuth, asyncHandler(async (req, res) => {
  const proj = await getProject(req.params.id);
  if (!proj) throw err('Project not found', 404);
  const del = await query('DELETE FROM boq_groups WHERE id = $1 AND project_id = $2 RETURNING id', [req.params.groupId, req.params.id]);
  if (!del.rows.length) throw err('BOQ tidak ditemukan', 404);
  await recalcMilestonesFromBoq(req.params.id);
  res.json(await getProjectFull(req.params.id));
}));

// Dokumentasi store
router.post('/projects/:id/dokumentasi', requireAuth, asyncHandler(async (req, res) => {
  const proj = await getProject(req.params.id);
  if (!proj) throw err('Project not found', 404);
  const b = req.body;
  if (!b.judul || !b.tahap) throw err('judul dan tahap wajib');
  const foto = b.foto_url || b.foto || '';
  const tgl = b.tgl ? isoDate(b.tgl) : new Date().toISOString().slice(0, 10);
  const { rows } = await query(
    'INSERT INTO dokumentasis (project_id, judul, tahap, foto, tgl, keterangan) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
    [req.params.id, b.judul, b.tahap, foto, tgl, b.keterangan || null]
  );
  res.status(201).json({ id: rows[0].id });
}));

// Instruksi Kerja list (project-scoped)
router.get('/projects/:id/instruksi', asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM instruksi_kerja WHERE project_id = $1 ORDER BY id DESC', [req.params.id]);
  res.json(rows);
}));

// Instruksi Kerja store/upload (project-scoped)
router.post('/projects/:id/instruksi', requireAuth, asyncHandler(async (req, res) => {
  const proj = await getProject(req.params.id);
  if (!proj) throw err('Project not found', 404);
  const b = req.body || {};
  const judul = String(b.judul || '').trim();
  const file = String(b.file || '').trim();
  if (!judul || !file) throw err('Judul dan file instruksi kerja wajib diisi');
  const nomor_instruksi = b.nomor_instruksi ? String(b.nomor_instruksi).trim() : null;
  const jenis = b.jenis ? String(b.jenis).trim() : 'Instruksi Kerja';
  const tgl = b.tgl ? isoDate(b.tgl) : new Date().toISOString().slice(0, 10);
  const { rows } = await query(
    `INSERT INTO instruksi_kerja (project_id, judul, nomor_instruksi, jenis, file, keterangan, tgl)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [req.params.id, judul, nomor_instruksi, jenis, file, b.keterangan || null, tgl]
  );
  res.status(201).json(rows[0]);
}));

// Instruksi Kerja delete
router.delete('/instruksi/:id', requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await query('DELETE FROM instruksi_kerja WHERE id = $1 RETURNING id', [req.params.id]);
  if (!rows.length) throw err('Instruksi kerja tidak ditemukan', 404);
  res.json({ ok: true });
}));

export default router;
