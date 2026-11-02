// Shared HTTP/DB helpers used across route modules.
import { query } from './db.js';

export function pgNum(v) {
  return v === null || v === undefined ? null : Number(v);
}

// Kolom `projects` yang dikirim ke klien. `boq_image` sengaja TIDAK diikutkan:
// isinya data-URL base64 (bisa ratusan kB per proyek) dan tidak pernah dibaca
// frontend — dulu kolom ini ikut terkirim di dashboard, daftar proyek, laporan
// dan detail proyek sehingga respons membengkak tanpa manfaat.
export const PROJECT_COLS = `id, kode, nama, tipe, tegangan, uip, upp, lokasi, latitude, longitude,
  kontraktor, nomor_kontrak, tgl_kontrak, nomor_spmk, nilai_kontrak, tgl_mulai, target_cod, status,
  tgl_selesai_garansi, barang_dicek, progres_rencana, progres_realisasi, deviasi, penyerapan_anggaran,
  deskripsi, organisasi, kurva_s_series, created_at, updated_at`;

// Kolom `approval_drawings` untuk daftar/detail: `file_vendor` & `file_enjin`
// berisi data-URL (PDF/gambar) yang bisa beberapa MB per baris. Halaman daftar
// drawing menampilkan SEMUA drawing, jadi isi berkas tidak boleh ikut terkirim;
// klien hanya butuh penanda ada/tidak dan mengambil berkasnya lewat
// GET /api/drawings/:id/file/:side saat tautan diklik.
const DRAWING_FIELDS = [
  'id', 'project_id', 'judul', 'nomor_drawing', 'kategori', 'tgl_upload_vendor',
  'hardfile_vendor', 'tgl_hardfile_vendor', 'nodin_kons', 'nomor_nodin', 'tgl_nodin',
  'hardfile_ke_enjin', 'tgl_hardfile_ke_enjin', 'enjin_review_status', 'tgl_enjin_review',
  'status_approval', 'catatan_enjin', 'tgl_approval_enjin', 'created_at', 'updated_at',
];

export function drawingCols(alias = '') {
  const p = alias ? `${alias}.` : '';
  return `${DRAWING_FIELDS.map((f) => p + f).join(', ')},
    (${p}file_vendor IS NOT NULL AND ${p}file_vendor <> '') AS has_file_vendor,
    (${p}file_enjin IS NOT NULL AND ${p}file_enjin <> '') AS has_file_enjin`;
}

// Kolom tabel lampiran (dokumentasi, BOQ, dokumen Kurva S, IK, approval IK,
// amandemen). Sama seperti drawing: berkas disimpan sebagai data-URL base64 di
// kolom TEXT dan TIDAK ikut dikirim pada respons daftar/detail — hanya penanda
// `has_*` (+ `is_pdf` bila tampilan butuh membedakan PDF vs gambar). Isi berkas
// diambil per item lewat endpoint /file yang memakai sendStoredFile().
const DOKUMENTASI_FIELDS = ['id', 'project_id', 'judul', 'tahap', 'tgl', 'keterangan', 'created_at', 'updated_at'];
const BOQ_FIELDS = ['id', 'project_id', 'boq_group_id', 'milestone_id', 'uraian', 'satuan', 'volume',
  'harga_satuan', 'total', 'progres', 'bobot', 'urutan', 'created_at', 'updated_at'];
const KURVA_DOC_FIELDS = ['id', 'project_id', 'nama', 'jenis', 'keterangan', 'series', 'created_by', 'created_at', 'updated_at'];
const IK_FIELDS = ['id', 'project_id', 'judul', 'nomor_instruksi', 'jenis', 'keterangan', 'tgl',
  'status_approval', 'tahap', 'tgl_kontrak', 'tgl_survei', 'tgl_pembahasan', 'tgl_penjadwalan', 'tgl_izin',
  'jsa', 'wp', 'dp3', 'on_safety', 'on_quality', 'on_schedule', 'on_supervision', 'putaran',
  'created_at', 'updated_at'];
const IK_APPROVAL_FIELDS = ['id', 'instruksi_id', 'putaran', 'level', 'level_nama', 'peran', 'status',
  'catatan', 'approver', 'tgl', 'created_at', 'updated_at'];
const AMANDEMEN_FIELDS = ['id', 'project_id', 'nomor', 'jenis', 'keterangan', 'durasi_hari',
  'target_cod_lama', 'target_cod_baru', 'created_by', 'created_at', 'updated_at'];

function compact(list, alias = '') {
  const p = alias ? `${alias}.` : '';
  return list.map((f) => p + f).join(', ');
}

export function dokumentasiCols(alias = '') {
  const p = alias ? `${alias}.` : '';
  return `${compact(DOKUMENTASI_FIELDS, alias)},
    (${p}foto IS NOT NULL AND ${p}foto <> '') AS has_foto,
    (${p}foto LIKE 'data:application/pdf%' OR LOWER(${p}foto) LIKE '%.pdf') AS is_pdf`;
}

export function boqCols(alias = '') {
  const p = alias ? `${alias}.` : '';
  return `${compact(BOQ_FIELDS, alias)},
    (${p}foto_vendor IS NOT NULL AND ${p}foto_vendor <> '') AS has_foto_vendor,
    (${p}foto_dalkon IS NOT NULL AND ${p}foto_dalkon <> '') AS has_foto_dalkon`;
}

export function kurvaDocCols(alias = '') {
  const p = alias ? `${alias}.` : '';
  return `${compact(KURVA_DOC_FIELDS, alias)},
    (${p}file_data IS NOT NULL AND ${p}file_data <> '') AS has_file,
    (${p}file_data LIKE 'data:application/pdf%') AS is_pdf`;
}

export function instruksiCols(alias = '') {
  const p = alias ? `${alias}.` : '';
  return `${compact(IK_FIELDS, alias)},
    (${p}file IS NOT NULL AND ${p}file <> '') AS has_file`;
}

export function ikApprovalCols(alias = '') {
  const p = alias ? `${alias}.` : '';
  return `${compact(IK_APPROVAL_FIELDS, alias)},
    (${p}file IS NOT NULL AND ${p}file <> '') AS has_file`;
}

export function amandemenCols(alias = '') {
  const p = alias ? `${alias}.` : '';
  return `${compact(AMANDEMEN_FIELDS, alias)},
    (${p}file IS NOT NULL AND ${p}file <> '') AS has_file`;
}

// Ubah data-URL ("data:mime;base64,...") menjadi buffer. URL eksternal tidak
// cocok dengan pola ini dan diteruskan sebagai redirect oleh sendStoredFile().
export function parseDataUrl(value) {
  const m = /^data:([^;,]*)(;base64)?,([\s\S]*)$/.exec(value || '');
  if (!m) return null;
  const type = m[1] || 'application/octet-stream';
  const buf = m[2]
    ? Buffer.from(m[3], 'base64')
    : Buffer.from(decodeURIComponent(m[3]), 'utf8');
  return { type, buf };
}

// Kirim satu lampiran yang tersimpan di DB. Data-URL dikirim sebagai biner
// (browser tidak perlu mem-parse base64 besar di JSON), URL eksternal
// di-redirect. `res.redirect` tidak disarankan di dalam JSON handler, jadi
// endpoint pemanggil harus mendaftarkannya sebagai route biasa.
export function sendStoredFile(res, value, { filename = 'berkas', inline = true } = {}) {
  if (!value) throw err('Berkas belum tersedia', 404);
  const raw = String(value);
  if (!raw.startsWith('data:')) {
    res.redirect(raw);
    return;
  }
  const parsed = parseDataUrl(raw);
  if (!parsed) throw err('Format berkas tidak dikenali', 422);
  const base = String(filename).replace(/[^\w.-]+/g, '_').slice(0, 80) || 'berkas';
  res.setHeader('Content-Type', parsed.type);
  res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${base}"`);
  res.setHeader('Content-Length', String(parsed.buf.length));
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.end(parsed.buf);
}

export async function getProject(id) {
  const { rows } = await query(`SELECT ${PROJECT_COLS} FROM projects WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function getProjectFull(id) {
  // Semua query dijalankan paralel dalam satu gelombang: dengan pool > 1
  // (transaction pooler) halaman detail hanya menunggu ~1 round-trip DB, bukan
  // 15 query berurutan. Baris proyek sendiri ikut gelombang ini (dulu: satu
  // query terpisah lebih dulu), item BOQ per grup dan approval IK juga
  // digabung supaya tidak ada query susulan.
  const [pr, ms, sc, kn, dk, tb, bq, dw, ik, lk, am, bg, ag, scd, bgi, ap] = await Promise.all([
    query(`SELECT ${PROJECT_COLS} FROM projects WHERE id = $1`, [id]),
    query('SELECT m.*, EXISTS(SELECT 1 FROM boqs b WHERE b.milestone_id = m.id) AS has_boq FROM milestones m WHERE m.project_id = $1 ORDER BY m.urutan, m.id', [id]),
    query('SELECT * FROM s_curves WHERE project_id = $1 ORDER BY urutan, id', [id]),
    query('SELECT * FROM kendalas WHERE project_id = $1 ORDER BY id DESC', [id]),
    query(`SELECT ${dokumentasiCols()} FROM dokumentasis WHERE project_id = $1 ORDER BY id DESC`, [id]),
    query('SELECT * FROM termin_bayars WHERE project_id = $1 ORDER BY urutan, id', [id]),
    query(`SELECT ${boqCols()} FROM boqs WHERE project_id = $1 ORDER BY urutan, id`, [id]),
    query(`SELECT ${drawingCols()} FROM approval_drawings WHERE project_id = $1 ORDER BY id DESC`, [id]),
    query(`SELECT ${instruksiCols()} FROM instruksi_kerja WHERE project_id = $1 ORDER BY id DESC`, [id]),
    query('SELECT * FROM lokasis WHERE project_id = $1 ORDER BY urutan, id', [id]),
    query(`SELECT ${amandemenCols()} FROM amandements WHERE project_id = $1 ORDER BY id DESC`, [id]),
    query('SELECT * FROM boq_groups WHERE project_id = $1 ORDER BY id', [id]),
    query('SELECT * FROM agendas WHERE project_id = $1 ORDER BY tgl_rapat DESC, id DESC', [id]),
    query(`SELECT ${kurvaDocCols()} FROM s_curve_documents WHERE project_id = $1 ORDER BY id DESC`, [id]),
    query(`SELECT ${boqCols('b')} FROM boqs b JOIN boq_groups g ON g.id = b.boq_group_id WHERE g.project_id = $1 ORDER BY b.urutan, b.id`, [id]),
    query(
      `SELECT ${ikApprovalCols('a')} FROM ik_approvals a
       JOIN instruksi_kerja i ON i.id = a.instruksi_id AND i.putaran = a.putaran
       WHERE i.project_id = $1 ORDER BY a.level`,
      [id]
    ),
  ]);
  const proj = pr.rows[0];
  if (!proj) return null;
  const itemsByGroup = new Map();
  for (const item of bgi.rows) {
    const list = itemsByGroup.get(item.boq_group_id);
    if (list) list.push(item);
    else itemsByGroup.set(item.boq_group_id, [item]);
  }
  const boqGroups = bg.rows.map((g) => ({ ...g, items: itemsByGroup.get(g.id) || [] }));
  // Lampirkan approval putaran aktif ke tiap IK (ULTG -> UPT -> Unit Induk).
  let ikRows = ik.rows;
  if (ikRows.length) {
    const byId = new Map();
    for (const a of ap.rows) {
      const list = byId.get(a.instruksi_id);
      if (list) list.push(a);
      else byId.set(a.instruksi_id, [a]);
    }
    ikRows = ikRows.map((r) => ({ ...r, approvals: byId.get(r.id) || [] }));
  }
  return {
    ...proj,
    milestones: ms.rows,
    scurves: sc.rows,
    kendalas: kn.rows,
    dokumentasis: dk.rows,
    terminBayars: tb.rows,
    boqs: bq.rows,
    boqGroups,
    drawings: dw.rows,
    instruksiKerja: ikRows,
    lokasis: lk.rows,
    amandements: am.rows,
    agendas: ag.rows,
    sCurveDocs: scd.rows,
  };
}

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function err(msg, code = 400) {
  const e = new Error(msg);
  e.status = code;
  return e;
}

export function csvEscape(v) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

// Recalculate a milestone's realisasi from its linked BOQ items.
// Realisasi = (Σ volume×harga×progres) / (Σ volume×harga), rounded to 1 decimal.
// Only milestones owning at least one BOQ item with a positive total are
// recalculated; milestones without BOQ items keep their manually-entered value.
// `q` is injectable so in-memory PGlite tests can pass their own query function.
export async function recalcMilestonesFromBoq(projectId, q = query) {
  const { rows } = await q(
    `SELECT milestone_id,
            SUM(COALESCE(b.volume,0) * COALESCE(b.harga_satuan,0))::numeric AS total_val,
            SUM(COALESCE(b.volume,0) * COALESCE(b.harga_satuan,0) * COALESCE(b.progres,0))::numeric AS earned_val
     FROM boqs b
     WHERE b.project_id = $1 AND b.milestone_id IS NOT NULL
     GROUP BY b.milestone_id`,
    [projectId]
  );
  for (const r of rows) {
    const totalVal = Number(r.total_val) || 0;
    const earnedVal = Number(r.earned_val) || 0;
    if (totalVal <= 0) continue;
    const realisasi = Math.round((earnedVal / totalVal) * 10) / 10;
    const status = realisasi >= 100 ? 'Done' : (realisasi > 0 ? 'In Progress' : 'Pending');
    await q(
      'UPDATE milestones SET realisasi = $1, status = $2, updated_at = now() WHERE id = $3',
      [realisasi, status, r.milestone_id]
    );
  }
}

// Bobot item BOQ = (volume x harga_satuan) / total BOQ (sebelum PPN) x 100.
// Dihitung ulang per grup BOQ agar jumlah bobot dalam satu dokumen = 100%.
// `q` is injectable so in-memory PGlite tests can pass their own query function.
export async function recalcBoqBobot(groupId, q = query) {
  await q(
    `UPDATE boqs b SET bobot = COALESCE(
        ROUND(100 * COALESCE(b.volume * b.harga_satuan, 0) / NULLIF(g.agg, 0), 3), 0)
     FROM (SELECT boq_group_id, SUM(COALESCE(volume * harga_satuan, 0)) AS agg
           FROM boqs WHERE boq_group_id = $1 GROUP BY boq_group_id) g
     WHERE b.boq_group_id = $1`,
    [groupId]
  );
}

// Realisasi fisik tertimbang dari BOQ = Σ(bobot x progres) / Σ(bobot).
// Mengembalikan null bila proyek tidak punya bobot BOQ (fallback ke input manual).
export async function boqWeightedRealisasi(projectId, q = query) {
  const { rows } = await q(
    `SELECT SUM(COALESCE(bobot,0) * COALESCE(progres,0))::numeric AS earned,
            SUM(COALESCE(bobot,0))::numeric AS total
     FROM boqs b WHERE b.project_id = $1`,
    [projectId]
  );
  const total = Number(rows[0] && rows[0].total) || 0;
  const earned = Number(rows[0] && rows[0].earned) || 0;
  if (total <= 0) return null;
  return Math.round((earned / total) * 10) / 10;
}

// After an amandemen extends a project's COD, append future monthly plan points
// to the S-curve so the planning timeline reaches 100% by the new COD.
export async function extendSCurveToCod(projectId, days) {
  const projRes = await query('SELECT target_cod FROM projects WHERE id = $1', [projectId]);
  const cod = projRes.rows[0] && projRes.rows[0].target_cod;
  if (!cod) return;
  const maxRes = await query(
    'SELECT COALESCE(MAX(urutan), 0)::int AS m FROM s_curves WHERE project_id = $1',
    [projectId]
  );
  const lastRes = await query(
    'SELECT rencana FROM s_curves WHERE project_id = $1 ORDER BY urutan DESC, id DESC LIMIT 1',
    [projectId]
  );
  const lastRenc = Number(lastRes.rows[0] ? lastRes.rows[0].rencana : 0);
  const totalMonths = Math.max(1, Math.round((Number(days) || 0) / 30));
  const codDate = new Date(`${cod}T00:00:00`);
  let base = maxRes.rows[0].m;
  for (let i = 1; i <= totalMonths; i++) {
    const d = new Date(codDate.getFullYear(), codDate.getMonth() - (totalMonths - i), 1);
    const label = `B-${base + i} (${d.toLocaleString('id-ID', { month: 'short', year: '2-digit' })})`;
    const raw = lastRenc + (100 - lastRenc) * (i / totalMonths);
    const rencana = Math.round((raw < 100 ? raw : 100) * 10) / 10;
    await query(
      `INSERT INTO s_curves (project_id, minggu, rencana, realisasi, pembuat, urutan)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [projectId, label, rencana, null, 'vendor', base + i]
    );
  }
}
