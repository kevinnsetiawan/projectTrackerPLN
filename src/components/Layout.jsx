import React, { Suspense, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard, FolderKanban, Map, AlertTriangle, FileBarChart, Menu, X, PencilRuler, LogOut, FileCheck, CalendarDays, ClipboardCheck
} from 'lucide-react';
import { getUser, clearSession, ROLE_LABELS, canAction, getUnitId, setUnitId, setAuthState } from '../auth.js';
import { getMe, cancelUnitRequests } from '../api.js';
import { disconnectLive, useLiveStatus } from '../events.js';
import { preloadPath } from '../lazyPages.js';
import AgendaNotifications from './AgendaNotifications.jsx';
import logoPln from '../assets/pln-logo.png';

export const ROLE_BADGE = {
  admin: 'bg-pln-lightcyan text-pln-blue',
  vendor: 'bg-amber-100 text-amber-700',
  dalkon: 'bg-violet-100 text-violet-700',
  enjin: 'bg-emerald-100 text-emerald-700',
  staff: 'bg-slate-200 text-slate-700',
};

const NAV = [
  { to: '/agenda', label: 'Agenda & Rekap', icon: CalendarDays },
  { to: '/dashboard', label: 'Dashboard KPI', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Daftar Proyek', icon: FolderKanban },
  { to: '/drawings', label: 'Approval Drawing', icon: FileCheck },
  { to: '/instruksi', label: 'Approval IK', icon: ClipboardCheck },
  { to: '/gis', label: 'Peta GIS Proyek', icon: Map },
  { to: '/kendala', label: 'Issue & Kendala', icon: AlertTriangle },
  { to: '/reports', label: 'Laporan Eksekutif', icon: FileBarChart },
  { to: '/users', label: 'Manajemen Pengguna', icon: PencilRuler, capability: 'user_manage' },
  { to: '/organization', label: 'Organisasi & Keanggotaan', icon: FolderKanban, capability: 'unit_manage' },
  { to: '/security-matrix', label: 'Security Matrix', icon: ClipboardCheck, capability: 'security_matrix' },
];

// Jam dipisah ke komponen sendiri: state per detik hanya me-render ulang jam,
// bukan seluruh Layout (sidebar, header, footer, dan halaman yang sedang aktif).
function Clock() {
  const [now, setNow] = useState(() => new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="hidden md:block text-right">
      <div className="font-bold text-pln-navy tabular-nums">{now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</div>
      <div className="text-2xs text-slate-500">{nowDateString()}</div>
    </div>
  );
}

const LIVE_LABEL = {
  live: { text: 'Realtime', dot: 'bg-emerald-500', pulse: 'pulse-online' },
  connecting: { text: 'Menghubungkan', dot: 'bg-amber-400', pulse: '' },
  offline: { text: 'Mode cadangan', dot: 'bg-amber-500', pulse: '' },
  idle: { text: 'Online', dot: 'bg-slate-300', pulse: '' },
};

export default function Layout() {
  const [open, setOpen] = useState(false);
  const [auth, setAuth] = useState(null);
  const [contextBusy, setContextBusy] = useState(true);
  const [contextError, setContextError] = useState('');
  const [viewKey, setViewKey] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const liveState = useLiveStatus();
  const live = LIVE_LABEL[liveState] || LIVE_LABEL.idle;

  // Role dengan daftar nav eksplisit (ROLE_NAV) hanya melihat menu tersebut.
  function visibleNav() {
    return NAV.filter((n) => !n.capability || canAction(n.capability) || (n.to === '/users' && canAction('membership_manage')));
  }

  async function loadContext(value, changing = false) {
    setContextBusy(true);
    setContextError('');
    if (changing) {
      cancelUnitRequests();
      disconnectLive();
      setUnitId(value);
      setAuth(null);
      setViewKey((key) => key + 1);
      if (!['/organization', '/users', '/security-matrix'].includes(location.pathname)) navigate('/agenda', { replace: true });
    }
    try {
      const next = await getMe();
      setAuthState(next);
      setAuth(next);
    } catch (e) {
      if (e.status === 403 && getUnitId()) {
        setUnitId('');
        try { const next = await getMe(); setAuthState(next); setAuth(next); }
        catch (retry) { setContextError(retry.message); }
      } else if (e.name !== 'AbortError') setContextError(e.message);
    } finally { setContextBusy(false); }
  }
  React.useEffect(() => { loadContext(getUnitId()); }, []);
  const controlPage = ['/organization', '/users', '/security-matrix'].includes(location.pathname);
  const hasContext = auth?.context?.mode === 'unit' || auth?.context?.mode === 'all';

  function handleLogout() {
    cancelUnitRequests();
    disconnectLive();
    clearSession();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex app-bg transition-colors">
      {/* Sidebar terang: identitas PLN tetap hadir lewat logo dan aksen cyan. */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-slate-50 border-r border-slate-200 z-40 transform transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-200">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm shrink-0">
            <div
              className="w-8 h-8 bg-pln-blue"
              style={{
                WebkitMaskImage: `url(${logoPln})`,
                maskImage: `url(${logoPln})`,
                WebkitMaskSize: 'contain',
                maskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskPosition: 'center',
              }}
            />
          </div>
          <div>
            <div className="font-extrabold text-pln-navy leading-tight">PLN PRO-TRACK</div>
            <div className="text-3xs uppercase tracking-widest text-pln-blue">Sistem Monitoring</div>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Tutup menu" className="ml-auto lg:hidden text-slate-400 hover:text-pln-blue">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="px-3 py-5 space-y-1.5 overflow-y-auto max-h-[calc(100vh-170px)]">
          {visibleNav().map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              onMouseEnter={() => preloadPath(to)}
              onFocus={() => preloadPath(to)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive ? 'bg-pln-lightcyan text-pln-blue shadow-sm ring-1 ring-pln-cyan/20' : 'text-slate-600 hover:bg-white hover:text-pln-blue hover:shadow-sm'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 inset-x-0 px-5 py-4 border-t border-slate-200 bg-white/60">
          <div className="text-xs font-semibold text-slate-600">Divisi Konstruksi (MPO)</div>
          <div className="text-2xs text-slate-400">PT PLN (Persero)</div>
        </div>
      </aside>

      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Topbar - adaptif terang/gelap */}
        <header className="sticky top-0 bg-white backdrop-blur border-b-2 border-pln-cyan z-20 transition-colors">
          <div className="flex items-center gap-2 md:gap-4 px-3 sm:px-5 py-3">
            <button onClick={() => setOpen(true)} aria-label="Buka menu" className="lg:hidden text-pln-blue">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base md:text-lg font-bold text-pln-blue leading-tight truncate"><PageTitle /></h1>
              <p className="text-2xs md:text-xs text-slate-500 truncate">PT PLN (Persero) &bull; Sistem Monitoring Pekerjaan Konstruksi</p>
            </div>
            <Clock />
            {user && !contextBusy && hasContext && <AgendaNotifications key={viewKey} />}
            {user && (
              <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                <div className="w-9 h-9 rounded-full bg-pln-gradient text-white flex items-center justify-center font-extrabold text-sm shrink-0">
                  {(user.nama || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block leading-tight">
                  <div className="text-sm font-bold text-pln-navy max-w-40 truncate">{user.nama}</div>
                  <span className={`text-3xs font-bold uppercase px-1.5 py-0.5 rounded ${ROLE_BADGE[user.role] || 'bg-slate-100 text-slate-600'}`}>
                    {user.is_superadmin && !user.role ? 'Admin Pusat' : ROLE_LABELS[user.role] || 'Pilih unit'}
                  </span>
                </div>
                <button onClick={handleLogout} title="Keluar" className="ml-1 p-2 text-slate-400 hover:text-red-500 transition" aria-label="Keluar">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
            <label htmlFor="active-unit" className="text-xs font-bold text-slate-600">Unit aktif</label>
            <select id="active-unit" value={getUnitId()} disabled={contextBusy} onChange={(e) => loadContext(e.target.value, true)} className="min-h-11 max-w-full border border-slate-300 rounded-lg bg-white px-3 py-2 text-sm text-pln-navy">
              <option value="">Pilih unit kerja</option>
              {(auth?.memberships || []).map((membership) => <option key={membership.unit_id} value={membership.unit_id}>{membership.unit.name} — {ROLE_LABELS[membership.role] || membership.role}</option>)}
              {(auth?.memberships || []).some((membership) => membership.unit.kind === 'unit_induk') && <option value="all">Pantau seluruh UPT</option>}
            </select>
            <span className="text-xs text-slate-500">Pilihan berlaku untuk tab ini.</span>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 max-w-[1400px] w-full mx-auto">
          {/* Halaman di-lazy-load: sidebar & header tetap tampil saat chunk
              halaman sedang diunduh (jangan sampai seluruh layout berkedip). */}
          <Suspense
            fallback={
              <div className="flex min-h-[50vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-pln-200 border-t-pln-600" />
                <span className="sr-only">Memuat halaman…</span>
              </div>
            }
          >
            {contextBusy ? <div role="status" className="p-6 text-slate-600">Memuat akses unit…</div> : contextError ? <div role="alert" className="p-4 bg-red-50 text-red-700 rounded-lg">{contextError}<button onClick={() => loadContext(getUnitId())} className="ml-3 underline">Coba lagi</button></div> : !hasContext && !controlPage ? <div className="p-6 bg-white rounded-xl border border-slate-200"><h2 className="text-lg font-bold text-pln-navy">Pilih unit kerja</h2><p className="mt-2 text-sm text-slate-600">Pilih unit aktif untuk membuka data proyek dan agenda. {auth?.setupRequired ? 'Admin pusat perlu mengisi organisasi dan keanggotaan terlebih dahulu.' : 'Hubungi admin bila unit kerja belum tersedia.'}</p>{canAction('unit_manage') && <Link to="/organization" className="inline-block mt-4 text-pln-blue font-bold underline">Kelola organisasi</Link>}</div> : <Outlet key={viewKey} />}
          </Suspense>
        </main>

        <footer className="px-4 py-4 border-t border-slate-200 bg-white/80 backdrop-blur text-xs text-slate-500 flex flex-col sm:flex-row items-center gap-1 sm:items-center justify-center sm:justify-between text-center transition-colors">
          <span>&copy; {new Date().getFullYear()} PT PLN (Persero) &bull; PLN Pro-Track v1.0.0</span>
          <span className="inline-flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${live.dot} ${live.pulse}`} />
            {live.text}
          </span>
        </footer>
      </div>
    </div>
  );
}

let _title = 'Dashboard';
export function setPageTitle(t) {
  _title = t;
}
export function getPageTitle() {
  return _title;
}

function PageTitle() {
  return <span>{getPageTitle()}</span>;
}

function nowDateString() {
  return new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
}
