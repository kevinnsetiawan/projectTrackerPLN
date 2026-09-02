import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, LogIn } from 'lucide-react';
import { login } from '../api.js';
import { setSession } from '../auth.js';

const DEMO_ACCOUNTS = [
  { role: 'admin', label: 'Admin', email: 'admin@pln.local', pass: 'admin123' },
  { role: 'vendor', label: 'Vendor (Kontraktor)', email: 'vendor@pln.local', pass: 'vendor123' },
  { role: 'dalkon', label: 'Dalkon (Pengawas)', email: 'dalkon@pln.local', pass: 'dalkon123' },
];

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

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
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="lg:w-1/2 bg-pln-gradient text-white flex flex-col justify-center p-8 lg:p-16">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <Zap className="w-7 h-7" />
          </div>
          <div>
            <div className="text-2xl font-extrabold leading-tight">PLN PRO-TRACK</div>
            <div className="text-xs tracking-widest uppercase text-pln-cyan">Sistem Monitoring Konstruksi</div>
          </div>
        </div>
        <h1 className="text-3xl font-extrabold leading-snug">Pantau progres pekerjaan konstruksi PLN secara real-time.</h1>
        <p className="text-white/70 mt-3 max-w-md text-sm leading-relaxed">
          Vendor melengkapi bukti foto pekerjaan, dalkon melakukan verifikasi lapangan, dan admin mengawasi seluruh proses kontrak &amp; pembayaran.
        </p>
        <div className="mt-10 grid grid-cols-3 gap-3 max-w-md">
          {DEMO_ACCOUNTS.map((a) => (
            <div key={a.role} className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-xs font-bold uppercase tracking-wide text-pln-cyan">{a.label}</div>
              <div className="text-[11px] text-white/70 mt-1">{a.email}</div>
              <div className="text-[11px] text-white/70">{a.pass}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-white/50 mt-3 max-w-md">Gunakan akun demo di atas untuk masuk.</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-pln-surface">
        <div className="w-full max-w-sm">
          <h2 className="text-xl font-extrabold text-pln-navy mb-1">Masuk ke aplikasi</h2>
          <p className="text-sm text-slate-500 mb-6">Masukkan email dan password akun Anda.</p>
          {err && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{err}</div>}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600">Email</label>
              <input type="email" className="mt-1 w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pln-cyan" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@example.com" required autoFocus />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">Password</label>
              <input type="password" className="mt-1 w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pln-cyan" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <button disabled={busy} className="w-full inline-flex items-center justify-center gap-2 bg-pln-gradient text-white rounded-lg px-4 py-2.5 text-sm font-bold shadow-pln-cta hover:shadow-pln transition disabled:opacity-60">
              <LogIn className="w-4 h-4" /> {busy ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
          <p className="text-sm text-slate-500 mt-5 text-center">
            Belum punya akun? <Link to="/register" className="font-semibold text-pln-blue hover:underline">Daftar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}