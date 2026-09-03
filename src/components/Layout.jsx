import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Zap, LayoutDashboard, FolderKanban, Map, AlertTriangle, FileBarChart, Menu, X, PencilRuler, LogOut, FileCheck
} from 'lucide-react';
import { getUser, clearSession, ROLE_LABELS } from '../auth.js';

const ROLE_BADGE = {
  admin: 'bg-pln-lightcyan text-pln-blue',
  vendor: 'bg-amber-100 text-amber-700',
  dalkon: 'bg-violet-100 text-violet-700',
  enjin: 'bg-emerald-100 text-emerald-700',
};

const NAV = [
  { to: '/', label: 'Dashboard KPI', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Daftar Proyek', icon: FolderKanban },
  { to: '/drawings', label: 'Approval Drawing', icon: FileCheck },
  { to: '/gis', label: 'Peta GIS Proyek', icon: Map },
  { to: '/kendala', label: 'Issue & Kendala', icon: AlertTriangle },
  { to: '/reports', label: 'Laporan Eksekutif', icon: FileBarChart },
];

function useClock() {
  const [now, setNow] = useState(new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' });
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const time = useClock();
  const navigate = useNavigate();
  const user = getUser();
  function handleLogout() {
    clearSession();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex app-bg">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-pln-brand z-40 transform transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-pln-cyan flex items-center justify-center shadow-lg">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="font-extrabold text-white leading-tight">PLN PRO-TRACK</div>
            <div className="text-[10px] uppercase tracking-widest text-pln-cyan">Sistem Monitoring</div>
          </div>
          <button onClick={() => setOpen(false)} className="ml-auto lg:hidden text-white/70">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive ? 'bg-white/15 text-white shadow-inner' : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 inset-x-0 px-5 py-4 border-t border-white/10">
          <div className="text-xs text-white/70">Divisi Konstruksi (MPO)</div>
          <div className="text-[11px] text-white/40">PT PLN (Persero)</div>
        </div>
      </aside>

      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 bg-white border-b-2 border-pln-cyan z-20">
          <div className="flex items-center gap-2 md:gap-4 px-3 sm:px-5 py-3">
            <button onClick={() => setOpen(true)} className="lg:hidden text-pln-blue">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base md:text-lg font-bold text-pln-blue leading-tight truncate"><PageTitle /></h1>
              <p className="text-[11px] md:text-xs text-slate-500 truncate">PT PLN (Persero) &bull; Sistem Monitoring Pekerjaan Konstruksi</p>
            </div>
            <div className="hidden md:block text-right">
              <div className="font-bold text-pln-navy tabular-nums">{time} WIB</div>
              <div className="text-[11px] text-slate-500">{nowDateString()}</div>
            </div>
            {user && (
              <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200">
                <div className="w-9 h-9 rounded-full bg-pln-gradient text-white flex items-center justify-center font-extrabold text-sm">
                  {(user.nama || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-bold text-pln-navy max-w-40 truncate">{user.nama}</div>
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${ROLE_BADGE[user.role] || 'bg-slate-100 text-slate-600'}`}>
                    {ROLE_LABELS[user.role] || user.role}
                  </span>
                </div>
                <button onClick={handleLogout} title="Keluar" className="ml-1 p-2 text-slate-400 hover:text-red-500 transition">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>

        <footer className="px-4 py-4 border-t border-slate-200 bg-white/80 backdrop-blur text-xs text-slate-500 flex flex-col sm:flex-row items-center gap-1 sm:items-center justify-center sm:justify-between text-center">
          <span>&copy; {new Date().getFullYear()} PT PLN (Persero) &bull; PLN Pro-Track v1.0.0</span>
          <span className="inline-flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-pln-green pulse-online" />
            Online
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