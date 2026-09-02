import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, UserPlus } from 'lucide-react';
import { register } from '../api.js';
import { setSession, clearSession } from '../auth.js';

const ROLES = [
  { value: 'vendor', label: 'Vendor (Kontraktor)', desc: 'Mengupload bukti foto pekerjaan (foto vendor)' },
  { value: 'dalkon', label: 'Dalkon (Pengawas Lapangan)', desc: 'Verifikasi & foto pengawasan (foto dalkon)' },
  { value: 'admin', label: 'Admin', desc: 'Menjalankan seluruh aplikasi' },
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

  function pickDemo() {
    clearSession();
    setNama('Demo');
    setEmail('demo@pln.local');
    setPassword('demo123');
    setRole('vendor');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-pln-surface">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div className="w-10 h-10 rounded-xl bg-pln-gradient flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="font-extrabold text-pln-navy leading-tight">PLN PRO-TRACK</div>
            <div className="text-[10px] uppercase tracking-widest text-pln-cyan">Buat Akun Baru</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          {err && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{err}</div>}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600">Nama / Nama Perusahaan</label>
              <input className="mt-1 w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pln-cyan" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="PT. Contoh Energi" required />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">Email</label>
              <input type="email" className="mt-1 w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pln-cyan" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@perusahaan.com" required />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">Password</label>
              <input type="password" className="mt-1 w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pln-cyan" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 6 karakter" minLength={6} required />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">Peran Akun</label>
              <div className="mt-1 space-y-2">
                {ROLES.map((r) => (
                  <label key={r.value} className={`flex items-start gap-3 border rounded-lg px-3 py-2.5 cursor-pointer transition ${role === r.value ? 'border-pln-cyan bg-pln-lightcyan/50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" name="role" className="mt-0.5 accent-pln-cyan" checked={role === r.value} onChange={() => setRole(r.value)} />
                    <span>
                      <span className="block text-sm font-bold text-pln-navy">{r.label}</span>
                      <span className="block text-xs text-slate-500">{r.desc}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <button disabled={busy} className="w-full inline-flex items-center justify-center gap-2 bg-pln-gradient text-white rounded-lg px-4 py-2.5 text-sm font-bold shadow-pln-cta hover:shadow-pln transition disabled:opacity-60">
              <UserPlus className="w-4 h-4" /> {busy ? 'Membuat akun...' : 'Daftar'}
            </button>
          </form>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 mt-4 text-sm">
          <span className="text-slate-500">Sudah punya akun? <Link to="/login" className="font-semibold text-pln-blue hover:underline">Masuk</Link></span>
          <button type="button" onClick={pickDemo} className="text-xs text-slate-400 hover:text-pln-blue">Isi demo</button>
        </div>
      </div>
    </div>
  );
}