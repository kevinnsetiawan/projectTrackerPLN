import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileBarChart, Download, FileText } from 'lucide-react';
import { getReports, exportCsvUrl } from '../api.js';
import { setPageTitle } from '../components/Layout.jsx';
import { Card, StatusBadge, DevChip, PageHeader, Spinner, Empty, inputCls } from '../components/ui.jsx';
import { nilaiMilyar, fmtDate, tipeShort, uipShort } from '../utils.js';

export default function ReportsIndex() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [filters, setFilters] = useState({ uip: 'all', tipe: 'all', status: 'all' });

  useEffect(() => {
    setPageTitle('Laporan Eksekutif');
    const qs = new URLSearchParams(filters).toString();
    getReports(Object.fromEntries(new URLSearchParams(qs))).then(setData).catch((e) => setErr(e.message));
  }, [filters]);

  function setFilter(k, v) { setFilters((f) => ({ ...f, [k]: v })); }

  if (err) return <div className="text-red-600 bg-red-50 p-4 rounded-lg">{err}</div>;
  if (!data) return <Spinner show />;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Pusat Laporan &amp; Rekapitulasi" subtitle="Cetak dan ekspor laporan progres konstruksi" />

      <div className="grid md:grid-cols-2 gap-4 mb-5">
        <Card className="p-5 flex items-center gap-4 hover:shadow-pln-hover transition">
          <div className="w-12 h-12 rounded-xl bg-pln-brand flex items-center justify-center shrink-0">
            <FileBarChart className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-pln-navy">Rekapitulasi Portofolio</div>
            <div className="text-xs text-slate-500">Cetak format PDF &amp; unduh rekap seluruh proyek</div>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4 hover:shadow-pln-hover transition">
          <div className="w-12 h-12 rounded-xl bg-pln-green/10 flex items-center justify-center shrink-0">
            <Download className="w-6 h-6 text-pln-green" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-pln-navy">Ekspor Spreadsheet (.CSV)</div>
            <div className="text-xs text-slate-500">Unduh data seluruh proyek ke Excel</div>
          </div>
          <a href={exportCsvUrl()} className="text-sm font-bold text-pln-green border border-pln-green/40 rounded-lg px-3 py-2 hover:bg-pln-green hover:text-white transition">Unduh</a>
        </Card>
      </div>

      <Card className="p-4 mb-5">
        <div className="grid md:grid-cols-3 gap-3">
          <select className={inputCls} value={filters.uip} onChange={(e) => setFilter('uip', e.target.value)}>
            <option value="all">Semua Unit Induk</option>
            {data.allUip.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          <select className={inputCls} value={filters.tipe} onChange={(e) => setFilter('tipe', e.target.value)}>
            <option value="all">Semua Tipe</option>
            {data.allTipe.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className={inputCls} value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="all">Semua Status</option>
            {data.allStatus.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 font-bold text-pln-navy">Daftar Proyek ({data.data.length})</div>
        {data.data.length === 0 ? <Empty /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Kode &amp; Nama Proyek</th>
                  <th className="px-5 py-3">Unit Induk</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Progres</th>
                  <th className="px-5 py-3">Nilai Kontrak</th>
                  <th className="px-5 py-3 text-right">Opsi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.data.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="font-mono text-xs font-bold text-pln-blue">{p.kode}</div>
                      <div className="text-xs text-slate-600 line-clamp-1">{p.nama}</div>
                    </td>
                    <td className="px-5 py-3 text-xs">{uipShort(p.uip)}</td>
                    <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">{p.progres_realisasi}%</span>
                        <DevChip dev={p.deviasi} />
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs">{nilaiMilyar(p.nilai_kontrak)}</td>
                    <td className="px-5 py-3 text-right">
                      <Link to={`/projects/${p.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-pln-blue hover:underline">
                        <FileText className="w-3.5 h-3.5" /> Cetak
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}