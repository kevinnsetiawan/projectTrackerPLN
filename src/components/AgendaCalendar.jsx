import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays, ChevronLeft, ChevronRight, Clock, FileText, MapPin,
  PencilRuler, PlusCircle, Video, CheckCircle2, XCircle,
} from 'lucide-react';
import { Card, Empty } from './ui.jsx';
import { fmtDate, uipShort, pjFromOrganisasi } from '../utils.js';

// Kalender agenda rapat: menampilkan sebulan penuh, klik tanggal → daftar rapat
// hari itu muncul di panel bawah. Semua data sudah ada di agenda list (tidak ada
// request tambahan), pengelompokan dilakukan di sisi klien per `tgl_rapat`.
// Warna titik/strip rapat = penanggung jawab kontrak (lihat `pjKey`) dan
// legendanya dicetak di bawah kalender untuk bulan berjalan.

const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DAYS_ID = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']; // pekan dimulai Senin

const pad2 = (n) => String(n).padStart(2, '0');
const dateKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const todayKey = () => dateKey(new Date());

function parseKey(value) {
  const s = String(value || '').slice(0, 10);
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function startOfMonth(value) {
  const d = parseKey(value) || new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

const STATUS_CHIP = {
  Selesai: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Dibatalkan: 'bg-red-100 text-red-700 border-red-200',
  Terjadwal: 'bg-teal-100 text-teal-800 border-teal-200',
};
const chipCls = (s) => STATUS_CHIP[s] || STATUS_CHIP.Terjadwal;

// Warna rapat ditentukan oleh penanggung jawab kontrak. Urutan prioritas:
// 1) kolom "Penanggung Jawab" yang diisi di form agenda,
// 2) baris pertama field "Organisasi Proyek" kontrak (lihat pjFromOrganisasi di src/utils.js),
// 3) kode kontrak (kalau organisasi belum diisi), 4) label UMUM untuk agenda lintas kontrak.
const PJ_PALETTE = [
  'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-fuchsia-500', 'bg-pink-500',
  'bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500',
  'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500',
  'bg-purple-500', 'bg-slate-500',
];

const clipName = (s) => (s.length > 44 ? `${s.slice(0, 43)}…` : s);

function pjKey(a, umumLabel) {
  const explicit = String(a?.penanggung_jawab || '').trim();
  if (explicit) return clipName(explicit);
  if (!a?.project_id) return umumLabel || 'UMUM';
  const fromOrg = pjFromOrganisasi(a.project_organisasi || a.organisasi);
  if (fromOrg) return clipName(fromOrg);
  return String(a?.project_kode || '').trim() || umumLabel || 'UMUM';
}

const byTime = (a, b) => {
  const ta = String(a.jam_rapat || '99:99');
  const tb = String(b.jam_rapat || '99:99');
  return ta.localeCompare(tb) || (Number(a.id) - Number(b.id));
};

/**
 * @param {object[]} agendas   seluruh agenda rapat (list agenda)
 * @param {string}   anchorDate  tanggal acuan 'YYYY-MM-DD' (dari filter halaman)
 * @param {boolean}  canManage  tampilkan aksi tambah/edit
 * @param {string}   umumLabel   label agenda lintas kontrak
 * @param {(date:string)=>void} onAddOnDate
 * @param {(a:object)=>void}    onOpenAgenda
 * @param {(a:object)=>void}    onEditAgenda
 */
export default function AgendaCalendar({
  agendas = [], anchorDate, canManage = false, umumLabel = 'UMUM',
  onAddOnDate, onOpenAgenda, onEditAgenda,
}) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(anchorDate));
  const [selectedDate, setSelectedDate] = useState(() => String(anchorDate || todayKey()).slice(0, 10));

  // Ikuti perubahan "Tanggal Acuan" di halaman (mis. tombol Hari Ini).
  useEffect(() => {
    const base = String(anchorDate || todayKey()).slice(0, 10);
    setViewMonth(startOfMonth(base));
    setSelectedDate(base);
  }, [anchorDate]);

  const byDate = useMemo(() => {
    const map = new Map();
    for (const a of agendas) {
      const k = String(a.tgl_rapat || '').slice(0, 10);
      if (!k) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(a);
    }
    for (const list of map.values()) list.sort(byTime);
    return map;
  }, [agendas]);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7; // Senin = 0
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => new Date(year, month, i - startOffset + 1));

  const today = todayKey();
  const monthPrefix = `${year}-${pad2(month + 1)}`;
  const monthAgendas = useMemo(
    () => agendas.filter((a) => String(a.tgl_rapat || '').slice(0, 7) === monthPrefix),
    [agendas, monthPrefix],
  );
  const selectedList = byDate.get(selectedDate) || [];

  // Peta warna: satu penanggung jawab = satu warna. Kunci diurutkan alfabetis
  // agar warnanya stabil walau data agenda bertambah/bertukar urutan.
  const colorMap = useMemo(() => {
    const keys = [...new Set(agendas.map((a) => pjKey(a, umumLabel)))];
    keys.sort((x, y) => x.localeCompare(y, 'id'));
    const map = new Map();
    keys.forEach((k, i) => map.set(k, PJ_PALETTE[i % PJ_PALETTE.length]));
    return map;
  }, [agendas, umumLabel]);
  const colorOf = (a) => colorMap.get(pjKey(a, umumLabel)) || 'bg-slate-400';

  // Legenda hanya menampilkan penanggung jawab yang punya agenda di bulan berjalan.
  const legend = useMemo(() => {
    const seen = new Map();
    for (const a of monthAgendas) {
      const k = pjKey(a, umumLabel);
      seen.set(k, (seen.get(k) || 0) + 1);
    }
    return [...seen.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((x, y) => x.key.localeCompare(y.key, 'id'));
  }, [monthAgendas, umumLabel]);

  const shiftMonth = (delta) => setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  const goToday = () => {
    const t = todayKey();
    setViewMonth(startOfMonth(t));
    setSelectedDate(t);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[22rem_minmax(0,1fr)] gap-4 items-start">
      <Card className="p-3 sm:p-4 max-w-lg lg:max-w-none mx-auto w-full">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              title="Bulan sebelumnya"
              className="w-8 h-8 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="min-w-[130px] text-center">
              <div className="font-extrabold text-pln-navy leading-tight text-sm">{MONTHS_ID[month]} {year}</div>
              <div className="text-[10px] text-slate-500">{monthAgendas.length} agenda bulan ini</div>
            </div>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              title="Bulan berikutnya"
              className="w-8 h-8 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToday}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-pln-blue border border-pln-blue/30 rounded-lg px-2.5 py-1.5 hover:bg-pln-lightcyan transition"
            >
              <CalendarDays className="w-3.5 h-3.5" /> Bulan Ini
            </button>
            {canManage && (
              <button
                type="button"
                onClick={() => onAddOnDate && onAddOnDate(selectedDate)}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-pln-blue text-white rounded-lg px-2.5 py-1.5 hover:bg-pln-navy transition shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Tambah
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAYS_ID.map((d) => (
            <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 py-0.5">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((d) => {
            const key = dateKey(d);
            const inMonth = d.getMonth() === month;
            const isToday = key === today;
            const isSelected = key === selectedDate;
            const list = byDate.get(key) || [];
            const bgCls = !inMonth
              ? 'bg-slate-50/70'
              : isToday ? 'bg-pln-lightcyan/50' : isSelected ? 'bg-pln-lightcyan/30' : 'bg-white';
            const borderCls = isSelected
              ? 'border-pln-blue ring-2 ring-pln-blue/30'
              : isToday ? 'border-pln-cyan' : 'border-slate-200';
            return (
              <button
                key={key}
                type="button"
                disabled={!inMonth}
                onClick={() => inMonth && setSelectedDate(key)}
                title={inMonth ? (list.length ? `${list.length} agenda — PJ: ${[...new Set(list.map((a) => pjKey(a, umumLabel)))].join(', ')} — klik untuk lihat detail` : 'Klik untuk lihat detail tanggal ini') : undefined}
                className={`relative flex flex-col items-center rounded-md border px-0.5 py-1 min-h-[42px] sm:min-h-[50px] transition ${bgCls} ${borderCls} ${inMonth ? 'hover:border-pln-cyan hover:bg-pln-lightcyan/40 cursor-pointer' : 'opacity-50 cursor-default'}`}
              >
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold ${isToday ? 'bg-pln-cyan text-pln-navy' : inMonth ? 'text-slate-700' : 'text-slate-300'}`}>
                  {d.getDate()}
                </span>
                {inMonth && list.length > 0 && (
                  <span className="flex items-center justify-center gap-0.5 mt-0.5 h-1.5">
                    {list.slice(0, 4).map((a) => (
                      <span key={a.id} className={`w-1.5 h-1.5 rounded-full ${colorOf(a)}`} />
                    ))}
                    {list.length > 4 && <span className="text-[9px] font-bold text-slate-400 leading-none">+{list.length - 4}</span>}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-3 pt-3 border-t border-slate-200 text-[11px] text-slate-500">
          {legend.length > 0 && (
            <div className="mb-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Penanggung Jawab
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                {legend.map((it) => (
                  <span key={it.key} className="inline-flex items-center gap-1.5 min-w-0 max-w-full" title={`${it.key} — ${it.count} agenda bulan ini`}>
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colorMap.get(it.key) || 'bg-slate-400'}`} />
                    <span className="truncate min-w-0">
                      <span className="font-semibold text-slate-700">{it.key}</span>
                      <span className="text-slate-400"> ({it.count})</span>
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
          <p>Klik tanggal untuk melihat detail rapat hari itu.</p>
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-pln-blue" />
            <h3 className="font-bold text-pln-navy">Rapat {fmtDate(selectedDate)}</h3>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5 border border-slate-200">{selectedList.length}</span>
          </div>
          {selectedDate === today && <span className="text-[11px] font-bold text-pln-cyan">Hari ini</span>}
        </div>

        {selectedList.length === 0 ? (
          <div>
            <Empty message="Tidak ada agenda rapat pada tanggal ini." />
            {canManage && (
              <div className="text-center pb-3">
                <button
                  type="button"
                  onClick={() => onAddOnDate && onAddOnDate(selectedDate)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold bg-pln-blue text-white rounded-lg px-4 py-2 hover:bg-pln-navy transition shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" /> Tambah agenda di tanggal ini
                </button>
              </div>
            )}
          </div>
        ) : (
          <ul className="space-y-2.5">
            {selectedList.map((a) => {
              const amsDone = a.status_surat === 'Sudah Dibuat di AMS';
              return (
                <li key={a.id} className="flex gap-3 bg-white rounded-lg border border-slate-200 p-3 hover:shadow-sm transition">
                  <div className={`w-1.5 self-stretch rounded-full ${colorOf(a)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-pln-navy">
                        <Clock className="w-3.5 h-3.5 text-pln-blue" />
                        {a.jam_rapat ? String(a.jam_rapat).slice(0, 5) : 'Jam belum diatur'}
                      </span>
                      <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${chipCls(a.status)}`}>{a.status || 'Terjadwal'}</span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${amsDone ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {amsDone ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} AMS
                      </span>
                    </div>

                    <div className="mt-1 font-semibold text-sm text-slate-800 leading-snug">{a.judul}</div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                      <span className="font-mono font-bold text-pln-blue">{a.project_kode || umumLabel}</span>
                      {(a.project_id || a.penanggung_jawab) && (
                        <span className="inline-flex items-center gap-1 min-w-0" title="Penanggung jawab">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${colorOf(a)}`} />
                          <span className="truncate font-semibold text-slate-600">{pjKey(a, umumLabel)}</span>
                        </span>
                      )}
                      {a.project_uip ? <span>{uipShort(a.project_uip)}</span> : <span>lintas kontrak</span>}
                      {a.lokasi && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {a.lokasi}</span>}
                      {a.link_video && (
                        <a href={a.link_video} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-pln-cyan hover:underline">
                          <Video className="w-3 h-3" /> Link
                        </a>
                      )}
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenAgenda && onOpenAgenda(a)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-pln-blue border border-pln-blue/30 rounded-lg px-2.5 py-1 hover:bg-pln-lightcyan transition"
                      >
                        <FileText className="w-3.5 h-3.5" /> Lihat Pokok Rapat
                      </button>
                      {a.project_id && (
                        <Link
                          to={`/projects/${a.project_id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 border border-slate-300 rounded-lg px-2.5 py-1 hover:bg-slate-100 transition"
                        >
                          Buka Proyek
                        </Link>
                      )}
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => onEditAgenda && onEditAgenda(a)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-pln-blue border border-pln-blue/30 rounded-lg px-2.5 py-1 hover:bg-pln-lightcyan transition"
                        >
                          <PencilRuler className="w-3.5 h-3.5" /> Edit
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
