import { Router } from 'express';
import { query } from '../_lib/db.js';
import { verifyToken } from '../_lib/auth.js';
import { attachClient, clientCount } from '../_lib/events.js';
import { asyncHandler } from '../_lib/http.js';

const router = Router();

// Tabel yang dipantau untuk versi data (dipakai jaring pengaman polling).
const TABLES = [
  'projects', 'milestones', 's_curves', 'kendalas', 'dokumentasis',
  'termin_bayars', 's_curve_documents', 'boqs', 'boq_groups',
  'approval_drawings', 'instruksi_kerja', 'amandements', 'agendas', 'users',
];

// EventSource tidak bisa mengirim header Authorization, jadi token juga diterima
// lewat query string (?token=...). Header tetap diprioritaskan.
function liveUser(req) {
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
  const token = bearer || (req.query && req.query.token) || null;
  const user = token ? verifyToken(String(token)) : null;
  return user || null;
}

// Stream realtime: kirim event "change" setiap ada mutasi di modul mana pun.
// Payload hanya { topic, project_id } — klien melakukan refresh sendiri.
router.get('/events/stream', (req, res) => {
  const user = liveUser(req);
  if (!user) {
    res.status(401).json({ error: 'Login diperlukan.' });
    return;
  }
  const raw = String(req.query.topics || '').split(',').map((s) => s.trim()).filter(Boolean);
  attachClient(req, res, user, raw.length ? new Set(raw) : null);
});

// Jumlah klien realtime aktif (berguna untuk debug / status).
router.get('/events/peers', asyncHandler(async (req, res) => {
  res.json({ peers: clientCount() });
}));

// Revisi data per tabel — jaring pengaman bila stream SSE terputus: klien
// membandingkan hash tiap tabel; yang berubah memicu refresh (payload kecil).
router.get('/events/rev', asyncHandler(async (req, res) => {
  const union = TABLES.map((t) => `SELECT '${t}' AS t, COUNT(*)::int AS c, MAX(updated_at) AS u FROM ${t}`).join(' UNION ALL ');
  const { rows } = await query(`${union} ORDER BY t`);
  const tables = {};
  for (const r of rows) {
    tables[r.t] = `${r.c}:${r.u ? new Date(r.u).getTime() : 0}`;
  }
  res.json({ tables, peers: clientCount() });
}));

export default router;