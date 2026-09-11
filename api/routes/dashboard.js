import { Router } from 'express';
import { query } from '../_lib/db.js';
import { asyncHandler } from '../_lib/http.js';
import { pgNum } from '../_lib/http.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM projects');
  const totalProjects = rows.length;
  const statusCounts = { 'In Progress': 0, 'BAST 1': 0, 'BAST 2': 0, BASTB: 0 };
  for (const p of rows) statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;

  // Akumulasi progres bayar per proyek (Σ nominal termin yang sudah Terbayar).
  const { rows: payRows } = await query(
    `SELECT project_id, COALESCE(SUM(nominal), 0)::numeric AS paid
     FROM termin_bayars WHERE status = 'Terbayar' GROUP BY project_id`
  );
  const payMap = new Map(payRows.map((r) => [r.project_id, Number(r.paid) || 0]));

  const enrichPay = (p) => {
    const paid = payMap.get(p.id) || 0;
    const nilai = pgNum(p.nilai_kontrak);
    return {
      ...p,
      totalBayarRp: paid,
      progresTerbayarPct: nilai ? Math.round((paid / nilai) * 1000) / 10 : 0,
    };
  };
  const enriched = rows.map(enrichPay);

  const avgRencana = rows.length ? rows.reduce((s, p) => s + pgNum(p.progres_rencana), 0) / rows.length : 0;
  const avgRealisasi = rows.length ? rows.reduce((s, p) => s + pgNum(p.progres_realisasi), 0) / rows.length : 0;
  const avgDeviasi = avgRealisasi - avgRencana;
  const totalNilaiKontrak = rows.reduce((s, p) => s + pgNum(p.nilai_kontrak), 0);
  const totalPenyerapanRp = rows.reduce((s, p) => s + pgNum(p.nilai_kontrak) * (pgNum(p.penyerapan_anggaran) || 0) / 100, 0);
  const avgPenyerapanPersen = totalNilaiKontrak ? Math.round((totalPenyerapanRp / totalNilaiKontrak) * 1000) / 10 : 0;
  const totalTerbayarRp = enriched.reduce((s, p) => s + p.totalBayarRp, 0);
  const avgProgresTerbayar = totalNilaiKontrak ? Math.round((totalTerbayarRp / totalNilaiKontrak) * 1000) / 10 : 0;

  const { rows: knRows } = await query(`SELECT * FROM kendalas WHERE status != 'Resolved'`);
  const openKendalas = knRows.length;

  const criticalProjects = enriched.filter((p) => pgNum(p.deviasi) < -5);
  const recentProjects = [...enriched].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 5);

  const uipCounts = {};
  const tipeCounts = {};
  for (const p of rows) {
    uipCounts[p.uip] = (uipCounts[p.uip] || 0) + 1;
    tipeCounts[p.tipe] = (tipeCounts[p.tipe] || 0) + 1;
  }

  const { rows: scRows } = await query(
    'SELECT project_id, minggu, rencana, realisasi, urutan FROM s_curves ORDER BY urutan, id'
  );
  const byUrutan = {};
  const urutanOrder = [];
  for (const s of scRows) {
    if (!byUrutan[s.urutan]) {
      byUrutan[s.urutan] = { rencana: [], realisasi: [], minggu: s.minggu };
      urutanOrder.push(s.urutan);
    }
    byUrutan[s.urutan].rencana.push(pgNum(s.rencana));
    if (pgNum(s.realisasi) !== null && s.realisasi !== null) {
      byUrutan[s.urutan].realisasi.push(pgNum(s.realisasi));
    }
  }
  urutanOrder.sort((a, b) => a - b);
  const safeNum = (arr) => {
    if (!arr.length) return null;
    const r = arr.reduce((s, v) => s + v, 0) / arr.length;
    return Math.round(r * 10) / 10;
  };
  const portfolioSCurve = {
    labels: urutanOrder.map((u) => byUrutan[u].minggu),
    rencana: urutanOrder.map((u) => safeNum(byUrutan[u].rencana)),
    realisasi: urutanOrder.map((u) => safeNum(byUrutan[u].realisasi)),
  };

  res.json({
    totalProjects,
    inProgressCount: statusCounts['In Progress'] || 0,
    statusCounts,
    avgRencana: Math.round(avgRencana * 10) / 10,
    avgRealisasi: Math.round(avgRealisasi * 10) / 10,
    avgDeviasi: Math.round(avgDeviasi * 10) / 10,
    totalNilaiKontrak,
    totalPenyerapanRp,
    avgPenyerapanPersen,
    totalTerbayarRp,
    avgProgresTerbayar,
    openKendalas,
    criticalProjects,
    recentProjects,
    uipCounts,
    tipeCounts,
    portfolioSCurve,
  });
}));

export default router;
