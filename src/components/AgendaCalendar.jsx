import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays, ChevronLeft, ChevronRight, Clock, FileText, MapPin,
  PencilRuler, PlusCircle, Video, CheckCircle2, XCircle,
} from 'lucide-react';
import { Card, Empty } from './ui.jsx';
import { fmtDate, uipShort } from '../utils.js';

// Kalender agenda rapat: menampilkan sebulan penuh, klik tanggal → daftar rapat
// hari itu muncul di panel bawah. Semua data sudah ada di agenda list (tidak ada
// request tambahan), pengelompokan dilakukan di sisi klien per `tgl_rapat`.

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
const STATUS_DOT = {
  Selesai: 'bg-emerald-500',
  Dibatalkan: 'bg-red-400',
  Terjadwal: 'bg-teal-500',
};
const chipCls = (s) => STATUS_CHIP[s] || STATUS_CHIP.Terjadwal;
const dotCls = (s) => STATUS_DOT[s] || STATUS_DOT.Terjadwal;

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

  const shiftMonth = (delta) => setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  const goToday = () => {
    const t = todayKey();
    setViewMonth(startOfMonth(t));
    setSelectedDate(t);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              title="Bulan sebelumnya"
              className="w-9 h-9 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="min-w-[170px] text-center">
              <div className="font-extrabold text-pln-navy leading-tight">{MONTHS_ID[month]} {year}</div>
              <div className="text-[11px] text-slate-500">{monthAgendas.length} agenda rapat bulan ini</div>
            </div>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              title="Bulan berikutnya"
              className="w-9 h-9 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToday}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-pln-blue border border-pln-blue/30 rounded-lg px-3 py-2 hover:bg-pln-lightcyan transition"
            >
              <CalendarDays className="w-4 h-4" /> Bulan Ini
            </button>
            {canManage && (
              <button
                type="button"
                onClick={() => onAddOnDate && onAddOnDate(selectedDate)}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-pln-blue text-white rounded-lg px-3 py-2 hover:bg-pln-navy transition shadow-sm"
              >
                <PlusCircle className="w-4 h-4" /> Tambah Agenda
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1.5">
          {DAYS_ID.map((d) => (
            <div key={d} className="text-center text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
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
                title={inMonth ? `${list.length} agenda` : undefined}
                className={`relative flex flex-col rounded-lg border p-1.5 min-h-[76px] sm:min-h-[104px] text-left transition ${bgCls} ${borderCls} ${inMonth ? 'hover:border-pln-cyan hover:shadow-sm cursor-pointer' : 'opacity-60 cursor-default'}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold ${isToday ? 'bg-pln-cyan text-pln-navy' : inMonth ? 'text-slate-600' : 'text-slate-300'}`}>
                    {d.getDate()}
                  </span>
                  {inMonth && list.length > 0 && (
                    <span className="text-[10px] font-bold text-pln-blue bg-pln-lightcyan/70 border border-pln-cyan/30 rounded-full px-1.5 leading-5">{list.length}</span>
                  )}
                </div>

                {inMonth && list.length > 0 && (
                  <div className="sm:hidden flex flex-wrap gap-1 mt-1">
                    {list.slice(0, 6).map((a) => (
                      <span key={a.id} className={`w-1.5 h-1.5 rounded-full ${dotCls(a.status)}`} />
                    ))}
                  </div>
                )}

                {inMonth && list.length > 0 && (
                  <div className="hidden sm:flex flex-col gap-1 mt-1 overflow-hidden">
                    {list.slice(0, 2).map((a) => (
                      <span key={a.id} className={`truncate rounded px-1 py-0.5 text-[10px] font-semibold border ${chipCls(a.status)}`} title={a.judul}>
                        {a.jam_rapat ? `${String(a.jam_rapat).slice(0, 5)} ` : ''}{a.judul}
                      </span>
                    ))}
                    {list.length > 2 && (
                      <span className="text-[10px] font-bold text-slate-400 pl-1">+{list.length - 2} lagi</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-slate-200 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal-500" /> Terjadwal</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Selesai</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" /> Dibatalkan</span>
          <span className="ml-auto">Klik salah satu tanggal untuk melihat rapat yang akan dilaksanakan.</span>
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
                  <div className={`w-1.5 self-stretch rounded-full ${dotCls(a.status)}`} />
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
