import React, { useEffect, useState } from 'react';
import { getReports } from '../api.js';
import { formatNilaiKontrak, fmtDate, tipeShort, uipShort } from '../utils.js';

const dl = (v) => (Number(v) || 0).toLocaleString('id-ID');

export default function ReportsPrint() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    getReports().then(setData).catch((e) => setErr(e.message));
  }, []);

  useEffect(() => {
    if (data) setTimeout(() => window.print(), 400);
  }, [data]);

  if (err) return <div className="p-8 text-red-600">{err}</div>;
  if (!data) return <div className="p-8">Memuat laporan...</div>;

  const rows = data.data || [];
  const totalNilai = rows.reduce((s, p) => s + (Number(p.nilai_kontrak) || 0), 0);

  return (
    <div id="report-print" className="bg-white text-slate-900 p-8">
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        #report-print table { width: 100%; border-collapse: collapse; font-size: 11px; }
        #report-print th, #report-print td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
        #report-print th { background: #e2e8f0 !important; }
      `}</style>

      <div className="no-print flex justify-end mb-4">
        <button onClick={() => window.print()} className="bg-pln-blue text-white rounded-lg px-4 py-2 text-sm font-bold">
          Cetak / Simpan PDF
        </button>
      </div>

      <div className="text-center mb-6">
        <div className="text-2xl font-extrabold tracking-tight">PLN Pro-Track</div>
        <div className="text-sm mt-1">Laporan Rekapitulasi Progres Konstruksi</div>
        <div className="text-xs text-slate-500 mt-1">Dicetak: {new Date().toLocaleString('id-ID')}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Kode</th>
            <th>Nama Proyek</th>
            <th>Tipe</th>
            <th>UIP</th>
            <th>Kontraktor</th>
            <th>Status</th>
            <th>Rencana</th>
            <th>Realisasi</th>
            <th>Deviasi</th>
            <th>Nilai Kontrak</th>
            <th>Target COD</th>
          </tr>
        </thead>
        <tbody>
          {(rows || []).map((p, i) => (
            <tr key={p.id}>
              <td>{i + 1}</td>
              <td className="font-mono font-bold whitespace-nowrap">{p.kode}</td>
              <td>{p.nama}</td>
              <td>{tipeShort(p.tipe)}</td>
              <td>{uipShort(p.uip)}</td>
              <td>{p.kontraktor}</td>
              <td>{p.status}</td>
              <td>{dl(p.progres_rencana)}%</td>
              <td>{dl(p.progres_realisasi)}%</td>
              <td>{dl(p.deviasi)}%</td>
              <td className="whitespace-nowrap">{formatNilaiKontrak(p.nilai_kontrak)}</td>
              <td>{fmtDate(p.target_cod)}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={10} className="text-right font-bold">Total Nilai Kontrak</td>
            <td className="font-bold whitespace-nowrap">{formatNilaiKontrak(totalNilai)}</td>
            <td />
          </tr>
          <tr>
            <td colSpan={10} className="text-right font-bold">Jumlah Proyek</td>
            <td className="font-bold">{(rows || []).length}</td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}