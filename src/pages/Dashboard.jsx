import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Line, Doughnut, Bar,
} from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import {
  FolderKanban, Percent, Gauge, Wallet, Coins, AlertTriangle,
} from 'lucide-react';
import { getDashboard } from '../api.js';
import { setPageTitle } from '../components/Layout.jsx';
import { Card, StatCard, StatusBadge, ProgressBar, DevChip, PageHeader, Spinner } from '../components/ui.jsx';
import { nilaiMilyar, fmtDate, tipeShort, uipShort } from '../utils.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    setPageTitle('Dashboard KPI');
    getDashboard().then(setData).catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="text-red-600 bg-red-50 p-4 rounded-lg">{err}</div>;
  if (!data) return <Spinner show />;

  const {
    totalProjects, inProgressCount, statusCounts, avgRencana, avgRealisasi, avgDeviasi,
    totalNilaiKontrak, totalPenyerapanRp, avgPenyerapanPersen, openKendalas,
    criticalProjects, recentProjects, uipCounts, tipeCounts, portfolioSCurve,
  } = data;

  const devCls = avgDeviasi < 0 ? 'text-red-600' : 'text-emerald-600';
  const devLabel = avgDeviasi < 0 ? 'Terlambat / Delay' : 'Ahead / On Track';

  const sCurveData = {
    labels: portfolioSCurve.labels,
    datasets: [
      {
        label: 'Rencana (%)', data: portfolioSCurve.rencana, borderColor: '#06336b',
        backgroundColor: 'rgba(6,51,107,0.08)', fill: true, tension: 0.4, pointRadius: 3,
      },
      {
        label: 'Realisasi (%)', data: portfolioSCurve.realisasi, borderColor: '#06b6d4',
        backgroundColor: 'rgba(6,182,212,0.08)', fill: true, tension: 0.4, pointRadius: 3,
      },
    ],
  };

  const donutData = {
    labels: Object.keys(statusCounts),
    datasets: [{
      data: Object.values(statusCounts),
      backgroundColor: ['#06b6d4', '#ef4444', '#f59e0b', '#10b981', '#06336b'],
      borderWidth: 2, borderColor: '#fff',
    }],
  };
  const donutOpts = { cutout: '70%', plugins: { legend: { position: 'bottom' } }, maintainAspectRatio: false, responsive: true };

  const tipeLabels = Object.keys(tipeCounts).map(tipeShort);
  const tipeData = { labels: tipeLabels, datasets: [{ label: 'Jumlah Proyek', data: Object.values(tipeCounts), backgroundColor: '#06336b', borderRadius: 6 }] };

  const uipLabels = Object.keys(uipCounts).map(uipShort);
  const uipData = { labels: uipLabels, datasets: [{ label: 'Jumlah Proyek', data: Object.values(uipCounts), backgroundColor: '#fbbf24', borderRadius: 6 }] };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Ringkasan Eksekutif Konstruksi" subtitle="Portofolio Pekerjaan Konstruksi PT PLN (Persero)" />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-5">
        <StatCard label="Total Proyek" value={totalProjects} sub={`${inProgressCount} in progress`} icon={FolderKanban} />
        <StatCard label="Progres Fisik" value={`${avgRealisasi}%`} sub={`Rencana ${avgRencana}%`} icon={Gauge} />
        <StatCard label="Deviasi Progres" value={avgDeviasi > 0 ? `+${avgDeviasi}%` : `${avgDeviasi}%`} sub={devLabel} icon={Percent} accent={devCls} />
        <StatCard label="Total Investasi" value={nilaiMilyar(totalNilaiKontrak)} icon={Wallet} />
        <StatCard label="Penyerapan Dana" value={`${avgPenyerapanPersen}%`} sub={`${nilaiMilyar(totalPenyerapanRp)} terserap`} icon={Coins} />
        <StatCard label="Kendala Terbuka" value={openKendalas} icon={AlertTriangle} accent="text-red-600" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        <Card className="lg:col-span-2 p-5">
          <h3 className="font-bold text-pln-navy mb-1">Kurva S Portofolio</h3>
          <p className="text-xs text-slate-500 mb-3">Progres kumulatif rencana vs realisasi seluruh portofolio (per tahap)</p>
          <div className="relative h-72 w-full">
            <Line data={sCurveData} options={{ maintainAspectRatio: false, responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { min: 0, max: 100 } } }} />
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="font-bold text-pln-navy mb-3">Distribusi Status</h3>
          <div className="relative h-72 w-full">
            <Doughnut data={donutData} options={donutOpts} />
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <Card className="p-5">
          <h3 className="font-bold text-pln-navy mb-3">Proyek per Jenis</h3>
          <div className="relative h-56 w-full">
            <Bar data={tipeData} options={{ maintainAspectRatio: false, responsive: true, plugins: { legend: { display: false } } }} />
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="font-bold text-pln-navy mb-3">Proyek per Unit Induk</h3>
          <div className="relative h-56 w-full">
            <Bar data={uipData} options={{ indexAxis: 'y', maintainAspectRatio: false, responsive: true, plugins: { legend: { display: false } } }} />
          </div>
        </Card>
      </div>

      {criticalProjects.length > 0 && (
        <Card className="p-5 mb-5 border-red-200">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-red-600">Proyek Kritis &amp; Menyimpang ({criticalProjects.length})</h3>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {criticalProjects.map((p) => (
              <div key={p.id} className="border border-red-200 rounded-xl p-4 bg-red-50/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-pln-navy">{p.kode}</span>
                  <span className="text-sm font-extrabold text-red-600">{Number(p.deviasi).toFixed(1)}%</span>
                </div>
                <div className="font-semibold text-xs text-slate-700 mb-2">{p.nama}</div>
                <div className="text-[11px] text-slate-500 mb-3">{p.uip} &bull; {p.kontraktor}</div>
                <div className="flex items-center gap-2">
                  <ProgressBar value={p.progres_realisasi} status="Critical" className="flex-1" />
                  <span className="text-[11px] font-semibold text-slate-600">{p.progres_realisasi}%</span>
                </div>
                <div className="mt-auto pt-3 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Target COD {fmtDate(p.target_cod)}</span>
                  <Link to={`/projects/${p.id}`} className="text-[11px] font-semibold text-pln-blue hover:underline">Detail &rarr;</Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-pln-navy">Proyek Terbaru</h3>
          <Link to="/projects" className="text-sm font-semibold text-pln-blue hover:underline">Lihat Semua &rarr;</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Kode &amp; Nama Proyek</th>
                <th className="px-5 py-3">Tipe &amp; Tegangan</th>
                <th className="px-5 py-3">Unit Induk</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Progres Fisik</th>
                <th className="px-5 py-3">Deviasi</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentProjects.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <div className="font-mono text-xs font-bold text-pln-blue">{p.kode}</div>
                    <div className="text-xs text-slate-600 line-clamp-1">{p.nama}</div>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-600">{tipeShort(p.tipe)}<br />{p.tegangan}</td>
                  <td className="px-5 py-3 text-xs">{uipShort(p.uip)}</td>
                  <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-5 py-3 w-40">
                    <div className="flex items-center gap-2">
                      <ProgressBar value={p.progres_realisasi} status={p.status} className="flex-1" />
                      <span className="text-[11px] text-slate-600">{p.progres_realisasi}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3"><DevChip dev={p.deviasi} /></td>
                  <td className="px-5 py-3 text-right">
                    <Link to={`/projects/${p.id}`} className="text-xs font-semibold text-pln-blue hover:underline">Detail</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}