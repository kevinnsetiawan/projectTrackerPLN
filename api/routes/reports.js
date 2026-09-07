import { Router } from 'express';
import { query } from '../_lib/db.js';
import { ALL_TIPE, ALL_UIP, STATUS_BADGE, CSV_HEADERS, isoDate } from '../_lib/business.js';
import { asyncHandler, csvEscape, pgNum } from '../_lib/http.js';

const router = Router();

router.get('/reports', asyncHandler(async (req, res) => {
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

router.get('/reports/export-csv', asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM projects ORDER BY kode');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  const date = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Disposition', `attachment; filename="PLN_ProTrack_Laporan_Konstruksi_${date}.csv"`);
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

export default router;
