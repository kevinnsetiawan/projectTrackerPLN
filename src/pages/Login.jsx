import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, LogIn, Mail, Lock, Eye, EyeOff, TrendingUp, HardHat, ShieldCheck, FileCheck, CheckCircle2, ChevronDown, Sparkles } from 'lucide-react';
import { login } from '../api.js';
import { setSession } from '../auth.js';
import logoPln from '../assets/pln-logo.png';

const DEMO_ACCOUNTS = [
  { role: 'admin', label: 'Admin', email: 'admin@pln.local', pass: import.meta.env.VITE_DEMO_ADMIN_PASS || 'admin123', icon: ShieldCheck, cls: 'from-sky-500 to-pln-blue' },
  { role: 'vendor', label: 'Vendor', email: 'vendor@pln.local', pass: import.meta.env.VITE_DEMO_VENDOR_PASS || 'vendor123', icon: HardHat, cls: 'from-amber-400 to-orange-500' },
  { role: 'dalkon', label: 'Dalkon', email: 'dalkon@pln.local', pass: import.meta.env.VITE_DEMO_DALKON_PASS || 'dalkon123', icon: TrendingUp, cls: 'from-violet-500 to-fuchsia-500' },
  { role: 'enjin', label: 'Engineering', email: 'enjin@pln.local', pass: import.meta.env.VITE_DEMO_ENJIN_PASS || 'enjin123', icon: FileCheck, cls: 'from-emerald-500 to-teal-600' },
];

const HIGHLIGHTS = [
  { icon: HardHat, title: 'Vendor / Kontraktor', desc: 'Upload foto progres & registrasi dokumen drawing' },
  { icon: TrendingUp, title: 'Dalkon (Pengawas)', desc: 'Verifikasi lapangan, hardfile vendor, & Nodin' },
  { icon: FileCheck, title: 'Tim Engineering', desc: 'Review teknis, keputusan approval, & upload stempel' },
  { icon: ShieldCheck, title: 'Admin Eksekutif', desc: 'Monitoring proyek, Kurva S, & penyerapan dana' },
];

function PatternLogo({ index }) {
  const cols = 8;
  const row = Math.floor(index / cols);
  const isOffsetRow = row % 2 === 1;
  return (
    <img
      src={logoPln}
      alt=""
      className="w-20 h-20 object-contain"
      style={{ opacity: 0.55, transform: isOffsetRow ? 'translateX(48px)' : 'none' }}
    />
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [showInfo, setShowInfo] = useState(false);

  function fillDemo(a) {
    setEmail(a.email);
    setPassword(a.pass);
    setErr(null);
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const { token, user } = await login({ email, password });
      setSession(token, user);
      navigate('/');
    } catch (er) {
      setErr(er.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans bg-gradient-to-br from-sky-400 via-pln-blue to-sky-500 dark:from-pln-navy dark:via-slate-900 dark:to-pln-navy relative overflow-hidden">
      {/* Pola logo berulang */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.12]">
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-8 p-4">
          {Array.from({ length: 48 }).map((_, i) => (
            <PatternLogo key={i} index={i} />
          ))}
        </div>
      </div>

      <div className="relative z-10 w-full max-w-sm sm:max-w-md">
        {/* Kartu tunggal: header logo + form menyatu */}
        <div className="rounded-3xl overflow-hidden shadow-2xl shadow-black/30 border border-white/10">
          {/* Bagian atas: logo & headline (selalu gelap, ini bagian brand) */}
          <div className="bg-gradient-to-br from-pln-navy to-pln-blue px-6 sm:px-8 pt-8 pb-6 flex flex-col items-center text-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white ring-4 ring-pln-cyan/50 flex items-center justify-center shadow-xl shadow-black/25 mb-4">
              <div
                className="w-12 h-12 sm:w-16 sm:h-16 bg-pln-blue"
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
            <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">PLN PRO-TRACK</h1>
            <p className="text-[11px] sm:text-xs tracking-[0.2em] uppercase text-pln-cyan font-bold mt-1">Sistem Monitoring Konstruksi</p>

            <button
              type="button"
              onClick={() => setShowInfo(!showInfo)}
              className="flex items-center gap-1 text-xs text-slate-200 hover:text-white mt-3 transition-colors"
            >
              Lihat info platform
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showInfo ? 'rotate-180' : ''}`} />
            </button>

            {showInfo && (
              <div className="mt-3 bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-4 text-left w-full animate-fade-in">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-pln-cyan bg-pln-cyan/10 border border-pln-cyan/20 px-2.5 py-1 rounded-full mb-3">
                  <Sparkles className="w-3 h-3" /> Platform Terintegrasi PT PLN (Persero)
                </div>
                <ul className="space-y-2.5">
                  {HIGHLIGHTS.map((h, i) => {
                    const HIcon = h.icon;
                    return (
                      <li key={i} className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                          <HIcon className="w-3.5 h-3.5 text-pln-cyan" />
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-white">{h.title}</div>
                          <div className="text-[10px] text-slate-300">{h.desc}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Bagian bawah: form - ADAPTIF terang/gelap ikut device */}
          <div className="bg-white dark:bg-slate-800/95 backdrop-blur-2xl px-6 sm:px-8 pt-6 pb-8 border-t border-slate-200 dark:border-white/10 relative transition-colors">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pln-cyan via-pln-blue to-amber-400" />

            <h2 className="text-xl sm:text-2xl font-extrabold text-pln-navy dark:text-white tracking-tight mb-1">Masuk Akun</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Masukkan email &amp; password untuk melanjutkan.</p>

            {err && (
              <div className="mb-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-300 px-4 py-3 rounded-2xl text-xs leading-relaxed">
                <span className="font-bold block mb-0.5">Gagal Masuk</span>
                {err}
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Email Akses</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    className="w-full bg-slate-50 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pln-cyan focus:border-transparent transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@pln.local"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="w-full bg-slate-50 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-11 py-3 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pln-cyan focus:border-transparent transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 bg-pln-gradient text-white rounded-xl py-3.5 text-sm font-extrabold shadow-lg shadow-pln-cyan/30 active:scale-[0.98] transition-all disabled:opacity-60 mt-2"
              >
                {busy ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" /> Masuk Aplikasi
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
              Belum memiliki akun?{' '}
              <Link to="/register" className="font-bold text-pln-blue dark:text-pln-cyan hover:underline">
                Daftar Akun Baru
              </Link>
            </div>
          </div>
        </div>

        {/* Demo accounts - di luar kartu utama */}
        <div className="mt-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-white/25" />
            <span className="text-[10px] uppercase tracking-widest text-slate-100 font-bold">Demo Cepat</span>
            <div className="h-px flex-1 bg-white/25" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((a) => {
              const Icon = a.icon;
              const active = email === a.email && password === a.pass;
              return (
                <button
                  key={a.role}
                  type="button"
                  onClick={() => fillDemo(a)}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.96] active:translate-y-0 ${active
                    ? 'bg-pln-lightcyan dark:bg-pln-cyan/20 border-pln-cyan ring-2 ring-pln-cyan/40 shadow-md'
                    : 'bg-white/90 dark:bg-slate-800/80 border-white/40 dark:border-slate-600/60 hover:border-pln-cyan/60 hover:bg-white dark:hover:bg-slate-800'
                    }`}
                >
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${a.cls} flex items-center justify-center text-white shrink-0 transition-transform duration-200`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className={`text-xs font-bold ${active ? 'text-pln-cyan' : 'text-slate-700 dark:text-slate-200'}`}>{a.label}</div>
                    <div className="text-[10px] text-slate-400 truncate">{a.email}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-100 mt-6">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Akses Terenkripsi &amp; Berbasis Peran
        </div>
      </div>
    </div>
  );
}