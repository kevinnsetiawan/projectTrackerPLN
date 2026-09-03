import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, UserPlus, Mail, Lock, User, ShieldCheck, HardHat, TrendingUp, FileCheck, ArrowLeft } from 'lucide-react';
import { register } from '../api.js';
import { setSession, clearSession } from '../auth.js';

const ROLES = [
  { value: 'vendor', label: 'Vendor / Kontraktor', desc: 'Mengupload foto progres & dokumen drawing awal', icon: HardHat, badge: 'text-amber-400 border-amber-500/30' },
  { value: 'dalkon', label: 'Dalkon (Pengawas)', desc: 'Verifikasi foto pengawasan, hardfile, & Nodin', icon: TrendingUp, badge: 'text-violet-400 border-violet-500/30' },
  { value: 'enjin', label: 'Enjin (Engineering)', desc: 'Review teknis drawing & kepetusan approval', icon: FileCheck, badge: 'text-emerald-400 border-emerald-500/30' },
  { value: 'admin', label: 'Administrator', desc: 'Akses penuh kelola seluruh proyek & bayar', icon: ShieldCheck, badge: 'text-sky-400 border-sky-500/30' },
];

export default function Register() {
  const navigate = useNavigate();
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('vendor');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const { token, user } = await register({ nama, email, password, role });
      setSession(token, user);
      navigate('/');
    } catch (er) {
      setErr(er.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-950 font-sans selection:bg-pln-cyan selection:text-slate-900 relative overflow-hidden">
      {/* Background Glowing Ambient Orbs */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-pln-blue/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-pln-cyan/20 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 my-8">
        {/* Header Brand */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pln-cyan to-pln-blue flex items-center justify-center shadow-lg shadow-pln-cyan/30 ring-1 ring-white/30">
            <Zap className="w-7 h-7 text-white fill-white/20" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-white leading-none">PLN PRO-TRACK</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-pln-cyan font-bold mt-1">Registrasi Akun Baru</div>
          </div>
        </div>

        {/* Card Container */}
        <div className="bg-slate-800/80 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/50 border border-slate-700/60 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pln-cyan via-pln-blue to-amber-400" />

          <div className="mb-6">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Pendaftaran Akun</h2>
            <p className="text-xs text-slate-400 mt-1">Isi formulir berikut untuk mendaftarkan akun sesuai peranan Anda.</p>
          </div>

          {err && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-2xl text-xs leading-relaxed">
              <span className="font-bold block mb-0.5">Pendaftaran Gagal</span>
              {err}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Nama Lengkap / Nama Perusahaan</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pln-cyan transition-all"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="PT. Selaras Energi"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Email Resmi</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pln-cyan transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@perusahaan.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pln-cyan transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-2">Pilih Peranan Akun (Role)</label>
              <div className="space-y-2">
                {ROLES.map((r) => {
                  const Icon = r.icon;
                  const selected = role === r.value;
                  return (
                    <label
                      key={r.value}
                      className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                        selected
                          ? 'bg-slate-900 border-pln-cyan ring-2 ring-pln-cyan/40 shadow-md'
                          : 'bg-slate-900/50 border-slate-700/70 hover:border-slate-500 hover:bg-slate-900'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        className="mt-1 accent-pln-cyan"
                        checked={selected}
                        onChange={() => setRole(r.value)}
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <Icon className={`w-4 h-4 ${selected ? 'text-pln-cyan' : 'text-slate-400'}`} />
                        <div>
                          <div className={`text-xs font-bold ${selected ? 'text-white' : 'text-slate-300'}`}>{r.label}</div>
                          <div className="text-[11px] text-slate-400 leading-tight">{r.desc}</div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-pln-cyan via-pln-blue to-pln-navy text-white rounded-xl py-3 text-sm font-extrabold shadow-lg shadow-pln-cyan/20 hover:shadow-pln-cyan/40 hover:scale-[1.01] transition-all disabled:opacity-60 mt-2"
            >
              {busy ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Daftar Akun Sekarang
                </>
              )}
            </button>
          </form>

          <div className="flex items-center justify-between gap-2 mt-6 pt-4 border-t border-slate-700/60 text-xs">
            <Link to="/login" className="inline-flex items-center gap-1 font-bold text-pln-cyan hover:underline">
              <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}