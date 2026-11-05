import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Clock, FileText, MapPin,
  PencilRuler, PlusCircle, PowerOff, Video,
} from 'lucide-react';
import { Card, Empty, Modal } from './ui.jsx';
import { fmtDate, isAgendaPadam, padamWaktuRange, pjFromOrganisasi, uipShort } from '../utils.js';
import { agendaHour, dateKey, pad2, parseCalendarDate, shiftCalendarDate, startOfWeek } from './agendaCalendarUtils.js';

const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const PALETTE = [
  { dot: 'bg-blue-500', card: 'bg-blue-50 border-blue-200' },
  { dot: 'bg-rose-500', card: 'bg-rose-50 border-rose-200' },
  { dot: 'bg-emerald-500', card: 'bg-emerald-50 border-emerald-200' },
  { dot: 'bg-amber-500', card: 'bg-amber-50 border-amber-200' },
  { dot: 'bg-violet-500', card: 'bg-violet-50 border-violet-200' },
  { dot: 'bg-cyan-500', card: 'bg-cyan-50 border-cyan-200' },
  { dot: 'bg-fuchsia-500', card: 'bg-fuchsia-50 border-fuchsia-200' },
  { dot: 'bg-orange-500', card: 'bg-orange-50 border-orange-200' },
];
const STATUS_CHIP = {
  Selesai: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Dibatalkan: 'bg-red-100 text-red-700 border-red-200',
  Terjadwal: 'bg-teal-100 text-teal-800 border-teal-200',
};

function statusClass(status) { return STATUS_CHIP[status] || STATUS_CHIP.Terjadwal; }
function hashKey(value) { let hash = 0; for (const char of String(value)) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0; return Math.abs(hash) % PALETTE.length; }
function pjKey(agenda, umumLabel) {
  const explicit = String(agenda?.penanggung_jawab || '').trim();
  if (explicit) return explicit.slice(0, 44);
  if (!agenda?.project_id) return umumLabel || 'UMUM';
  return pjFromOrganisasi(agenda.project_organisasi || agenda.organisasi) || agenda.project_kode || umumLabel || 'UMUM';
}
function sortByTime(a, b) { return String(a.jam_rapat || '99:99').localeCompare(String(b.jam_rapat || '99:99')) || Number(a.id) - Number(b.id); }

export default function AgendaCalendar({
  agendas = [], anchorDate, canManage = false, canEditAgenda = () => canManage, umumLabel = 'UMUM',
  onAddOnDate, onOpenAgenda, onEditAgenda,
}) {
  const [view, setView] = useState('week');
  const [anchor, setAnchor] = useState(() => parseCalendarDate(anchorDate));
  const [selectedDate, setSelectedDate] = useState(() => String(anchorDate || dateKey(new Date())).slice(0, 10));
  const [detailOpen, setDetailOpen] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const next = parseCalendarDate(anchorDate);
    setAnchor(next);
    setSelectedDate(String(anchorDate || dateKey(next)).slice(0, 10));
  }, [anchorDate]);

  useEffect(() => {
    if (view !== 'week' || !scrollRef.current) return undefined;
    const frame = requestAnimationFrame(() => {
      const container = scrollRef.current;
      const hourEight = container?.querySelector('[data-hour="8"]');
      if (container && hourEight) container.scrollTop += hourEight.getBoundingClientRect().top - container.getBoundingClientRect().top;
    });
    return () => cancelAnimationFrame(frame);
  }, [view]);

  const byDate = useMemo(() => {
    const grouped = new Map();
    for (const agenda of agendas) {
      const key = String(agenda.tgl_rapat || '').slice(0, 10);
      if (!key) continue;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(agenda);
    }
    grouped.forEach((list) => list.sort(sortByTime));
    return grouped;
  }, [agendas]);

  const paletteOf = (agenda) => PALETTE[hashKey(pjKey(agenda, umumLabel))];
  const weekStart = startOfWeek(anchor);
  const weekDays = Array.from({ length: 7 }, (_, index) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + index));
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const monthOffset = (monthStart.getDay() + 6) % 7;
  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  const monthCells = Array.from({ length: Math.ceil((monthOffset + daysInMonth) / 7) * 7 }, (_, index) => new Date(anchor.getFullYear(), anchor.getMonth(), index - monthOffset + 1));
  const selectedList = byDate.get(selectedDate) || [];
  const today = dateKey(new Date());
  const periodAgendas = view === 'week'
    ? weekDays.flatMap((day) => byDate.get(dateKey(day)) || [])
    : agendas.filter((agenda) => String(agenda.tgl_rapat || '').slice(0, 7) === `${anchor.getFullYear()}-${pad2(anchor.getMonth() + 1)}`);
  const legend = [...new Set(periodAgendas.map((agenda) => pjKey(agenda, umumLabel)))].sort((a, b) => a.localeCompare(b, 'id'));

  function shiftPeriod(amount) {
    setAnchor((current) => {
      const next = shiftCalendarDate(current, amount, view);
      setSelectedDate(view === 'week' ? dateKey(startOfWeek(next)) : dateKey(next));
      return next;
    });
  }
  function goToday() { const current = new Date(); setAnchor(current); setSelectedDate(dateKey(current)); }
  function openDate(key) { setSelectedDate(key); setDetailOpen(true); }
  function openAgenda(agenda) { setSelectedDate(String(agenda.tgl_rapat || '').slice(0, 10)); if (onOpenAgenda) onOpenAgenda(agenda); else setDetailOpen(true); }
  function addForSlot(day, hour = null) {
    if (!canManage || !onAddOnDate) return;
    onAddOnDate(dateKey(day), hour === null ? '' : `${pad2(hour)}:00`);
  }

  function AgendaCard({ agenda, compact = false }) {
    const palette = paletteOf(agenda);
    return (
      <button type="button" title={`${agenda.judul}${agenda.lokasi ? ` — ${agenda.lokasi}` : ''}`} onClick={() => openAgenda(agenda)} className={`w-full rounded-lg border px-2 py-1.5 text-left transition hover:-translate-y-px hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pln-cyan ${palette.card}`}>
        <div className="flex items-center gap-1 text-3xs font-bold text-slate-500"><Clock className="h-3 w-3 shrink-0" /> {agenda.jam_rapat ? String(agenda.jam_rapat).slice(0, 5) : 'Tanpa jam'}</div>
        <div className={`${compact ? 'line-clamp-2' : ''} mt-0.5 text-xs font-bold leading-snug text-slate-800`}>{agenda.judul}</div>
        <div className="mt-0.5 flex items-center gap-1 text-3xs text-slate-500"><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${palette.dot}`} /><span className="truncate">{pjKey(agenda, umumLabel)}</span></div>
      </button>
    );
  }

  function AddSlot({ day, hour = null, compact = false, iconOnly = false }) {
    if (!canManage) return null;
    const label = hour === null ? `Tambah agenda ${fmtDate(dateKey(day))}` : `Tambah agenda ${fmtDate(dateKey(day))} pukul ${pad2(hour)}:00`;
    return <button type="button" aria-label={label} onClick={() => addForSlot(day, hour)} className={`rounded-md border border-dashed border-slate-200 text-center text-3xs font-semibold text-slate-400 transition hover:border-pln-cyan hover:bg-pln-lightcyan/30 hover:text-pln-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pln-cyan ${iconOnly ? 'h-8 w-8 shrink-0 px-0 py-0' : compact ? 'min-h-7 w-full px-1 py-1' : 'min-h-10 w-full px-2 py-2'}`}>{iconOnly ? '+' : '+ Tambah'}</button>;
  }

  function MobileDayList() {
    const day = byDate.get(selectedDate) || [];
    return <div className="sm:hidden"><div className="mb-2 flex items-center justify-between border-b border-slate-200 pb-2"><div className="text-xs font-bold text-pln-navy">{fmtDate(selectedDate)}</div><div className="flex items-center gap-3"><button type="button" onClick={() => openDate(selectedDate)} className="text-2xs font-bold text-pln-blue">Lihat detail</button><AddSlot day={parseCalendarDate(selectedDate)} compact /></div></div>{day.length ? <div className="space-y-2">{day.map((agenda) => <AgendaCard key={agenda.id} agenda={agenda} />)}</div> : <Empty message="Tidak ada agenda di tanggal ini." />}</div>;
  }

  return (
    <>
      <style>{`.agenda-week-header,.agenda-week-grid,.agenda-week-no-time{grid-template-columns:repeat(7,minmax(0,1fr))}.agenda-empty-slot>span{opacity:0}.agenda-empty-slot:hover>span,.agenda-empty-slot:focus-visible>span{opacity:1}@media (min-width:640px){.agenda-week-header,.agenda-week-grid,.agenda-week-no-time{grid-template-columns:52px repeat(7,minmax(0,1fr))}}`}</style>
      <Card className="w-full border-slate-200 p-3 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button type="button" aria-label="Periode sebelumnya" onClick={() => shiftPeriod(-1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pln-cyan"><ChevronLeft className="h-4 w-4" /></button>
            <div className="min-w-0 flex-1 text-center sm:min-w-44"><div className="break-words text-sm font-extrabold text-pln-navy sm:text-base">{view === 'week' ? `${weekDays[0].getDate()} ${MONTHS[weekDays[0].getMonth()]} – ${weekDays[6].getDate()} ${MONTHS[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}` : `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`}</div><div className="text-2xs text-slate-500">{periodAgendas.length} agenda ditampilkan</div></div>
            <button type="button" aria-label="Periode berikutnya" onClick={() => shiftPeriod(1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pln-cyan"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="flex items-center gap-2"><button type="button" onClick={goToday} className="rounded-lg border border-pln-blue/30 px-3 py-2 text-2xs font-bold text-pln-blue hover:bg-pln-lightcyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pln-cyan">Hari ini</button><div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Tampilan kalender"><button type="button" aria-pressed={view === 'week'} onClick={() => setView('week')} className={`rounded-md px-3 py-1.5 text-2xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pln-cyan ${view === 'week' ? 'bg-white text-pln-navy shadow-sm' : 'text-slate-500'}`}>Minggu</button><button type="button" aria-pressed={view === 'month'} onClick={() => setView('month')} className={`rounded-md px-3 py-1.5 text-2xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pln-cyan ${view === 'month' ? 'bg-white text-pln-navy shadow-sm' : 'text-slate-500'}`}>Bulan</button></div>{canManage && <button type="button" onClick={() => addForSlot(parseCalendarDate(selectedDate))} className="inline-flex items-center gap-1.5 rounded-lg bg-pln-blue px-3 py-2 text-2xs font-bold text-white hover:bg-pln-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pln-cyan"><PlusCircle className="h-3.5 w-3.5" /> Tambah</button>}</div>
        </div>

        {view === 'week' ? (
          <>
            <div className="agenda-week-header grid grid-cols-7 border-b border-slate-200 sm:grid-cols-[52px_repeat(7,minmax(0,1fr))]"><div className="hidden border-r border-slate-100 sm:block" />{weekDays.map((day, index) => <button key={dateKey(day)} type="button" onClick={() => setSelectedDate(dateKey(day))} className={`border-r border-slate-100 py-2 text-center last:border-r-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pln-cyan ${dateKey(day) === selectedDate ? 'bg-pln-lightcyan/40' : ''}`}><div className="text-3xs font-bold uppercase text-slate-400">{DAYS[index]}</div><div className={`mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${dateKey(day) === today ? 'bg-pln-cyan text-pln-navy' : 'text-slate-700'}`}>{day.getDate()}</div></button>)}</div>
            <div className="hidden sm:block"><div ref={scrollRef} className="max-h-[680px] overflow-y-auto"><div className="agenda-week-grid grid grid-cols-[52px_repeat(7,minmax(0,1fr))]">{Array.from({ length: 24 }, (_, hour) => <React.Fragment key={hour}><div data-hour={hour} className="min-h-16 border-b border-r border-slate-100 px-1 pt-1 text-3xs text-slate-400">{pad2(hour)}.00</div>{weekDays.map((day) => { const list = (byDate.get(dateKey(day)) || []).filter((agenda) => agendaHour(agenda) === hour); const label = `Tambah agenda ${fmtDate(dateKey(day))} pukul ${pad2(hour)}:00`; if (!list.length && canManage) return <button key={`${dateKey(day)}-${hour}`} type="button" aria-label={label} onClick={() => addForSlot(day, hour)} className="agenda-empty-slot min-h-16 border-b border-r border-slate-100 bg-slate-50/30 p-1 text-center transition hover:bg-pln-lightcyan/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pln-cyan"><span className="text-3xs font-semibold text-pln-blue">+ Tambah</span></button>; return <div key={`${dateKey(day)}-${hour}`} className={`min-h-16 space-y-1 border-b border-r border-slate-100 p-1 ${list.length ? 'bg-white' : 'bg-slate-50/30'}`}>{list.map((agenda) => <AgendaCard key={agenda.id} agenda={agenda} compact />)}<AddSlot day={day} hour={hour} compact /></div>; })}</React.Fragment>)}</div>{weekDays.some((day) => (byDate.get(dateKey(day)) || []).some((agenda) => agendaHour(agenda) === null)) && <div className="agenda-week-no-time grid grid-cols-[52px_repeat(7,minmax(0,1fr))] border-t border-slate-200"><div className="border-r border-slate-100 px-1 pt-2 text-3xs text-slate-400">—</div>{weekDays.map((day) => <div key={`no-time-${dateKey(day)}`} className="space-y-1 border-r border-slate-100 bg-slate-50/30 p-1">{(byDate.get(dateKey(day)) || []).filter((agenda) => agendaHour(agenda) === null).map((agenda) => <AgendaCard key={agenda.id} agenda={agenda} compact />)}<AddSlot day={day} compact /></div>)}</div>}</div></div>
            <MobileDayList />
          </>
        ) : (
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-slate-200">{DAYS.map((day) => <div key={day} className="bg-slate-50 py-2 text-center text-3xs font-bold uppercase text-slate-400">{day}</div>)}{monthCells.map((day) => { const key = dateKey(day); const list = byDate.get(key) || []; const inMonth = day.getMonth() === anchor.getMonth(); return <div key={key} className={`min-h-24 bg-white p-2 align-top ${!inMonth ? 'opacity-40' : ''}`}><div className="flex items-start justify-between gap-1"><button type="button" disabled={!inMonth} onClick={() => inMonth && openDate(key)} className={`text-left text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pln-cyan ${key === today ? 'text-pln-blue' : 'text-slate-700'}`}>{day.getDate()}</button>{inMonth && <AddSlot day={day} iconOnly />}</div><div className="mt-1 space-y-1">{list.slice(0, 3).map((agenda) => <AgendaCard key={agenda.id} agenda={agenda} compact />)}{list.length > 3 && <div className="text-3xs text-slate-400">+{list.length - 3} lagi</div>}</div></div>; })}</div>
        )}

        {legend.length > 0 && <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3">{legend.map((key) => <span key={key} className="inline-flex items-center gap-1.5 text-2xs text-slate-600"><span className={`h-2.5 w-2.5 rounded-full ${PALETTE[hashKey(key)].dot}`} />{key}</span>)}</div>}
      </Card>

      {detailOpen && <Modal title={`Rapat ${fmtDate(selectedDate)}`} onClose={() => setDetailOpen(false)} size="max-w-2xl"><div className="mb-3 text-2xs text-slate-500">{selectedList.length} agenda</div>{selectedList.length ? <ul className="space-y-2.5">{selectedList.map((agenda) => <li key={agenda.id} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3"><div className={`w-2 shrink-0 rounded-full ${paletteOf(agenda).dot}`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1 text-xs font-bold text-pln-navy"><Clock className="h-3.5 w-3.5 text-pln-blue" />{agenda.jam_rapat ? String(agenda.jam_rapat).slice(0, 5) : 'Jam belum diatur'}</span><span className={`rounded-full border px-2 py-0.5 text-3xs font-bold ${statusClass(agenda.status)}`}>{agenda.status || 'Terjadwal'}</span>{isAgendaPadam(agenda) && <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-3xs font-bold text-red-700"><PowerOff className="h-3 w-3" />Padam</span>}<span className="text-3xs font-semibold text-slate-500">{agenda.status_surat || 'Surat belum dibuat'}</span></div><div className="mt-1 font-semibold text-sm leading-snug text-slate-800">{agenda.judul}</div><div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-slate-500"><span className="font-mono font-bold text-pln-blue">{agenda.project_kode || umumLabel}</span><span>{pjKey(agenda, umumLabel)}</span>{agenda.project_uip && <span>{uipShort(agenda.project_uip)}</span>}{agenda.lokasi && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{agenda.lokasi}</span>}{agenda.link_video && <a href={agenda.link_video} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-pln-cyan hover:underline"><Video className="h-3 w-3" />Link</a>}</div>{agenda.topik && <div className="mt-2 text-2xs text-slate-600"><b>Topik:</b> {agenda.topik}</div>}{agenda.peserta && <div className="mt-1 text-2xs text-slate-600"><b>Peserta:</b> {agenda.peserta}</div>}{agenda.hasil && <div className="mt-1 whitespace-pre-wrap text-2xs text-slate-600"><b>Hasil:</b> {agenda.hasil}</div>}{isAgendaPadam(agenda) && (agenda.jenis_padam || agenda.penyebab_padam || padamWaktuRange(agenda)) && <div className="mt-1 text-2xs text-red-600">{[agenda.jenis_padam, padamWaktuRange(agenda)].filter(Boolean).join(' • ')}{agenda.penyebab_padam && ` — ${agenda.penyebab_padam}`}</div>}<div className="mt-2.5 flex flex-wrap gap-2">{onOpenAgenda && <button type="button" onClick={() => { setDetailOpen(false); onOpenAgenda(agenda); }} className="inline-flex items-center gap-1 rounded-lg border border-pln-blue/30 px-2.5 py-1 text-2xs font-bold text-pln-blue hover:bg-pln-lightcyan"><FileText className="h-3.5 w-3.5" />Lihat Pokok Rapat</button>}{agenda.project_id && <Link to={`/projects/${agenda.project_id}`} className="rounded-lg border border-slate-300 px-2.5 py-1 text-2xs font-bold text-slate-600 hover:bg-slate-100">Buka Proyek</Link>}{canEditAgenda(agenda) && <button type="button" onClick={() => { setDetailOpen(false); onEditAgenda?.(agenda); }} className="inline-flex items-center gap-1 rounded-lg border border-pln-blue/30 px-2.5 py-1 text-2xs font-bold text-pln-blue hover:bg-pln-lightcyan"><PencilRuler className="h-3.5 w-3.5" />Edit</button>}</div></div></li>)}</ul> : <div><Empty message="Tidak ada agenda rapat pada tanggal ini." />{canManage && <button type="button" onClick={() => { setDetailOpen(false); addForSlot(parseCalendarDate(selectedDate)); }} className="mx-auto flex items-center gap-1.5 rounded-lg bg-pln-blue px-4 py-2 text-xs font-bold text-white"><PlusCircle className="h-4 w-4" />Tambah agenda di tanggal ini</button>}</div>}</Modal>}
    </>
  );
}
