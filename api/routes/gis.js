import { Router } from 'express';
import { query } from '../_lib/db.js';
import { fmtDate } from '../_lib/business.js';
import { asyncHandler, pgNum } from '../_lib/http.js';

const router = Router();

router.get('/gis/projects', asyncHandler(async (req, res) => {
  const { uip, tipe, status } = req.query;
  const conditions = ['l.latitude IS NOT NULL', 'l.longitude IS NOT NULL'];
  const params = [];
  let i = 1;
  if (uip && uip !== 'all') { params.push(uip); conditions.push(`p.uip = $${i}`); i++; }
  if (tipe && tipe !== 'all') { params.push(tipe); conditions.push(`p.tipe = $${i}`); i++; }
  if (status && status !== 'all') { params.push(status); conditions.push(`p.status = $${i}`); i++; }
  const where = 'WHERE ' + conditions.join(' AND ');
  const { rows } = await query(
    `SELECT p.id, p.kode, p.nama, p.tipe, p.tegangan, p.uip, p.upp, p.status,
            p.progres_rencana, p.progres_realisasi, p.deviasi, p.target_cod,
            l.id AS loid, l.nama AS lokasi, l.latitude, l.longitude
     FROM lokasis l JOIN projects p ON p.id = l.project_id ${where}
     ORDER BY p.kode, l.urutan`,
    params
  );
  const data = rows.map((r) => ({
    markerId: `proj-${r.id}-${r.loid}`, id: r.id, kode: r.kode, nama: r.nama, tipe: r.tipe, tegangan: r.tegangan,
    uip: r.uip, upp: r.upp, lokasi: r.lokasi, lat: pgNum(r.latitude), lng: pgNum(r.longitude),
    status: r.status, progres_rencana: pgNum(r.progres_rencana), progres_realisasi: pgNum(r.progres_realisasi),
    deviasi: pgNum(r.deviasi), target_cod: fmtDate(r.target_cod), url: `/projects/${r.id}`,
  }));
  res.json(data);
}));

export default router;
