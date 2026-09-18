import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { register } from '../api.js';
import { setSession } from '../auth.js';
import logoPln from '../assets/pln-logo.png';

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

export default function Register() {
  const navigate = useNavigate();
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const { token, user } = await register({ nama, email, password });
      setSession(token, user);
      navigate('/');
    } catch (er) {
      setErr(er.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans bg-gradient-to-br from-sky-400 via-pln-blue to-sky-500 relative overflow-hidden">
      {/* Pola logo berulang */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.12]">
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-8 p-4">
          {Array.from({ length: 48 }).map((_, i) => (
            <PatternLogo key={i} index={i} />
          ))}
        </div>
      </div>

      <div className="relative z-10 w-full max-w-sm sm:max-w-lg">
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
            <p className="text-[11px] sm:text-xs tracking-[0.2em] uppercase text-pln-cyan font-bold mt-1">Registrasi Akun Baru</p>
          </div>

          {/* Bagian bawah: form */}
          <div className="bg-white backdrop-blur-2xl px-6 sm:px-8 pt-6 pb-8 border-t border-slate-200 relative transition-colors">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pln-cyan via-pln-blue to-amber-400" />

            <h2 className="text-xl sm:text-2xl font-extrabold text-pln-navy tracking-tight mb-1">Pendaftaran Akun</h2>
            <p className="text-xs text-slate-500 mt-1 mb-6">Isi formulir berikut untuk mendaftarkan akun sesuai peranan Anda.</p>

            {err && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl text-xs leading-relaxed">
                <span className="font-bold block mb-0.5">Pendaftaran Gagal</span>
                {err}
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Nama Lengkap / Nama Perusahaan</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pln-cyan focus:border-transparent transition-all"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="PT. Selaras Energi"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Email Resmi</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pln-cyan focus:border-transparent transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@perusahaan.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pln-cyan focus:border-transparent transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-pln-cyan/30 bg-pln-cyan/10 px-4 py-3">
                <div className="text-xs font-bold text-pln-cyan">Akun Vendor / Kontraktor</div>
                <p className="text-[11px] text-slate-600 leading-relaxed mt-1">
                  Pendaftaran publik membuat akun <b className="text-pln-navy">Vendor / Kontraktor</b>.
                  Akun Dalkon, Engineering, dan Administrator dibuat oleh pihak terkait melalui menu Manajemen Pengguna.
                </p>
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
                    <UserPlus className="w-4 h-4" /> Daftar Akun Sekarang
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-slate-200 text-xs">
              <Link to="/login" className="inline-flex items-center gap-1 font-bold text-pln-blue hover:underline">
                <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Login
              </Link>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-100 mt-6">
          Akses Terenkripsi &amp; Berbasis Peran
        </div>
      </div>
    </div>
  );
}