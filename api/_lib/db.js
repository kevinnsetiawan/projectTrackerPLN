import { Pool } from 'pg';

// Dual-driver database layer.
// - Default (Vercel / zero-config): in-memory PGlite — no external DB needed.
// - Local dev with DB_DRIVER=pglite: in-memory PGlite.
// - Local dev with DB_DRIVER=postgres: PostgreSQL via DATABASE_URL.
//
// Both expose: query(text, params) -> Promise<{ rows }>

let pgPool;
let gliteP;
let driverInit = false;
let driver;
let explicitDriver = false;

function getDriver() {
  if (!driverInit) {
    driver = process.env.DB_DRIVER || 'pglite';
    explicitDriver = Boolean(process.env.DB_DRIVER);
    driverInit = true;
  }
  return driver;
}

function getPgPool() {
  if (!pgPool) {
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pgPool;
}

// Lazy-load PGlite so it is never bundled into the Vercel (production) function.
async function getPGlite() {
  if (!gliteP) {
    const { PGlite } = await import('@electric-sql/pglite');
    const glite = new PGlite();
    const { DDL } = await import('./schema.js');
    for (const stmt of DDL.split(';').map((s) => s.trim()).filter(Boolean)) {
      await glite.query(stmt);
    }
    // Auto-seed on cold start only for the default (zero-config) driver,
    // i.e. Vercel. When DB_DRIVER is set explicitly (local dev/tests), the
    // caller's own seeder runs instead.
    if (!explicitDriver) {
      const { rows } = await glite.query('SELECT COUNT(*)::int AS cnt FROM projects');
      if (rows[0].cnt === 0) {
        await autoSeed(glite);
      }
    }
    gliteP = glite;
  }
  return gliteP;
}

// Seed the 8 demo projects + 4 demo users into a fresh PGlite instance.
async function autoSeed(glite) {
  const { SEED } = await import('./seedData.js');
  const { hashPassword } = await import('./auth.js');
  const q = (text, params) => glite.query(text, params);

  // --- Demo users (credentials from env or hard-coded fallbacks for Vercel) ---
  const demoUsers = [
    { nama: 'Admin Pro-Track', email: process.env.DEMO_ADMIN_EMAIL || 'admin@pln.local', password: process.env.DEMO_ADMIN_PASS || 'admin123', role: 'admin' },
    { nama: 'Kontraktor Vendor', email: process.env.DEMO_VENDOR_EMAIL || 'vendor@pln.local', password: process.env.DEMO_VENDOR_PASS || 'vendor123', role: 'vendor' },
    { nama: 'Dalkon UIP', email: process.env.DEMO_DALKON_EMAIL || 'dalkon@pln.local', password: process.env.DEMO_DALKON_PASS || 'dalkon123', role: 'dalkon' },
    { nama: 'Tim Engineering', email: process.env.DEMO_ENJIN_EMAIL || 'enjin@pln.local', password: process.env.DEMO_ENJIN_PASS || 'enjin123', role: 'enjin' },
  ];
  for (const u of demoUsers) {
    await q(
      'INSERT INTO users (nama, email, password_hash, role) VALUES ($1,$2,$3,$4) ON CONFLICT (email) DO NOTHING',
      [u.nama, u.email, hashPassword(u.password), u.role]
    );
  }

  for (const p of SEED) {
    const { milestones, scurves, kendalas, dokumentasis, terminBayars, lokasis, amandements, boqs, agendas, ...proj } = p;
    const cols = Object.keys(proj).filter((c) => c !== 'id');
    const vals = cols.map((c) => proj[c]);
    const ph = cols.map((_, i) => `$${i + 1}`).join(', ');
    const { rows: projRows } = await q(
      `INSERT INTO projects (${cols.join(', ')}) VALUES (${ph}) RETURNING id`,
      vals
    );
    const projectId = projRows[0].id;

    for (const [i, l] of (lokasis || []).entries()) {
      await q(
        'INSERT INTO lokasis (project_id, nama, latitude, longitude, urutan) VALUES ($1,$2,$3,$4,$5)',
        [projectId, l.nama, l.latitude ?? null, l.longitude ?? null, l.urutan ?? i + 1]
      );
    }

    for (const m of milestones) {
      await q(
        'INSERT INTO milestones (project_id, nama, bobot, rencana, realisasi, status, urutan) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [projectId, m.nama, m.bobot, m.rencana, m.realisasi, m.status, m.urutan]
      );
    }

    let boqGroupId = null;
    if ((boqs || []).length) {
      const grp = await q('INSERT INTO boq_groups (project_id, nama) VALUES ($1,$2) RETURNING id', [projectId, 'BOQ Kontrak']);
      boqGroupId = grp.rows[0].id;
    }
    for (const b of (boqs || [])) {
      const mId = b.milestone_urutan != null
        ? (await q('SELECT id FROM milestones WHERE project_id=$1 AND urutan=$2', [projectId, b.milestone_urutan])).rows[0].id
        : null;
      await q(
        'INSERT INTO boqs (project_id, boq_group_id, uraian, satuan, volume, harga_satuan, total, progres, milestone_id, urutan) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
        [projectId, boqGroupId, b.uraian, b.satuan ?? null, b.volume ?? null, b.harga_satuan ?? null,
          b.volume != null && b.harga_satuan != null ? Math.round(b.volume * b.harga_satuan * 100) / 100 : null,
          b.progres ?? 0, mId, b.urutan ?? (boqs.indexOf(b) + 1)]
      );
    }

    for (const s of scurves) {
      await q(
        'INSERT INTO s_curves (project_id, minggu, rencana, realisasi, pembuat, urutan) VALUES ($1,$2,$3,$4,$5,$6)',
        [projectId, s.minggu, s.rencana, s.realisasi ?? null, s.pembuat ?? null, s.urutan]
      );
    }
    for (const k of kendalas) {
      await q(
        'INSERT INTO kendalas (project_id, kode_kendala, kategori, deskripsi, dampak, tindakan_mitigasi, status, tgl_lapor, tgl_selesai, pelapor) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
        [projectId, k.kode_kendala, k.kategori, k.deskripsi, k.dampak ?? null, k.tindakan_mitigasi ?? null, k.status, k.tgl_lapor ?? null, k.tgl_selesai ?? null, k.pelapor ?? 'Dalkon']
      );
    }
    for (const d of dokumentasis) {
      await q(
        'INSERT INTO dokumentasis (project_id, judul, tahap, foto, tgl, keterangan) VALUES ($1,$2,$3,$4,$5,$6)',
        [projectId, d.judul, d.tahap ?? null, d.foto, d.tgl ?? null, d.keterangan ?? null]
      );
    }
    for (const [i, t] of (terminBayars || []).entries()) {
      await q(
        'INSERT INTO termin_bayars (project_id, nama, nominal, bobot, progres_fisik, status, tgl_bayar, urutan) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [projectId, t.nama, t.nominal, t.bobot, t.progres_fisik ?? 0, t.status, t.tgl_bayar ?? null, i + 1]
      );
    }
    for (const a of (amandements || [])) {
      await q(
        'INSERT INTO amandements (project_id, nomor, jenis, keterangan, file, durasi_hari, target_cod_lama, target_cod_baru, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [projectId, a.nomor ?? null, a.jenis ?? 'Perpanjangan Waktu', a.keterangan ?? null, a.file ?? null, a.durasi_hari ?? 0, a.target_cod_lama ?? null, a.target_cod_baru ?? null, a.created_by ?? null]
      );
    }
    for (const ag of (agendas || [])) {
      await q(
        'INSERT INTO agendas (project_id, judul, tgl_rapat, jam_rapat, lokasi, link_video, peserta, topik, hasil, status_surat, nomor_surat, reminder_hari, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
        [projectId, ag.judul, ag.tgl_rapat, ag.jam_rapat ?? null, ag.lokasi ?? null, ag.link_video ?? null, ag.peserta ?? null, ag.topik ?? null, ag.hasil ?? null, ag.status_surat ?? 'Belum Dibuat', ag.nomor_surat ?? null, ag.reminder_hari ?? 1, ag.status ?? 'Terjadwal']
      );
    }
    // Recalculate milestones from BOQ
    if ((boqs || []).length) {
      const { rows: mr } = await q(
        `SELECT milestone_id,
                SUM(COALESCE(b.volume,0)*COALESCE(b.harga_satuan,0))::numeric AS total_val,
                SUM(COALESCE(b.volume,0)*COALESCE(b.harga_satuan,0)*COALESCE(b.progres,0))::numeric AS earned_val
         FROM boqs b WHERE b.project_id=$1 AND b.milestone_id IS NOT NULL GROUP BY b.milestone_id`,
        [projectId]
      );
      for (const r of mr) {
        const totalVal = Number(r.total_val) || 0;
        const earnedVal = Number(r.earned_val) || 0;
        if (totalVal <= 0) continue;
        const realisasi = Math.round((earnedVal / totalVal) * 10) / 10;
        const status = realisasi >= 100 ? 'Done' : (realisasi > 0 ? 'In Progress' : 'Pending');
        await q('UPDATE milestones SET realisasi=$1, status=$2, updated_at=now() WHERE id=$3', [realisasi, status, r.milestone_id]);
      }
      // Recalculate bobot per BOQ group
      if (boqGroupId) {
        await q(
          `UPDATE boqs b SET bobot = COALESCE(
              ROUND(100 * COALESCE(b.volume * b.harga_satuan, 0) / NULLIF(g.agg, 0), 3), 0)
           FROM (SELECT boq_group_id, SUM(COALESCE(volume * harga_satuan, 0)) AS agg
                 FROM boqs WHERE boq_group_id = $1 GROUP BY boq_group_id) g
           WHERE b.boq_group_id = $1`,
          [boqGroupId]
        );
      }
    }

    // Seed sample approval drawings & instruksi kerja for first project
    if (projectId === 1) {
      for (const ik of [
        { judul: 'SPK Pembangunan GI Serpong II', nomor_instruksi: 'IK/2024/UIP-JBB/08-001', jenis: 'Surat Perintah Kerja (SPK)', keterangan: 'Instruksi kerja awal untuk pelaksanaan pekerjaan konstruksi GI 150 kV.', tgl: '2024-05-15' },
        { judul: 'Instruksi Kerja Pekerjaan Sipil & Pondasi', nomor_instruksi: 'IK/2024/UIP-JBB/08-002', jenis: 'Instruksi Kerja', keterangan: 'Metode pelaksanaan pekerjaan sipil dan pondasi gardu induk.', tgl: '2024-06-10' },
      ]) {
        await q(
          `INSERT INTO instruksi_kerja (project_id, judul, nomor_instruksi, jenis, file, keterangan, tgl) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [projectId, ik.judul, ik.nomor_instruksi, ik.jenis, 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', ik.keterangan, ik.tgl]
        );
      }
      for (const dwg of [
        { judul: 'DWG-GI-150-001 Single Line Diagram & Layout Switchyard', nomor_drawing: 'DWG/2024/SRP/001', kategori: 'Elektromekanikal', status_approval: 'Approved', enjin_review_status: 'Approved', catatan_enjin: 'Disetujui penuh.' },
        { judul: 'DWG-GI-150-002 Desain Pondasi Transformer Daya 60 MVA', nomor_drawing: 'DWG/2024/SRP/002', kategori: 'Sipil & Konstruksi', status_approval: 'Dalam Review Engineering', enjin_review_status: 'In Review', catatan_enjin: 'Proses review berjalan.' },
        { judul: 'DWG-GI-150-003 Skema Proteksi & Interlocking Bay Line 150 kV', nomor_drawing: 'DWG/2024/SRP/003', kategori: 'Proteksi & Kontrol', status_approval: 'Menunggu Kirim Hardfile', enjin_review_status: 'Pending', catatan_enjin: null },
      ]) {
        await q(
          `INSERT INTO approval_drawings (project_id, judul, nomor_drawing, kategori, file_vendor, status_approval, enjin_review_status, catatan_enjin) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [projectId, dwg.judul, dwg.nomor_drawing, dwg.kategori, 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', dwg.status_approval, dwg.enjin_review_status, dwg.catatan_enjin]
        );
      }
    }
  }
  console.log(`Auto-seeded ${SEED.length} projects.`);
}

export function getPool() {
  if (getDriver() === 'pglite') {
    return { query: async (text, params) => (await getPGlite()).query(text, params) };
  }
  return getPgPool();
}

export async function query(text, params) {
  if (getDriver() === 'pglite') {
    return (await getPGlite()).query(text, params);
  }
  return getPgPool().query(text, params);
}