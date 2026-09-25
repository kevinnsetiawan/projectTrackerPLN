import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Doughnut, Bar,
} from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import {
  FolderKanban, Percent, Gauge, Wallet, Coins, Banknote, AlertTriangle, Activity, Layers,
} from 'lucide-react';
import { getDashboard } from '../api.js';
import { setPageTitle } from '../components/Layout.jsx';
import { Card, StatCard, ProgressBar, DevChip, PageHeader, Spinner, Empty } from '../components/ui.jsx';
import { nilaiMilyar, fmtDate, tipeShort, uipShort, formatSisaKontrak, statusClass } from '../utils.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

const STATUS_COLORS = { InProgress: '#06b6d4', BASTB: '#f59e0b', 'BAST 1': '#10b981', 'BAST 2': '#0d9488' };

function ActPlanCell({ rencana, realisasi }) {
  const rn = Math.min(100, Math.max(0, Number(rencana) || 0));
  const rs = Math.min(100, Math.max(0, Number(realisasi) || 0));
  const delay = rs < rn;
  return (
    <div className="w-40">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[10px] text-slate-400">Rencana</span>
        <span className="text-[10px] font-semibold text-slate-500">{rn}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100 mb-0.5">
        <div className="h-1.5 rounded-full bg-slate-400/70" style={{ width: `${rn}%` }} />
      </div>
      <div className="flex items-center justify-between gap-2 mb-1 mt-1">
        <span className="text-[10px] text-slate-400">Realisasi</span>
        <span className={`text-[10px] font-extrabold ${delay ? 'text-red-600' : 'text-emerald-600'}`}>{rs}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100">
        <div className={`h-1.5 rounded-full ${delay ? 'bg-red-500' : 'bg-cyan-500'}`} style={{ width: `${rs}%` }} />
      </div>
    </div>
  );
}

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
    totalNilaiKontrak, totalPenyerapanRp, avgPenyerapanPersen, totalTerbayarRp, avgProgresTerbayar,
    openKendalas, kendalaByKategori,
    criticalProjects, recentProjects, tipeAvg, uipAvg,
  } = data;

  const devCls = avgDeviasi < 0 ? 'text-red-600' : 'text-emerald-600';
  const devLabel = avgDeviasi < 0 ? 'Rata-rata proyek terlambat dari rencana' : 'Rata-rata proyek on-track / ahead';

  const donutColors = Object.keys(statusCounts).map((s) => STATUS_COLORS[s.replace(' ', '')] || '#94a3b8');
  const donutData = {
    labels: Object.keys(statusCounts),
    datasets: [{
      data: Object.values(statusCounts),
      backgroundColor: donutColors,
      borderWidth: 2, borderColor: '#fff', hoverOffset: 6,
    }],
  };
  const donutOpts = { cutout: '72%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.parsed} proyek (${totalProjects ? Math.round((c.parsed / totalProjects) * 100) : 0}%)` } } }, maintainAspectRatio: false, responsive: true };

  const katEntries = Object.entries(kendalaByKategori).sort((a, b) => b[1] - a[1]);

  const tipeLabels = Object.keys(tipeAvg).map(tipeShort);
  const tipeCounts = Object.values(tipeAvg).map((x) => x.count);
  const tipeRealisasi = Object.values(tipeAvg).map((x) => x.realisasi);
  const tipeData = {
    labels: tipeLabels,
    datasets: [
      { label: 'Jumlah Proyek', data: tipeCounts, backgroundColor: '#06336b', borderRadius: 6, yAxisID: 'y' },
      {
        label: 'Rata-rata Realisasi (%)', data: tipeRealisasi, type: 'line', borderColor: '#06b6d4',
        backgroundColor: 'rgba(6,182,212,0.12)', tension: 0.4, pointRadius: 4, borderWidth: 2, yAxisID: 'y1',
      },
    ],
  };
  const tipeOpts = {
    maintainAspectRatio: false, responsive: true,
    plugins: { legend: { position: 'bottom' } },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0 } },
      y1: { beginAtZero: true, position: 'right', max: 100, grid: { display: false }, ticks: { callback: (v) => `${v}%` } },
    },
  };

  const uipLabels = Object.keys(uipAvg).map(uipShort);
  const uipData = {
    labels: uipLabels,
    datasets: [{
      label: 'Jumlah Proyek',
      data: Object.values(uipAvg).map((x) => x.count),
      backgroundColor: '#fbbf24', borderRadius: 6,
    }],
  };
  const uipOpts = {
    indexAxis: 'y', maintainAspectRatio: false, responsive: true,
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Ringkasan Eksekutif Konstruksi" subtitle="Portofolio Pekerjaan Konstruksi PT PLN (Persero)" />

      <div className="grid grid-cols-2 md:grid-cols-4 2xl:grid-cols-7 gap-4 mb-5">
        <StatCard label="Total Proyek" value={totalProjects} sub={`${inProgressCount} in progress`} icon={FolderKanban} />
        <StatCard label="Progres Fisik" value={`${avgRealisasi}%`} sub={`Rencana ${avgRencana}%`} icon={Gauge} />
        <StatCard label="Deviasi Progres" value={avgDeviasi > 0 ? `+${avgDeviasi}%` : `${avgDeviasi}%`} sub={devLabel.split('.')[0]} icon={Percent} accent={devCls} />
        <StatCard label="Total Investasi" value={nilaiMilyar(totalNilaiKontrak)} icon={Wallet} />
        <StatCard label="Penyerapan Dana" value={`${avgPenyerapanPersen}%`} sub={`${nilaiMilyar(totalPenyerapanRp)} terserap`} icon={Coins} />
        <StatCard label="Progres Bayar" value={`${avgProgresTerbayar}%`} sub={`${nilaiMilyar(totalTerbayarRp)} terbayar`} icon={Banknote} />
        <StatCard label="Kendala Terbuka" value={openKendalas} icon={AlertTriangle} accent="text-red-600" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        <Card className="p-5 accent-top">
          <h3 className="font-bold text-pln-navy mb-1">Distribusi Status Proyek</h3>
          <p className="text-xs text-slate-500 mb-3">Posisi komersial operasi (COD) seluruh portofolio</p>
          <div className="relative h-56 mx-auto max-w-[260px]">
            <Doughnut data={donutData} options={donutOpts} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-extrabold text-pln-navy leading-none">{totalProjects}</span>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-1">Total Proyek</span>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-4">
            {Object.entries(statusCounts).map(([s, c]) => (
              <span key={s} className="inline-flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[s.replace(' ', '')] || '#94a3b8' }} />
                <span className="text-slate-600">{s}</span>
                <span className="font-extrabold text-pln-navy">{c}</span>
              </span>
            ))}
          </div>
        </Card>

        <Card className="p-5 accent-top">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-pln-blue" />
            <h3 className="font-bold text-pln-navy">Indikator Portofolio</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">Rata-rata prestasi pekerjaan vs jadwal kontrak</p>
          <div className="flex items-center gap-2 mb-5">
            <DevChip dev={avgDeviasi} />
            <span className="text-[11px] text-slate-500">{devLabel}</span>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-600">Rencana</span>
                <span className="font-extrabold text-pln-navy">{avgRencana}%</span>
              </div>
              <ProgressBar value={avgRencana} status="In Progress" />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-600">Realisasi</span>
                <span className={`font-extrabold ${devCls}`}>{avgRealisasi}%</span>
              </div>
              <ProgressBar value={avgRealisasi} status={avgDeviasi < 0 ? 'Menyimpang' : 'In Progress'} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-slate-200">
            <div>
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Coins className="w-3 h-3" /> Penyerapan Dana</div>
              <div className="text-lg font-extrabold text-pln-navy">{avgPenyerapanPersen}%</div>
              <div className="text-[11px] text-slate-500">{nilaiMilyar(totalPenyerapanRp)}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Banknote className="w-3 h-3" /> Progres Bayar</div>
              <div className="text-lg font-extrabold text-pln-navy">{avgProgresTerbayar}%</div>
              <div className="text-[11px] text-slate-500">{nilaiMilyar(totalTerbayarRp)}</div>
            </div>
          </div>
        </Card>

        <Card className="p-5 accent-top flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-pln-blue" />
              <h3 className="font-bold text-pln-navy">Kendala Terbuka</h3>
            </div>
            <span className="inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-full bg-red-100 text-red-700 text-xs font-extrabold">{openKendalas}</span>
          </div>
          <p className="text-xs text-slate-500 mb-4">Isu belum terselesaikan per kategori</p>
          {katEntries.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <Empty message="Tidak ada kendala terbuka. Mantap!" />
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center space-y-3">
              {katEntries.map(([kat, c]) => (
                <div key={kat}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-600 line-clamp-1">{kat}</span>
                    <span className="font-extrabold text-slate-800">{c}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-red-500" style={{ width: `${openKendalas ? (c / openKendalas) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link to="/kendala" className="mt-5 text-xs font-semibold text-pln-blue hover:underline">Kelola Kendala &rarr;</Link>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <Card className="p-5 accent-top">
          <h3 className="font-bold text-pln-navy mb-3">Proyek per Jenis Pekerjaan</h3>
          <div className="relative h-56 w-full">
            <Bar data={tipeData} options={tipeOpts} />
          </div>
        </Card>
        <Card className="p-5 accent-top">
          <h3 className="font-bold text-pln-navy mb-3">Proyek per Unit Induk</h3>
          <div className="relative h-56 w-full">
            <Bar data={uipData} options={uipOpts} />
          </div>
        </Card>
      </div>

      {criticalProjects.length > 0 && (
        <Card className="p-5 mb-5 border-red-200 accent-top">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-red-600">Proyek Menyimpang dari Rencana ({criticalProjects.length})</h3>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {criticalProjects.map((p) => (
              <div key={p.id} className="border border-red-200 rounded-lg p-4 bg-red-50/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-pln-navy">{p.kode}</span>
                  <span className="text-sm font-extrabold text-red-600">{Number(p.deviasi).toFixed(1)}%</span>
                </div>
                <div className="font-semibold text-xs text-slate-700 mb-2">{p.nama}</div>
                <div className="text-[11px] text-slate-500 mb-3">{p.uip} &bull; {p.kontraktor}</div>
                <div className="flex items-center gap-2">
                  <ProgressBar value={p.progres_realisasi} status="In Progress" className="flex-1" />
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
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <h3 className="font-bold text-pln-navy">Proyek Terbaru</h3>
          <Link to="/projects" className="text-sm font-semibold text-pln-blue hover:underline">Lihat Semua &rarr;</Link>
        </div>
        {recentProjects.length === 0 ? (
          <Empty message="Belum ada proyek terdaftar." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-5 py-3">Kode &amp; Nama Proyek</th>
                  <th className="px-5 py-3">Tipe &amp; Tegangan</th>
                  <th className="px-5 py-3">Unit Induk</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Sisa Waktu Kontrak</th>
                  <th className="px-5 py-3">Actual vs Plan</th>
                  <th className="px-5 py-3">Progres Bayar</th>
                  <th className="px-5 py-3">Deviasi</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {recentProjects.map((p) => {
                  const sisa = formatSisaKontrak(p.tgl_mulai, p.target_cod, p.status);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <div className="font-mono text-xs font-bold text-pln-blue">{p.kode}</div>
                        <div className="text-xs text-slate-600 line-clamp-1">{p.nama}</div>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-600">{tipeShort(p.tipe)}<br />{p.tegangan}</td>
                      <td className="px-5 py-3 text-xs">{uipShort(p.uip)}</td>
                      <td className="px-5 py-3"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusClass(p.status)}`}>{p.status}</span></td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${sisa.cls}`}>
                          {sisa.badgeText}
                        </span>
                      </td>
                      <td className="px-5 py-3 w-40">
                        <ActPlanCell rencana={p.progres_rencana} realisasi={p.progres_realisasi} status={p.status} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-slate-100">
                            <div className={`h-1.5 rounded-full ${Number(p.progresTerbayarPct) > Number(p.progres_realisasi) ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, Number(p.progresTerbayarPct) || 0)}%` }} />
                          </div>
                          <span className="text-[11px] text-slate-600">{p.progresTerbayarPct}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3"><DevChip dev={p.deviasi} /></td>
                      <td className="px-5 py-3 text-right">
                        <Link to={`/projects/${p.id}`} className="text-xs font-semibold text-pln-blue hover:underline">Detail</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}