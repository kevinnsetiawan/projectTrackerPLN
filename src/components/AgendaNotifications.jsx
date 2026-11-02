import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CalendarDays, CheckCheck, Clock, MapPin } from 'lucide-react';
import { getUser } from '../auth.js';
import { listAgenda } from '../api.js';
import { isAgendaPic } from '../utils.js';
import { TOPIC, useLive } from '../events.js';

// Notifikasi rapat untuk PIC yang sedang login: rapat berstatus Terjadwal
// dalam 7 hari ke depan. Status "sudah dibaca" disimpan di localStorage per
// akun (tanpa tabel tambahan), sehingga badge tidak kembali setelah refresh.

const UPCOMING_DAYS = 7;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function dayDiff(date, base) {
  const ms = Date.parse(`${date}T00:00:00Z`) - Date.parse(`${base}T00:00:00Z`);
  return Math.round(ms / 86400000);
}

function seenKey(user) {
  return `pln_agenda_notif_seen:${user?.id || 'guest'}`;
}

function readSeen(user) {
  try {
    const v = JSON.parse(localStorage.getItem(seenKey(user)) || '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

function writeSeen(user, value) {
  try {
    localStorage.setItem(seenKey(user), JSON.stringify(value || {}));
  } catch {
    /* localStorage penuh / diblokir: notifikasi tetap jalan tanpa status baca */
  }
}

function humanDay(diff) {
  if (diff === 0) return 'Hari ini';
  if (diff === 1) return 'Besok';
  return `H-${diff}`;
}

export default function AgendaNotifications() {
  const user = useMemo(() => getUser(), []);
  const navigate = useNavigate();
  const [agendas, setAgendas] = useState([]);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(() => readSeen(user));
  const boxRef = useRef(null);

  const load = useCallback(() => {
    if (!user) return;
    listAgenda().then((r) => setAgendas(r.data || [])).catch(() => {});
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Agenda baru/berubah dari pengguna lain langsung memperbarui notifikasi.
  useLive([TOPIC.AGENDA], load);

  // Tutup panel saat klik di luar.
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const items = useMemo(() => {
    const today = todayKey();
    return agendas
      .filter((a) => isAgendaPic(a, user))
      .filter((a) => a.status !== 'Selesai' && a.status !== 'Dibatalkan')
      .map((a) => {
        const date = String(a.tgl_rapat || '').slice(0, 10);
        return { ...a, _date: date, _diff: date ? dayDiff(date, today) : null };
      })
      .filter((a) => a._date && a._diff >= 0 && a._diff <= UPCOMING_DAYS)
      .sort((x, y) => `${x._date} ${x.jam_rapat || '99:99'}`.localeCompare(`${y._date} ${y.jam_rapat || '99:99'}`));
  }, [agendas, user]);

  if (!user) return null;

  const unread = items.filter((a) => !seen[`${a.id}:${a._date}`]).length;

  function markAllRead() {
    const next = { ...seen };
    for (const a of items) next[`${a.id}:${a._date}`] = true;
    setSeen(next);
    writeSeen(user, next);
  }

  function openItem(a) {
    const key = `${a.id}:${a._date}`;
    const next = { ...seen, [key]: true };
    setSeen(next);
    writeSeen(user, next);
    setOpen(false);
    navigate(`/agenda?tgl=${a._date}&pic=me`);
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Notifikasi rapat"
        aria-label={`Notifikasi rapat${unread ? ` (${unread} belum dibaca)` : ''}`}
        className="relative p-2 text-slate-500 hover:text-pln-blue transition rounded-lg hover:bg-slate-100"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-3xs font-bold flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-1.5rem))] bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
          <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-slate-100">
            <div className="min-w-0">
              <div className="font-bold text-pln-navy text-sm">Notifikasi Rapat</div>
              <div className="text-3xs text-slate-500 truncate">
                PIC: {user.nama} &bull; {UPCOMING_DAYS} hari ke depan
              </div>
            </div>
            <button
              type="button"
              onClick={markAllRead}
              disabled={!unread}
              className="shrink-0 inline-flex items-center gap-1 text-2xs font-bold text-pln-blue border border-pln-blue/30 rounded-lg px-2 py-1 hover:bg-pln-lightcyan transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Dibaca
            </button>
          </div>

          <ul className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {items.length === 0 ? (
              <li className="px-4 py-6 text-center text-xs text-slate-500">
                Tidak ada rapat untuk PIC Anda dalam {UPCOMING_DAYS} hari ke depan.
              </li>
            ) : items.map((a) => {
              const key = `${a.id}:${a._date}`;
              const isUnread = !seen[key];
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => openItem(a)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-start gap-2">
                      <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${isUnread ? 'bg-red-500' : 'bg-slate-300'}`} />
                      <div className="min-w-0 flex-1">
                        <div className={`text-xs text-pln-navy leading-snug ${isUnread ? 'font-bold' : 'font-semibold'}`}>
                          {a.judul}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-3xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" /> {humanDay(a._diff)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {a.jam_rapat ? String(a.jam_rapat).slice(0, 5) : '-'}
                          </span>
                          {a.project_kode && <span className="font-mono font-bold text-pln-blue">{a.project_kode}</span>}
                        </div>
                        {a.lokasi && (
                          <div className="inline-flex items-center gap-1 mt-0.5 text-3xs text-slate-400 max-w-full">
                            <MapPin className="w-3 h-3 shrink-0" /> <span className="truncate">{a.lokasi}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50">
            <Link
              to="/agenda"
              onClick={() => setOpen(false)}
              className="text-2xs font-bold text-pln-blue hover:underline"
            >
              Buka Agenda &amp; Rekap
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
