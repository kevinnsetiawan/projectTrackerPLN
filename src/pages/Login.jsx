import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, LogIn, Mail, Lock, Eye, EyeOff, TrendingUp, HardHat, ShieldCheck, FileCheck, CheckCircle2, Building2, Sparkles } from 'lucide-react';
import { login } from '../api.js';
import { setSession } from '../auth.js';

const DEMO_ACCOUNTS = [
  { role: 'admin', label: 'Admin', email: 'admin@pln.local', pass: import.meta.env.VITE_DEMO_ADMIN_PASS || 'admin123', icon: ShieldCheck, cls: 'from-sky-500 to-pln-blue', badge: 'bg-sky-500/10 text-sky-600 border-sky-200' },
  { role: 'vendor', label: 'Vendor', email: 'vendor@pln.local', pass: import.meta.env.VITE_DEMO_VENDOR_PASS || 'vendor123', icon: HardHat, cls: 'from-amber-400 to-orange-500', badge: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  { role: 'dalkon', label: 'Dalkon', email: 'dalkon@pln.local', pass: import.meta.env.VITE_DEMO_DALKON_PASS || 'dalkon123', icon: TrendingUp, cls: 'from-violet-500 to-fuchsia-500', badge: 'bg-violet-500/10 text-violet-600 border-violet-200' },
  { role: 'enjin', label: 'Engineering', email: 'enjin@pln.local', pass: import.meta.env.VITE_DEMO_ENJIN_PASS || 'enjin123', icon: FileCheck, cls: 'from-emerald-500 to-teal-600', badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
];

const HIGHLIGHTS = [
  { icon: HardHat, title: 'Vendor / Kontraktor', desc: 'Upload foto progres & registrasi dokumen drawing' },
  { icon: TrendingUp, title: 'Dalkon (Pengawas)', desc: 'Verifikasi lapangan, hardfile vendor, & Nodin' },
  { icon: FileCheck, title: 'Tim Engineering', desc: 'Review teknis, keputusan approval, & upload stempel' },
  { icon: ShieldCheck, title: 'Admin Eksekutif', desc: 'Monitoring proyek, Kurva S, & penyerapan dana' },
];

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

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
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 font-sans bg-gradient-to-br from-slate-100 via-pln-lightcyan to-slate-200 relative overflow-hidden">
      {/* Subtle brand orbs */}
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-pln-cyan/15 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-pln-blue/15 blur-[100px] pointer-events-none" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-5xl bg-white rounded-3xl shadow-2xl shadow-slate-300/50 border border-slate-200/70 overflow-hidden grid lg:grid-cols-2">
        {/* Left brand panel */}
        <div className="relative bg-pln-brand p-8 lg:p-12 text-white flex flex-col justify-between overflow-hidden">
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-pln-cyan/20 blur-[80px] pointer-events-none" />
          <div className="absolute top-10 right-0 w-40 h-40 rounded-full bg-amber-400/10 blur-[60px] pointer-events-none" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pln-cyan to-pln-blue flex items-center justify-center shadow-lg shadow-pln-cyan/30 ring-1 ring-white/20">
              <Zap className="w-7 h-7 text-white fill-white/20" />
            </div>
            <div>
              <div className="text-xl font-extrabold tracking-tight leading-none">PLN PRO-TRACK</div>
              <div className="text-[10px] tracking-[0.25em] uppercase text-pln-cyan font-bold mt-1">Sistem Monitoring Konstruksi</div>
            </div>
          </div>

          <div className="relative z-10 my-10">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-pln-cyan bg-pln-cyan/10 border border-pln-cyan/20 px-3.5 py-1.5 rounded-full mb-6">
              <Sparkles className="w-4 h-4" /> Platform Terintegrasi PT PLN (Persero)
            </div>

            <h1 className="text-3xl lg:text-4xl font-black leading-[1.15] tracking-tight">
              Kelola &amp; pantau proyek konstruksi secara <span className="text-transparent bg-clip-text bg-gradient-to-r from-pln-cyan via-sky-300 to-amber-300">real-time.</span>
            </h1>

            <p className="text-slate-300/80 mt-5 text-sm leading-relaxed">
              Satu portal kolaborasi Vendor, Dalkon, Tim Engineering, dan Eksekutif PLN untuk mengawal progres fisik, Kurva S, &amp; 8-Tahap Approval Drawing.
            </p>

            <ul className="mt-8 space-y-3">
              {HIGHLIGHTS.map((h, i) => {
                const Icon = h.icon;
                return (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-pln-cyan/20 to-pln-blue/20 flex items-center justify-center shrink-0 ring-1 ring-white/15">
                      <Icon className="w-4 h-4 text-pln-cyan" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">{h.title}</div>
                      <div className="text-[11px] text-slate-300/70">{h.desc}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="relative z-10 flex items-center gap-1.5 text-xs text-slate-400/80 pt-4 border-t border-white/10">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Akses Terenkripsi &amp; Berbasis Peran
          </div>
        </div>

        {/* Right form panel */}
        <div className="p-8 lg:p-12 bg-white">
          <div className="mb-7">
            <h2 className="text-2xl font-extrabold text-pln-navy tracking-tight">Masuk Akun</h2>
            <p className="text-sm text-slate-500 mt-1">Masukkan email &amp; password kredensial Anda untuk melanjutkan.</p>
          </div>

          {err && (
            <div className="mb-5 flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl text-sm animate-fade-in">
              <AlertIcon />
              <div>
                <span className="font-bold block">Gagal Masuk</span>
                {err}
              </div>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1.5">Email Akses</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pln-cyan focus:border-transparent transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@pln.local"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-10 pr-11 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pln-cyan focus:border-transparent transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 bg-pln-gradient text-white rounded-lg py-3.5 text-sm font-extrabold shadow-lg shadow-pln-cyan/30 hover:shadow-pln-cyan/40 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60 disabled:hover:scale-100 mt-2"
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

          <div className="mt-5 text-center text-sm text-slate-500">
            Belum memiliki akun?{' '}
            <Link to="/register" className="font-bold text-pln-blue hover:underline">
              Daftar Akun Baru
            </Link>
          </div>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Akses Masuk Cepat Demo</span>
            <div className="h-px flex-1 bg-slate-200" />
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
                  className={`group flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all ${active
                    ? 'bg-pln-lightcyan border-pln-cyan ring-2 ring-pln-cyan/40'
                    : 'bg-slate-50 border-slate-200 hover:border-pln-cyan/50 hover:bg-pln-lightcyan/40'
                    }`}
                >
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${a.cls} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className={`text-xs font-bold ${active ? 'text-pln-cyan' : 'text-slate-700'}`}>{a.label}</div>
                    <div className="text-[9px] text-slate-400 truncate">{a.email}</div>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-center text-slate-400 mt-3">
            Klik salah satu peranan akun demo di atas untuk mengisi kredensial otomatis.
          </p>
        </div>
      </div>
    </div>
  );
}

function AlertIcon() {
  return (
    <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
