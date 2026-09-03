import React from 'react';
import { Calendar, Clock, CheckCircle2, AlertCircle, Timer, Milestone as MilestoneIcon, ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import { fmtDate, calcContractDuration, formatSisaKontrak } from '../utils.js';
import { Card, ProgressBar } from './ui.jsx';

export default function ProjectTimeline({ project }) {
  if (!project) return null;

  const { tgl_mulai, target_cod, progres_realisasi, status, milestones = [] } = project;
  const sisaInfo = formatSisaKontrak(tgl_mulai, target_cod, status);
  const duration = calcContractDuration(tgl_mulai, target_cod);

  const realisasiPct = Number(progres_realisasi || 0);
  const timePct = sisaInfo.timeProgressPct || 0;
  const timeVsRealDiff = Math.round((realisasiPct - timePct) * 10) / 10;

  return (
    <div className="space-y-6">
      {/* 1. Header Card - Visual Progress Waktu Kontrak vs Fisik */}
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
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${sisaInfo.cls}`}>
              <Clock className="w-4 h-4" />
              {sisaInfo.shortText}
            </span>
          </div>
        </div>

        {/* Breakdown Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tanggal Mulai</div>
            <div className="text-sm font-bold text-slate-800 mt-1">{fmtDate(tgl_mulai)}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Awal Kontrak</div>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Target COD</div>
            <div className="text-sm font-bold text-slate-800 mt-1">{fmtDate(target_cod)}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Batas Akhir Kontrak</div>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Durasi</div>
            <div className="text-sm font-bold text-pln-navy mt-1">
              {duration ? `${duration.totalDays} Hari` : '-'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {duration ? `~${Math.round(duration.totalDays / 30)} Bulan` : '-'}
            </div>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Sisa Waktu</div>
            <div className={`text-sm font-extrabold mt-1 ${sisaInfo.isOverdue ? 'text-red-600' : 'text-pln-blue'}`}>
              {sisaInfo.daysText}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {duration ? `${duration.elapsedDays} hari terpakai` : '-'}
            </div>
          </div>
        </div>

        {/* Comparison Bars: Waktu Berlalu vs Realisasi Fisik */}
        <div className="space-y-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
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
                className={`h-full rounded-full transition-all ${
                  sisaInfo.isOverdue ? 'bg-red-500' : sisaInfo.isExpiringSoon ? 'bg-amber-500' : 'bg-slate-700'
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

          {/* Deviasi Laju Waktu vs Fisik Alert */}
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

      {/* 2. Visual Roadmap Timeline (Step Roadmap) */}
      <Card className="p-5 border-slate-200">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <MilestoneIcon className="w-5 h-5 text-pln-cyan" />
          <h3 className="font-bold text-pln-navy text-base">Roadmap &amp; Milestones Tahapan Pekerjaan</h3>
        </div>

        {milestones.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">Belum ada data milestone tahapan.</div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            {milestones.map((m, idx) => {
              const isDone = m.status === 'Done';
              const isInProgress = m.status === 'In Progress';

              return (
                <div key={m.id || idx} className="relative group">
                  {/* Step Node Icon */}
                  <div
                    className={`absolute -left-6 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-transform group-hover:scale-110 ${
                      isDone
                        ? 'bg-emerald-500 text-white ring-4 ring-emerald-100'
                        : isInProgress
                        ? 'bg-pln-cyan text-white ring-4 ring-cyan-100 animate-pulse'
                        : 'bg-slate-200 text-slate-600 ring-4 ring-slate-100'
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                  </div>

                  {/* Step Content Card */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <h4 className="font-bold text-slate-800 text-sm">{m.nama}</h4>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          isDone
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : isInProgress
                            ? 'bg-cyan-50 text-cyan-700 border-cyan-300'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs text-slate-500 mb-3">
                      <div>
                        Bobot Tahap: <b className="text-slate-700">{m.bobot}%</b>
                      </div>
                      <div>
                        Target Rencana: <b className="text-slate-700">{m.rencana}%</b>
                      </div>
                      <div>
                        Realisasi Fisik: <b className="text-slate-700">{m.realisasi}%</b>
                      </div>
                    </div>

                    <ProgressBar value={m.realisasi} status={m.status} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
