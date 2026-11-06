import { Router } from 'express';
import { query } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';
import { giScope, getCapabilities } from '../_lib/scope.js';
import { asyncHandler, err, requireCapabilityOrEmptyScope } from '../_lib/http.js';

const router = Router();
const requireGarduRead = (req, res, next) => {
  const caps = getCapabilities(req);
  if (caps.gardu_induk_read || caps.unit_manage) return next();
  return res.status(403).json({ error: 'Akses ditolak.' });
};
const requireGarduListRead = (req, res, next) => {
  if (getCapabilities(req).unit_manage) return next();
  return requireCapabilityOrEmptyScope('gardu_induk_read')(req, res, next);
};
const requireGarduDetailRead = (req, res, next) => {
  // Preserve opaque 404 for an ordinary authenticated request without unit
  // context; the scoped query still returns no row. Root remains strict here.
  if (req.context?.mode === 'none' && !req.user?.is_superadmin) return next();
  return requireGarduRead(req, res, next);
};

const requireProjectLookup = (req, res, next) => {
  const caps = getCapabilities(req);
  if (caps.project_write && req.context?.mode === 'unit' && req.context.unit?.kind === 'upt') return next();
  return res.status(403).json({ error: 'Akses referensi proyek ditolak.' });
};

router.get('/gardu-induk/options', requireAuth, requireProjectLookup, asyncHandler(async (req, res) => {
  const { rows } = await query(
    'SELECT id,nama,unit_id FROM gardu_induk WHERE unit_id=$1 AND active=true ORDER BY nama,id',
    [req.context.unit_id]
  );
  res.json({ data: rows });
}));
const COLS = `g.id,g.source_system,g.source_id,g.unit_id,g.nama,g.latitude,g.longitude,
  g.map_source_url,g.source_ultg_id,g.active,u.name AS unit_name,u.code AS unit_code`;

router.get('/gardu-induk', requireAuth, requireGarduListRead, asyncHandler(async (req, res) => {
  const scope = giScope(req, 'g');
  const conditions = [scope.sql];
  const params = [...scope.params];
  const { include_inactive, unit_id, search } = req.query;
  if (include_inactive !== undefined && !['0','1'].includes(include_inactive)) throw err('Filter status GI tidak valid');
  if (include_inactive !== '1') conditions.push('g.active=true');
  if (unit_id !== undefined) {
    if (typeof unit_id !== 'string' || !/^[1-9]\d*$/.test(unit_id) || !Number.isSafeInteger(Number(unit_id))) throw err('Filter UPT tidak valid');
    params.push(Number(unit_id));
    conditions.push(`g.unit_id=$${params.length}`);
  }
  if (search !== undefined) {
    if (typeof search !== 'string') throw err('Pencarian GI tidak valid');
    params.push(`%${search}%`);
    conditions.push(`g.nama ILIKE $${params.length}`);
  }
  const { rows } = await query(`SELECT ${COLS} FROM gardu_induk g JOIN units u ON u.id=g.unit_id
    WHERE ${conditions.map(s => `(${s})`).join(' AND ')} ORDER BY u.name,g.nama,g.id`, params);
  res.json({ data: rows });
}));

router.get('/gardu-induk/:id', requireAuth, requireGarduDetailRead, asyncHandler(async (req, res) => {
  if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(Number(req.params.id))) throw err('ID Gardu Induk tidak valid');
  const scope = giScope(req, 'g', 2);
  const { rows } = await query(`SELECT ${COLS} FROM gardu_induk g JOIN units u ON u.id=g.unit_id
    WHERE g.id=$1 AND (${scope.sql})`, [Number(req.params.id), ...scope.params]);
  if (!rows.length) throw err('Gardu Induk tidak ditemukan', 404);
  res.json(rows[0]);
}));

export default router;
