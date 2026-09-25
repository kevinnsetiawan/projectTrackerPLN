import React, { useState } from 'react';
import {
  Calendar, Clock, CheckCircle2, AlertCircle, Timer, Milestone as MilestoneIcon,
  ChevronDown, ChevronUp, TrendingDown, TrendingUp, Info, DollarSign, Camera, Check, Sparkles, ClipboardList, X
} from 'lucide-react';
import { fmtDate, calcContractDuration, formatSisaKontrak, formatNilaiKontrak } from '../utils.js';
import { Card, ProgressBar } from './ui.jsx';

// Referensi umum rincian pekerjaan per jenis tahapan konstruksi GI/SUTT/SUTET/SKTT/PLTS.
// Dicocokkan berdasarkan kata kunci pada nama tahapan, karena data milestone dari backend
// hanya berisi nama + bobot/status/realisasi, tanpa breakdown aktivitas.
export const MILESTONE_DETAIL_REF = [
  {
    keywords: ['lahan', 'perizinan', 'izin'],
    desc: 'Tahap awal untuk memastikan kesiapan legal dan fisik lokasi proyek sebelum konstruksi dimulai.',
    items: [
      'Survei dan pematokan batas lahan/trase',
      'Negosiasi dan pembebasan lahan dengan pemilik/warga terdampak',
      'Pengurusan sertifikat/hak atas tanah',
      'Perizinan lingkungan (AMDAL/UKL-UPL) dan izin trase (untuk SUTT/SUTET)',
      'Izin Mendirikan Bangunan (IMB) / PBG untuk gedung kontrol',
      'Sosialisasi kepada masyarakat sekitar lokasi',
    ],
  },
  {
    keywords: ['sipil', 'gedung kontrol', 'pondasi', 'konstruksi bangunan'],
    desc: 'Pekerjaan struktur dasar dan bangunan penunjang sebelum peralatan utama dipasang.',
    items: [
      'Pekerjaan galian dan pondasi',
      'Pengecoran struktur beton (pondasi tower/peralatan, pagar, jalan akses)',
      'Konstruksi gedung kontrol dan ruang panel',
      'Instalasi sistem drainase dan grounding dasar',
      'Pekerjaan proteksi kebakaran dasar (jika dipersyaratkan)',
    ],
  },
  {
    keywords: ['pemasangan', 'erection', 'instalasi', 'struktur', 'tower', 'peralatan utama'],
    desc: 'Pemasangan struktur dan peralatan utama sesuai desain teknis proyek.',
    items: [
      'Erection tower/struktur baja (untuk SUTT/SUTET) atau instalasi bay peralatan (untuk GI)',
      'Pemasangan peralatan utama: trafo, PMT/CB, PMS/DS, busbar, dll',
      'Penarikan kabel/konduktor (stringing) untuk SUTT/SUTET/SKTT',
      'Instalasi panel kontrol, proteksi, dan SCADA',
      'Pemasangan sistem grounding dan lightning protection',
    ],
  },
  {
    keywords: ['pengujian', 'komisioning', 'testing', 'commissioning'],
    desc: 'Rangkaian pengujian untuk memastikan seluruh instalasi berfungsi sesuai standar sebelum dioperasikan.',
    items: [
      'Individual test peralatan (trafo, PMT, PMS, proteksi, dll)',
      'Pengujian tahanan isolasi dan tahanan pentanahan',
      'Functional test sistem proteksi dan SCADA',
      'Commissioning test terintegrasi dengan sistem existing',
      'Pengecekan dan koreksi temuan hasil pengujian',
    ],
  },
  {
    keywords: ['energize', 'cod', 'operasi', 'penyerahan', 'serah terima', 'bast'],
    desc: 'Tahap akhir penyalaan sistem dan penyerahan hasil pekerjaan konstruksi.',
    items: [
      'Energize/penormalan sistem ke jaringan',
      'Monitoring performa awal pasca energize',
      'Penyusunan dokumentasi as-built drawing',
      'Serah terima pekerjaan (BAST) kepada pihak terkait',
      'Masa pemeliharaan/garansi pasca commissioning',
    ],
  },
];

const DEFAULT_MILESTONE_DETAIL = {
  desc: 'Rincian aktivitas spesifik untuk tahapan ini belum tersedia di referensi umum. Koordinasikan dengan Dalkon/Engineering di lapangan untuk detail pekerjaan aktual.',
  items: [],
};

export function getMilestoneDetail(nama) {
  const n = (nama || '').toLowerCase();
  const found = MILESTONE_DETAIL_REF.find((ref) => ref.keywords.some((kw) => n.includes(kw)));
  return found || DEFAULT_MILESTONE_DETAIL;
}

// Rincian tahapan: bila milestone punya `rincian` tersimpan (JSON), pakai itu;
// sebaliknya fallback ke referensi umum.
export function milestoneRincian(m) {
  if (m && m.rincian) {
    try {
      const r = JSON.parse(m.rincian);
      if (r && typeof r === 'object') return { desc: r.desc || '', items: Array.isArray(r.items) ? r.items : [] };
    } catch {}
  }
  return getMilestoneDetail(m ? m.nama : '');
}

// Gantt chart timeline: alokasikan rentang kontrak (tgl_mulai → target_cod)
// ke tiap milestone secara proporsional berdasarkan bobotnya, dengan penanda "hari ini".
function GanttTimeline({ project }) {
  const { tgl_mulai, target_cod, milestones = [], status } = project;
  const start = tgl_mulai ? new Date(tgl_mulai) : null;
  const end = target_cod ? new Date(target_cod) : null;
  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime()) || milestones.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        Data jadwal/milestone belum lengkap untuk menampilkan Gantt chart.
      </div>
    );
  }

  const totalDays = Math.max(1, (end - start) / 86400000);
  const totalBobot = milestones.reduce((s, m) => s + Number(m.bobot || 0), 0) || 1;

  // Bila semua tahap punya tanggal mulai–selesai, posisi bar Gantt memakai jadwal
  // manual tersebut; sebaliknya fallback ke alokasi proporsional bobot.
  const pctOf = (d) => Math.min(100, Math.max(0, ((new Date(d) - start) / 86400000 / totalDays) * 100));
  const hasManualDates = milestones.every((m) => m.tgl_mulai && m.tgl_selesai && !isNaN(new Date(m.tgl_mulai).getTime()) && !isNaN(new Date(m.tgl_selesai).getTime()));

  let cursor = 0;
  const segs = milestones.map((m) => {
    if (hasManualDates) {
      const fromPct = pctOf(new Date(`${m.tgl_mulai}T00:00:00`));
      const toPct = pctOf(new Date(`${m.tgl_selesai}T00:00:00`));
      return { m, fromPct, toPct, manual: true };
    }
    const span = (Number(m.bobot || 0) / totalBobot) * totalDays;
    const fromPct = (cursor / totalDays) * 100;
    cursor += span;
    const toPct = (cursor / totalDays) * 100;
    return { m, fromPct, toPct, manual: false };
  });

  const now = new Date();
  const todayPct = Math.min(100, Math.max(0, ((now - start) / 86400000 / totalDays) * 100));
  const isPekerjaanSelesai = status === 'BAST 1' || status === 'BAST 2';

  const barColor = (m) => {
    if (m.status === 'Done') return 'bg-emerald-400';
    if (m.status === 'In Progress') return 'bg-pln-cyan';
    return 'bg-slate-300';
  };

  const months = [];
  const mc = new Date(start.getFullYear(), start.getMonth(), 1);
  while (mc <= end) {
    const t = Math.min(100, Math.max(0, ((mc - start) / 86400000 / totalDays) * 100));
    months.push({ t, label: mc.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }) });
    mc.setMonth(mc.getMonth() + 1);
  }
  if (months.length === 0 || months[months.length - 1].t < 99) {
    months.push({ t: 100, label: end.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }) });
  }
  const showEveryMonth = months.length > 18 ? 2 : 1;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-pln-blue bg-pln-lightcyan/60 border border-pln-lightcyan rounded-lg px-3 py-1.5">
          <Calendar className="w-4 h-4" />
          {fmtDate(tgl_mulai)}
        </span>
        <span className="text-[11px] font-semibold text-slate-400">
          {Math.round(totalDays)} hari durasi kontrak
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
          <MilestoneIcon className="w-4 h-4" />
          {fmtDate(target_cod)} &bull; Target COD
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="flex mb-1">
            <div className="w-[26%] shrink-0 pr-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Tahapan Pekerjaan
            </div>
            <div className="flex-1 relative h-6 border-b border-slate-200">
              {months.map((mt, i) => (
                <div
                  key={i}
                  className={`absolute top-0 text-[10px] text-slate-400 whitespace-nowrap ${i === months.length - 1 ? '-translate-x-full' : i === 0 ? '' : '-translate-x-1/2'
                    }`}
                  style={{ left: `${mt.t}%` }}
                >
                  {showEveryMonth === 1 || i % showEveryMonth === 0 ? mt.label : ''}
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-[26%] right-0 pointer-events-none">
              {months.map((mt, i) => (
                <div key={i} className="absolute inset-y-0 border-l border-slate-100" style={{ left: `${mt.t}%` }} />
              ))}
            </div>

            {!isPekerjaanSelesai && (
              <div
                className="absolute inset-y-0 z-10 pointer-events-none"
                style={{ left: `calc(26% + (100% - 26%) * ${todayPct} / 100)` }}
              >
                <div className="relative h-full">
                  <div className="absolute inset-y-0 w-0.5 bg-red-400" />
                  <span className="absolute top-0 -translate-x-1/2 text-[9px] font-extrabold text-red-500 bg-red-50 border border-red-200 rounded px-1 py-0.5 whitespace-nowrap">
                    Hari Ini
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              {segs.map(({ m, fromPct, toPct }, idx) => {
                const realisasi = Number(m.realisasi || 0);
                const fillPct = Math.min(100, Math.max(2, (realisasi / 100) * (toPct - fromPct)));
                return (
                  <div key={m.id || idx} className="relative flex items-center">
                    <div className="w-[26%] shrink-0 pr-3">
                      <div className="text-[11px] font-bold text-slate-700 truncate" title={m.nama}>
                        {m.nama}
                      </div>
                      <div className="text-[10px] text-slate-400 whitespace-nowrap">
                        {segs[idx] && segs[idx].manual
                          ? `${fmtDate(m.tgl_mulai)} – ${fmtDate(m.tgl_selesai)}`
                          : `Bobot ${m.bobot}% &bull; ${m.status}`}
                      </div>
                    </div>
                    <div className="flex-1 relative h-7 bg-slate-50 rounded-md border border-slate-200 overflow-hidden">
                      <div
                        className={`absolute top-1.5 bottom-1.5 left-0 rounded ${barColor(m)} transition-all`}
                        style={{ left: `${fromPct}%`, width: `${toPct - fromPct}%` }}
                      />
                      {realisasi > 0 && (
                        <div
                          className="absolute top-1.5 bottom-1.5 bg-black/25"
                          style={{ left: `${fromPct}%`, width: `${fillPct}%` }}
                        />
                      )}
                      {!isPekerjaanSelesai && (
                        <div className="absolute inset-y-0 w-px bg-red-300/70" style={{ left: `${todayPct}%` }} />
                      )}
                      {(toPct - fromPct) > 10 && (
                        <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 text-[10px] font-extrabold text-white drop-shadow whitespace-nowrap">
                          {realisasi}%
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1.5"><i className="w-3 h-3 rounded bg-pln-cyan inline-block" /> In Progress</span>
            <span className="inline-flex items-center gap-1.5"><i className="w-3 h-3 rounded bg-emerald-400 inline-block" /> Done</span>
            <span className="inline-flex items-center gap-1.5"><i className="w-3 h-3 rounded bg-slate-300 inline-block" /> Pending</span>
            <span className="inline-flex items-center gap-1.5"><i className="w-2 h-3 bg-black/25 inline-block rounded-sm" /> Progres tercapai</span>
            {!isPekerjaanSelesai && <span className="inline-flex items-center gap-1.5"><i className="w-0.5 h-3 bg-red-400 inline-block" /> Hari ini (real time)</span>}
            <span className="ml-auto text-[10px] text-slate-400 italic">
              {hasManualDates
                ? 'Posisi bar mengikuti jadwal tahap (tanggal mulai–selesai) hasil atur jadwal.'
                : 'Skala waktu = durasi kontrak proyek; alokasi tahap proporsional bobot. Atur tanggal tahap untuk jadwal akurat.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectTimeline({ project }) {
  if (!project) return null;

  const { tgl_mulai, target_cod, progres_realisasi, status, milestones = [], dokumentasis = [], nilai_kontrak } = project;
  const sisaInfo = formatSisaKontrak(tgl_mulai, target_cod, status);
  const duration = calcContractDuration(tgl_mulai, target_cod);
  const lastAmandemen = project.amandements && project.amandements.length ? project.amandements[0] : null;

  const realisasiPct = Number(progres_realisasi || 0);
  const timePct = sisaInfo.timeProgressPct || 0;
  const timeVsRealDiff = Math.round((realisasiPct - timePct) * 10) / 10;

  const defaultOpenIndex = milestones.findIndex((m) => m.status === 'In Progress');
  const [expandedId, setExpandedId] = useState(
    defaultOpenIndex !== -1 ? (milestones[defaultOpenIndex]?.id || defaultOpenIndex) : (milestones[0]?.id || 0)
  );

  function toggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  const [detailMilestone, setDetailMilestone] = useState(null);

  return (
    <div className="space-y-6">
      {/* 1. Header Card */}
      <Card className="p-5 border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-pln-blue" />
              <h3 className="font-bold text-pln-navy text-base">Timeline &amp; Durasi Kontrak</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitoring perjalanan waktu kontrak vs realisasi pencapaian fisik proyek
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${sisaInfo.cls}`}>
              <Clock className="w-4 h-4" />
              {sisaInfo.shortText}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tanggal Kontrak</div>
            <div className="text-sm font-bold text-slate-800 mt-1">{fmtDate(project.tgl_kontrak)}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Tanda Tangan Kontrak</div>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Mulai Kerja (SPMK)</div>
            <div className="text-sm font-bold text-slate-800 mt-1">{fmtDate(tgl_mulai)}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{project.nomor_spmk || 'SPMK Terbit'}</div>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Target COD</div>
            <div className={`text-sm font-bold mt-1 ${lastAmandemen ? 'text-emerald-700' : 'text-slate-800'}`}>
              {fmtDate(target_cod)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {lastAmandemen ? `Amendemen: dari ${fmtDate(lastAmandemen.target_cod_lama)}` : 'Batas Akhir Kontrak'}
            </div>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Sisa Waktu</div>
            <div className={`text-sm font-extrabold mt-1 ${sisaInfo.isOverdue ? 'text-red-600' : 'text-pln-blue'}`}>
              {sisaInfo.daysText}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {duration ? `${duration.elapsedDays} hari terpakai` : '-'}
            </div>
          </div>
        </div>

        <div className="space-y-4 bg-slate-50/70 p-4 rounded-lg border border-slate-200/80">
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span className="inline-flex items-center gap-1">
                <Timer className="w-3.5 h-3.5 text-slate-500" />
                Durasi Waktu Berlalu
              </span>
              <span className="font-bold text-slate-800">{timePct}%</span>
            </div>
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${sisaInfo.isOverdue ? 'bg-red-500' : sisaInfo.isExpiringSoon ? 'bg-amber-500' : 'bg-slate-700'
                  }`}
                style={{ width: `${timePct}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-pln-cyan" />
                Progres Realisasi Fisik
              </span>
              <span className="font-bold text-pln-blue">{realisasiPct}%</span>
            </div>
            <ProgressBar value={realisasiPct} status={status} className="h-3" />
          </div>

          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Perbandingan Laju Waktu &amp; Fisik:</span>
            {timeVsRealDiff >= 0 ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-100/80 px-2.5 py-1 rounded-lg">
                <TrendingUp className="w-3.5 h-3.5" />
                Progres fisik unggul +{timeVsRealDiff}% dari laju waktu
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-red-700 font-bold bg-red-100/80 px-2.5 py-1 rounded-lg">
                <TrendingDown className="w-3.5 h-3.5" />
                Progres fisik tertinggal {timeVsRealDiff}% dibanding laju waktu
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* 1b. Gantt Chart Timeline Proyek */}
      <Card className="p-5 border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <MilestoneIcon className="w-5 h-5 text-pln-blue" />
            <div>
              <h3 className="font-bold text-pln-navy text-base">Gantt Chart Timeline Proyek</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Visualisasi kronologis tahapan pekerjaan dari mulai kontrak hingga target COD
              </p>
            </div>
          </div>
        </div>
        <GanttTimeline project={project} />
      </Card>

      {/* 2. Visual Roadmap Timeline */}
      <Card className="p-5 border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <MilestoneIcon className="w-5 h-5 text-pln-cyan" />
            <div>
              <h3 className="font-bold text-pln-navy text-base">Roadmap &amp; Milestones Tahapan Pekerjaan</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Klik kartu tahapan di bawah untuk melihat rincian kalkulasi, kontribusi bobot, deviasi, dan status pekerjaan.
              </p>
            </div>
          </div>
          <span className="text-[11px] text-slate-400 font-medium bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            {milestones.filter((m) => m.status === 'Done').length} dari {milestones.length} Tahap Selesai
          </span>
        </div>

        {milestones.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">Belum ada data milestone tahapan.</div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200">
            {milestones.map((m, idx) => {
              const mId = m.id || idx;
              const isExpanded = expandedId === mId;
              const isDone = m.status === 'Done';
              const isInProgress = m.status === 'In Progress';

              const bobotNum = Number(m.bobot || 0);
              const rencanaNum = Number(m.rencana || 0);
              const realisasiNum = Number(m.realisasi || 0);
              const deviasiTahap = Math.round((realisasiNum - rencanaNum) * 10) / 10;
              const sisaTarget = Math.max(0, 100 - realisasiNum);

              const kontribusiRealisasi = Math.round((bobotNum * realisasiNum) / 100 * 100) / 100;
              const kontribusiRencana = Math.round((bobotNum * rencanaNum) / 100 * 100) / 100;

              const nilaiProyekNum = Number(nilai_kontrak || 0);
              const alokasiBiaya = nilaiProyekNum ? Math.round((nilaiProyekNum * bobotNum) / 100) : 0;
              const capaianBiaya = nilaiProyekNum ? Math.round((nilaiProyekNum * bobotNum * realisasiNum) / 10000) : 0;

              const relatedPhotos = dokumentasis.filter((d) => {
                if (!d) return false;
                const searchStr = `${d.judul || ''} ${d.tahap || ''}`.toLowerCase();
                const mNameWords = (m.nama || '').toLowerCase().split(/\s+/).filter((w) => w.length > 3);
                return mNameWords.some((word) => searchStr.includes(word));
              });

              const milestoneDetail = milestoneRincian(m);

              return (
                <div key={mId} className="relative group">
                  <button
                    type="button"
                    onClick={() => toggleExpand(mId)}
                    title="Klik untuk buka detailing"
                    className={`absolute -left-6 top-3 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all z-10 ${isDone
                      ? 'bg-emerald-500 text-white ring-4 ring-emerald-100 hover:ring-emerald-200'
                      : isInProgress
                        ? 'bg-pln-cyan text-white ring-4 ring-cyan-100 hover:ring-cyan-200 animate-pulse'
                        : 'bg-slate-200 text-slate-600 ring-4 ring-slate-100 hover:ring-slate-200'
                      }`}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                  </button>

                  <div
                    onClick={() => toggleExpand(mId)}
                    className={`rounded-2xl border transition-all cursor-pointer overflow-hidden ${isExpanded
                      ? 'bg-white border-pln-cyan shadow-lg shadow-pln-cyan/10 ring-2 ring-pln-cyan/20'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
                      }`}
                  >
                    <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                            Tahap #{idx + 1}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isDone
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : isInProgress
                                ? 'bg-cyan-50 text-cyan-700 border-cyan-300'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                              }`}
                          >
                            {m.status}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-slate-800 text-sm md:text-base leading-snug">
                          {m.nama}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right hidden sm:block">
                          <div className="text-xs font-extrabold text-pln-blue">{realisasiNum}%</div>
                          <div className="text-[10px] text-slate-400">dari target {rencanaNum}%</div>
                        </div>

                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isExpanded ? 'bg-pln-lightcyan text-pln-blue' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                            }`}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    <div className="px-4 pb-3">
                      <ProgressBar value={realisasiNum} status={m.status} className="h-2" />
                    </div>

                    {isExpanded && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="border-t border-slate-100 bg-gradient-to-b from-slate-50/60 to-slate-100/40 p-4 md:p-5 space-y-4 animate-fade-in cursor-default"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-bold text-pln-navy pb-2 border-b border-slate-200">
                          <Sparkles className="w-4 h-4 text-pln-cyan" />
                          Rincian Capaian &amp; Analisis Tahapan #{idx + 1}
                        </div>

                        {/* Rincian Pekerjaan Tahap Ini - tombol buka modal */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setDetailMilestone({ nama: m.nama, idx, bobot: bobotNum, ...milestoneDetail }); }}
                          className="w-full flex items-center justify-between gap-2 bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm hover:border-pln-cyan/50 hover:shadow-md transition-all text-left"
                        >
                          <span className="text-xs font-bold text-pln-blue flex items-center gap-1.5">
                            <ClipboardList className="w-3.5 h-3.5" />
                            Lihat Rincian Tahapan
                          </span>
                          <span className="text-[10px] text-slate-400">Klik untuk buka</span>
                        </button>

                        {/* 4 Detail Stat Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Bobot Tahap</div>
                            <div className="text-base font-extrabold text-slate-800 mt-1">{bobotNum}%</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">Porsi terhadap total</div>
                          </div>

                          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Realisasi Fisik</div>
                            <div className="text-base font-extrabold text-pln-blue mt-1">{realisasiNum}%</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">Target Rencana: {rencanaNum}%</div>
                          </div>

                          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Deviasi Tahap</div>
                            <div
                              className={`text-base font-extrabold mt-1 ${deviasiTahap >= 0 ? 'text-emerald-600' : 'text-red-600'
                                }`}
                            >
                              {deviasiTahap > 0 ? `+${deviasiTahap}%` : `${deviasiTahap}%`}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {deviasiTahap >= 0 ? 'Sesuai Target / Ahead' : 'Tertinggal dari target'}
                            </div>
                          </div>

                          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Sisa Pekerjaan</div>
                            <div className="text-base font-extrabold text-slate-700 mt-1">{sisaTarget}%</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {sisaTarget === 0 ? 'Tuntas 100%' : 'Menuju penyelesaian'}
                            </div>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-3">
                          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm space-y-2">
                            <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                              <span>Kontribusi Terhadap Fisik Proyek</span>
                              <span className="font-extrabold text-pln-blue">{kontribusiRealisasi}% / {bobotNum}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-pln-gradient h-full rounded-full transition-all"
                                style={{ width: `${Math.min(100, Math.round((kontribusiRealisasi / (bobotNum || 1)) * 100))}%` }}
                              />
                            </div>
                            <div className="text-[11px] text-slate-500 leading-relaxed">
                              Tahapan ini menyumbang <b>{kontribusiRealisasi}%</b> dari total progres keseluruhan proyek ({realisasiPct}%).
                            </div>
                          </div>

                          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm space-y-1.5">
                            <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Alokasi Nilai Kontrak Tahap</span>
                            </div>
                            <div className="flex items-baseline justify-between pt-1">
                              <div className="text-sm font-extrabold text-slate-800">{formatNilaiKontrak(alokasiBiaya)}</div>
                              <div className="text-xs font-semibold text-emerald-700">
                                Selesai: {formatNilaiKontrak(capaianBiaya)}
                              </div>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Dihitung dari bobot {bobotNum}% atas total nilai kontrak proyek.
                            </div>
                          </div>
                        </div>

                        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
                          <div className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 text-pln-blue" />
                            <span>Catatan &amp; Rekomendasi Lapangan</span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {isDone && (
                              <span className="text-emerald-700 font-medium">
                                Tahapan ini telah dinyatakan <b>Selesai 100%</b> dan memenuhi target fisik pekerjaan konstruksi.
                              </span>
                            )}
                            {isInProgress && deviasiTahap >= 0 && (
                              <span>
                                Pelaksanaan pekerjaan sedang <b>berjalan aktif dan on-track</b>. Tetap pertahankan ritme kerja vendor dan suplai material untuk mencapai target selesai.
                              </span>
                            )}
                            {isInProgress && deviasiTahap < 0 && (
                              <span className="text-red-700 font-medium">
                                Tahapan mengalami <b>deviasi negatif ({deviasiTahap}%)</b>. Diperlukan penambahan manpower, alat berat, atau percepatan inspeksi Dalkon untuk mengejar ketertinggalan.
                              </span>
                            )}
                            {!isDone && !isInProgress && (
                              <span className="text-slate-500">
                                Tahapan berstatus <b>Pending</b> (belum dimulai). Pekerjaan akan dimulai setelah tahapan pendukung sebelumnya mencapai progres yang dipersyaratkan.
                              </span>
                            )}
                          </p>
                        </div>

                        {relatedPhotos.length > 0 && (
                          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
                            <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                              <Camera className="w-3.5 h-3.5 text-pln-blue" />
                              <span>Dokumentasi Foto Lapangan Terkait ({relatedPhotos.length})</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {relatedPhotos.map((p, pIdx) => (
                                <div key={p.id || pIdx} className="group/photo rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                                  <div className="aspect-video bg-slate-200 overflow-hidden">
                                    <img
                                      src={p.foto}
                                      alt={p.judul}
                                      className="w-full h-full object-cover group-hover/photo:scale-105 transition duration-200"
                                    />
                                  </div>
                                  <div className="p-2">
                                    <div className="text-[11px] font-bold text-slate-800 truncate">{p.judul}</div>
                                    <div className="text-[10px] text-slate-400">{fmtDate(p.tgl)}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modal Rincian Pekerjaan Tahapan */}
      {detailMilestone && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setDetailMilestone(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Rincian Pekerjaan &bull; Tahap #{detailMilestone.idx + 1}
                </span>
                <h3 className="font-extrabold text-pln-navy text-base leading-snug mt-0.5">{detailMilestone.nama}</h3>
              </div>
              <button
                onClick={() => setDetailMilestone(null)}
                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-sm text-slate-600 leading-relaxed">{detailMilestone.desc}</p>
              {detailMilestone.items.length > 0 ? (
                <ul className="space-y-2">
                  {detailMilestone.items.map((it, i) => {
                    const perItemPct = Math.round((detailMilestone.bobot / detailMilestone.items.length) * 10) / 10;
                    return (
                      <li key={i} className="flex items-start justify-between gap-3 text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                        <span className="flex gap-2">
                          <span className="text-pln-cyan font-bold shrink-0">&bull;</span>
                          <span>{it}</span>
                        </span>
                        <span className="shrink-0 text-[11px] font-bold text-pln-blue bg-pln-lightcyan/70 px-2 py-0.5 rounded-full">
                          {perItemPct}%
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 italic">Belum ada referensi rincian aktivitas untuk nama tahapan ini.</p>
              )}
              {detailMilestone.items.length > 0 && (
                <p className="text-[11px] text-slate-400 italic pt-1">
                  Persentase dihitung dari pembagian rata bobot tahap ({detailMilestone.bobot}%) terhadap total proyek ke tiap poin aktivitas &mdash; bukan progres aktual per item.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}