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
  const [ms, sc, kn, dk, tb, bq, dw, ik, lk, am] = await Promise.all([
    query('SELECT * FROM milestones WHERE project_id = $1 ORDER BY urutan, id', [id]),
    query('SELECT * FROM s_curves WHERE project_id = $1 ORDER BY urutan, id', [id]),
    query('SELECT * FROM kendalas WHERE project_id = $1 ORDER BY id DESC', [id]),
    query('SELECT * FROM dokumentasis WHERE project_id = $1 ORDER BY id DESC', [id]),
    query('SELECT * FROM termin_bayars WHERE project_id = $1 ORDER BY urutan, id', [id]),
    query('SELECT * FROM boqs WHERE project_id = $1 ORDER BY urutan, id', [id]),
    query('SELECT * FROM approval_drawings WHERE project_id = $1 ORDER BY id DESC', [id]),
    query('SELECT * FROM instruksi_kerja WHERE project_id = $1 ORDER BY id DESC', [id]),
    query('SELECT * FROM lokasis WHERE project_id = $1 ORDER BY urutan, id', [id]),
    query('SELECT * FROM amandements WHERE project_id = $1 ORDER BY id DESC', [id]),
  ]);
  return {
    ...proj,
    milestones: ms.rows,
    scurves: sc.rows,
    kendalas: kn.rows,
    dokumentasis: dk.rows,
    terminBayars: tb.rows,
    boqs: bq.rows,
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
