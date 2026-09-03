import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, LogIn, Mail, Lock, Eye, EyeOff, TrendingUp, HardHat, ShieldCheck, ArrowRight, FileCheck, CheckCircle2, Building2, Sparkles } from 'lucide-react';
import { login } from '../api.js';
import { setSession } from '../auth.js';

const DEMO_ACCOUNTS = [
  { role: 'admin', label: 'Admin', email: 'admin@pln.local', pass: 'admin123', icon: ShieldCheck, cls: 'from-sky-500 to-pln-blue', badge: 'bg-sky-500/10 text-sky-400 border-sky-400/20' },
  { role: 'vendor', label: 'Vendor', email: 'vendor@pln.local', pass: 'vendor123', icon: HardHat, cls: 'from-amber-400 to-orange-500', badge: 'bg-amber-500/10 text-amber-400 border-amber-400/20' },
  { role: 'dalkon', label: 'Dalkon', email: 'dalkon@pln.local', pass: 'dalkon123', icon: TrendingUp, cls: 'from-violet-500 to-fuchsia-500', badge: 'bg-violet-500/10 text-violet-400 border-violet-400/20' },
  { role: 'enjin', label: 'Enjin', email: 'enjin@pln.local', pass: 'enjin123', icon: FileCheck, cls: 'from-emerald-500 to-teal-600', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-400/20' },
];

const HIGHLIGHTS = [
  { icon: HardHat, title: 'Vendor / Kontraktor', desc: 'Upload foto progres & registrasi dokumen drawing' },
  { icon: TrendingUp, title: 'Dalkon (Pengawas)', desc: 'Verifikasi lapangan, hardfile vendor, & Nodin' },
  { icon: FileCheck, title: 'Tim Enjin (Engineering)', desc: 'Review teknis, keputusan approval, & upload stempel' },
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
    <div className="min-h-screen flex flex-col lg:flex-row font-sans bg-slate-950 selection:bg-pln-cyan selection:text-slate-900">
      {/* Left Brand & Feature Hero Panel */}
      <div className="relative lg:w-[48%] bg-gradient-to-br from-pln-navy via-slate-900 to-pln-blue overflow-hidden flex flex-col justify-between p-8 lg:p-14 text-white">
        {/* Animated Glowing Orbs & Mesh Background */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-pln-cyan/20 blur-[120px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-0 -left-32 w-[450px] h-[450px] rounded-full bg-pln-blue/30 blur-[140px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-amber-400/10 blur-[90px] pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)', backgroundSize: '32px 32px' }}
        />

        {/* Header Branding */}
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pln-cyan to-pln-blue flex items-center justify-center shadow-lg shadow-pln-cyan/30 ring-1 ring-white/30">
              <Zap className="w-7 h-7 text-white fill-white/20" />
            </div>
            <div>
              <div className="text-xl font-extrabold tracking-tight leading-none text-white">
                PLN PRO-TRACK
              </div>
              <div className="text-[10px] tracking-[0.25em] uppercase text-pln-cyan font-bold mt-1">
                Sistem Monitoring Konstruksi
              </div>
            </div>
          </div>

          <span className="hidden sm:inline-flex items-center gap-2 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Live Enterprise v1.0
          </span>
        </div>

        {/* Main Hero Content */}
        <div className="relative z-10 my-10 max-w-lg">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-pln-cyan bg-pln-cyan/10 border border-pln-cyan/20 px-3.5 py-1.5 rounded-full mb-6 backdrop-blur-md">
            <Sparkles className="w-4 h-4" /> Platform Terintegrasi PT PLN (Persero)
          </div>

          <h1 className="text-3xl lg:text-5xl font-black leading-[1.1] tracking-tight text-white">
            Kelola &amp; pantau proyek konstruksi secara <span className="text-transparent bg-clip-text bg-gradient-to-r from-pln-cyan via-sky-300 to-amber-300">real-time.</span>
          </h1>

          <p className="text-slate-300/80 mt-5 text-sm lg:text-base leading-relaxed">
            Satu portal untuk kolaborasi terpadu antar Vendor, Dalkon, Tim Engineering, dan Eksekutif PLN dalam mengawal progres fisik, Kurva S, &amp; 8-Tahap Approval Drawing.
          </p>

          {/* Feature Highlights Grid */}
          <div className="mt-8 space-y-3">
            {HIGHLIGHTS.map((h, i) => {
              const Icon = h.icon;
              return (
                <div
                  key={i}
                  className="group flex items-center gap-3.5 bg-white/[0.06] hover:bg-white/[0.12] backdrop-blur-xl border border-white/10 hover:border-pln-cyan/40 rounded-2xl p-3.5 transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pln-cyan/20 to-pln-blue/20 flex items-center justify-center shrink-0 ring-1 ring-white/15 group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5 text-pln-cyan" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white group-hover:text-pln-cyan transition-colors">{h.title}</div>
                    <div className="text-[11px] text-slate-300/70 truncate">{h.desc}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-pln-cyan group-hover:translate-x-1 transition-all" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Security Badge */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400/80 pt-6 border-t border-white/10">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Akses Terenkripsi &amp; Berbasis Peran Role
          </span>
          <span>&copy; {new Date().getFullYear()} PT PLN (Persero)</span>
        </div>
      </div>

      {/* Right Login Form & Demo Selector Panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-slate-900 relative overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute top-1/4 right-10 w-96 h-96 bg-pln-cyan/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          {/* Mobile Header Branding */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pln-cyan to-pln-blue flex items-center justify-center shadow-lg shadow-pln-cyan/30">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-extrabold text-white text-lg leading-tight">PLN PRO-TRACK</div>
              <div className="text-[10px] uppercase tracking-widest text-pln-cyan font-bold">Portal Monitoring Proyek</div>
            </div>
          </div>

          {/* Form Card Container */}
          <div className="bg-slate-800/80 backdrop-blur-2xl rounded-3xl p-7 lg:p-9 shadow-2xl shadow-black/40 border border-slate-700/60 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pln-cyan via-pln-blue to-amber-400" />

            <div className="mb-6">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-pln-cyan bg-pln-cyan/10 px-3 py-1 rounded-full mb-2">
                Selamat Datang Kembali 👋
              </div>
              <h2 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">Masuk Akun</h2>
              <p className="text-xs lg:text-sm text-slate-400 mt-1">
                Masukkan email &amp; password kredensial Anda untuk melanjutkan.
              </p>
            </div>

            {err && (
              <div className="mb-5 flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-2xl text-xs leading-relaxed animate-fade-in">
                <AlertIcon />
                <div>
                  <span className="font-bold block">Gagal Masuk</span>
                  {err}
                </div>
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Email Akses</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pln-cyan focus:border-transparent transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@pln.local"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pln-cyan focus:border-transparent transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-pln-cyan via-pln-blue to-pln-navy text-white rounded-xl py-3.5 text-sm font-extrabold shadow-lg shadow-pln-cyan/20 hover:shadow-pln-cyan/40 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60 disabled:hover:scale-100 mt-2"
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

            <div className="mt-5 text-center text-xs text-slate-400">
              Belum memiliki akun?{' '}
              <Link to="/register" className="font-bold text-pln-cyan hover:underline">
                Daftar Akun Baru
              </Link>
            </div>

            {/* Quick Demo Account Selector Header */}
            <div className="flex items-center gap-3 my-6">
              <div className="h-px flex-1 bg-slate-700/60" />
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Akses Masuk Cepat Demo</span>
              <div className="h-px flex-1 bg-slate-700/60" />
            </div>

            {/* Demo Account Persona Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DEMO_ACCOUNTS.map((a) => {
                const Icon = a.icon;
                const active = email === a.email && password === a.pass;
                return (
                  <button
                    key={a.role}
                    type="button"
                    onClick={() => fillDemo(a)}
                    className={`group flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border text-center transition-all ${active
                      ? 'bg-slate-900 border-pln-cyan ring-2 ring-pln-cyan/50 shadow-lg shadow-pln-cyan/20'
                      : 'bg-slate-900/50 border-slate-700/80 hover:border-slate-500 hover:bg-slate-900'
                      }`}
                  >
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${a.cls} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="w-full min-w-0">
                      <div className={`text-xs font-bold ${active ? 'text-pln-cyan' : 'text-slate-200'}`}>{a.label}</div>
                      <div className="text-[9px] text-slate-400 truncate mt-0.5" title={a.email}>{a.email}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-center text-slate-400 mt-2.5">
              Klik salah satu peranan akun demo di atas untuk mengisi kredensial otomatis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertIcon() {
  return (
    <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
