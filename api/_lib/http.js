// Shared HTTP/DB helpers used across route modules.
import { query } from './db.js';

export function pgNum(v) {
  return v === null || v === undefined ? null : Number(v);
}

export async function getProject(id) {
  const { rows } = await query('SELECT * FROM projects WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function getProjectFull(id) {
  const proj = await getProject(id);
  if (!proj) return null;
  const [ms, sc, kn, dk, tb, bq, dw, ik, lk, am, bg] = await Promise.all([
    query('SELECT m.*, EXISTS(SELECT 1 FROM boqs b WHERE b.milestone_id = m.id) AS has_boq FROM milestones m WHERE m.project_id = $1 ORDER BY m.urutan, m.id', [id]),
    query('SELECT * FROM s_curves WHERE project_id = $1 ORDER BY urutan, id', [id]),
    query('SELECT * FROM kendalas WHERE project_id = $1 ORDER BY id DESC', [id]),
    query('SELECT * FROM dokumentasis WHERE project_id = $1 ORDER BY id DESC', [id]),
    query('SELECT * FROM termin_bayars WHERE project_id = $1 ORDER BY urutan, id', [id]),
    query('SELECT * FROM boqs WHERE project_id = $1 ORDER BY urutan, id', [id]),
    query('SELECT * FROM approval_drawings WHERE project_id = $1 ORDER BY id DESC', [id]),
    query('SELECT * FROM instruksi_kerja WHERE project_id = $1 ORDER BY id DESC', [id]),
    query('SELECT * FROM lokasis WHERE project_id = $1 ORDER BY urutan, id', [id]),
    query('SELECT * FROM amandements WHERE project_id = $1 ORDER BY id DESC', [id]),
    query('SELECT * FROM boq_groups WHERE project_id = $1 ORDER BY id', [id]),
  ]);
  const boqGroups = [];
  for (const g of bg.rows) {
    const items = await query('SELECT * FROM boqs WHERE boq_group_id = $1 ORDER BY urutan, id', [g.id]);
    boqGroups.push({ ...g, items: items.rows });
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
    instruksiKerja: ik.rows,
    lokasis: lk.rows,
    amandements: am.rows,
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
