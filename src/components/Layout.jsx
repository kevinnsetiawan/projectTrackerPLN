import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Zap, LayoutDashboard, FolderKanban, Map, AlertTriangle, FileBarChart, Menu, X, PencilRuler,
} from 'lucide-react';

const NAV = [
  { to: '/', label: 'Dashboard KPI', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Daftar Proyek', icon: FolderKanban },
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

  return (
    <div className="min-h-screen flex bg-pln-surface">
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
          <div className="flex items-center gap-4 px-5 py-3">
            <button onClick={() => setOpen(true)} className="lg:hidden text-pln-blue">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-pln-blue leading-tight"><PageTitle /></h1>
              <p className="text-xs text-slate-500">PT PLN (Persero) &bull; Sistem Monitoring Pekerjaan Konstruksi</p>
            </div>
            <div className="hidden md:block text-right">
              <div className="font-bold text-pln-navy tabular-nums">{time} WIB</div>
              <div className="text-[11px] text-slate-500">{nowDateString()}</div>
            </div>
            <NavLink
              to="/projects/new"
              className="inline-flex items-center gap-2 bg-pln-gradient text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-pln-cta hover:shadow-pln hover:-translate-y-0.5 transition"
            >
              <PencilRuler className="w-4 h-4" />
              Tambah Proyek
            </NavLink>
          </div>
        </header>

        <main className="flex-1 p-5 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>

        <footer className="px-5 py-4 border-t border-slate-200 bg-white text-xs text-slate-500 flex items-center justify-between">
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