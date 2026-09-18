import { Router } from 'express';
import ExcelJS from 'exceljs';
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

router.get('/reports/export-excel', asyncHandler(async (req, res) => {
  const { uip, tipe, status } = req.query;
  const conditions = [];
  const params = [];
  let i = 1;
  if (uip && uip !== 'all') { params.push(uip); conditions.push(`uip = $${i}`); i++; }
  if (tipe && tipe !== 'all') { params.push(tipe); conditions.push(`tipe = $${i}`); i++; }
  if (status && status !== 'all') { params.push(status); conditions.push(`status = $${i}`); i++; }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const { rows } = await query(`SELECT * FROM projects ${where} ORDER BY kode`, params);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PLN Pro-Track';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Laporan Konstruksi', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
  });

  sheet.columns = CSV_HEADERS.map((h) => ({ header: h, key: h, width: h.length > 24 ? 28 : Math.max(14, h.length) }));
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B2E59' } };
  sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  for (const r of rows) {
    sheet.addRow({
      'ID Proyek': r.id,
      'Kode': r.kode,
      'Nama Proyek': r.nama,
      'Tipe': r.tipe,
      'Tegangan': r.tegangan,
      'UIP': r.uip,
      'UPP': r.upp || '',
      'Lokasi': r.lokasi,
      'Kontraktor': r.kontraktor,
      'Nomor Kontrak': r.nomor_kontrak || '',
      'Nilai Kontrak (Rp)': Number(r.nilai_kontrak),
      'Tgl Mulai': isoDate(r.tgl_mulai) || '',
      'Target COD': isoDate(r.target_cod) || '',
      'Status': r.status,
      'Progres Rencana (%)': pgNum(r.progres_rencana),
      'Progres Realisasi (%)': pgNum(r.progres_realisasi),
      'Deviasi (%)': pgNum(r.deviasi),
      'Penyerapan Anggaran (%)': pgNum(r.penyerapan_anggaran),
    });
  }

  sheet.getColumn('Nilai Kontrak (Rp)').numFmt = '#,##0';
  ['Progres Rencana (%)', 'Progres Realisasi (%)', 'Deviasi (%)', 'Penyerapan Anggaran (%)'].forEach((col) => {
    sheet.getColumn(col).numFmt = '0.0';
  });
  sheet.eachRow((row, rowNum) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      if (rowNum > 1) cell.alignment = { vertical: 'middle', wrapText: true };
    });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  const date = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Disposition', `attachment; filename="PLN_ProTrack_Laporan_Konstruksi_${date}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}));

export default router;
