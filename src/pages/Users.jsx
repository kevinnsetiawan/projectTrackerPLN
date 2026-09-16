import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Users as UsersIcon, ShieldCheck, Save, X } from 'lucide-react';
import { listUsers, createUser, updateUser, deleteUser } from '../api.js';
import { setPageTitle, ROLE_BADGE } from '../components/Layout.jsx';
import { can, ROLE_FULL_LABELS } from '../auth.js';
import { Card, Field, inputCls, Spinner, Empty, PageHeader } from '../components/ui.jsx';
import { fmtDate } from '../utils.js';

const ROLES = ['vendor', 'dalkon', 'enjin', 'admin'];
const LABELS = { vendor: 'Vendor / Kontraktor', dalkon: 'Dalkon (Pengawas)', enjin: 'Engineering', admin: 'Administrator' };

const emptyForm = { nama: '', email: '', role: 'vendor', password: '' };

export default function Users() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [modal, setModal] = useState(null); // { mode: 'create'|'edit', user?, form }
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const isAdmin = can('admin');

  useEffect(() => {
    setPageTitle('Manajemen Pengguna');
    listUsers().then((d) => setData(d)).catch((e) => setErr(e.message));
  }, []);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const f = modal.form;
      if (modal.mode === 'create') {
        await createUser(f);
      } else {
        await updateUser(modal.user.id, { ...f, password: f.password || undefined });
      }
      const d = await listUsers();
      setData(d);
      setModal(null);
      setMsg(modal.mode === 'create' ? 'Pengguna berhasil ditambahkan.' : 'Pengguna berhasil diperbarui.');
    } catch (er) {
      setMsg({ err: er.message });
    } finally {
      setBusy(false);
    }
  }

  async function remove(user) {
    if (!window.confirm(`Hapus pengguna "${user.nama}" (${user.email})?`)) return;
    setMsg(null);
    try {
      await deleteUser(user.id);
      setData(await listUsers());
      setMsg('Pengguna dihapus.');
    } catch (er) {
      setMsg({ err: er.message });
    }
  }

  if (err) return <div className="text-red-600 bg-red-50 p-4 rounded-lg">{err}</div>;
  if (!data) return <Spinner show />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Manajemen Pengguna"
        subtitle="Kelola akun vendor, dalkon, engineering, dan administrator"
        actions={
          <button
            onClick={() => setModal({ mode: 'create', form: emptyForm })}
            className="inline-flex items-center gap-2 text-sm font-bold bg-pln-gradient text-white rounded-lg px-4 py-2 shadow-pln-cta hover:shadow-pln transition"
          >
            <Plus className="w-4 h-4" /> Tambah Pengguna
          </button>
        }
      />

      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${msg.err ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
          {msg.err || msg}
        </div>
      )}

      {!isAdmin && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-amber-50 text-amber-700 border border-amber-200">
          Hanya Administrator yang dapat mengelola pengguna.
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 font-bold text-pln-navy flex items-center gap-2">
          <UsersIcon className="w-4 h-4" /> Daftar Akun ({data.data.length})
        </div>
        {data.data.length === 0 ? <Empty /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-5 py-3">Nama</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Peranan</th>
                  <th className="px-5 py-3">Terdaftar</th>
                  <th className="px-5 py-3 text-right">Opsi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.data.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">{u.nama}</td>
                    <td className="px-5 py-3 text-xs text-slate-500">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[11px] font-semibold border px-2 py-0.5 rounded ${ROLE_BADGE[u.role] || ''}`}>
                        {ROLE_FULL_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">{fmtDate(u.created_at)}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => setModal({ mode: 'edit', user: u, form: { nama: u.nama, email: u.email, role: u.role, password: '' } })}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-pln-blue hover:underline"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => remove(u)}
                          disabled={!isAdmin}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline disabled:opacity-40"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modal && (
        <Modal onClose={() => setModal(null)}>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-pln-blue" />
            <h3 className="font-extrabold text-pln-navy text-lg">
              {modal.mode === 'create' ? 'Tambah Pengguna Baru' : `Edit Pengguna: ${modal.user.nama}`}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            {modal.mode === 'edit' ? 'Abaikan kolom password untuk mempertahankan password saat ini.' : 'Buat akun baru untuk pengguna sistem.'}
          </p>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Nama Lengkap / Perusahaan">
              <input className={inputCls} value={modal.form.nama} onChange={(e) => setModal({ ...modal, form: { ...modal.form, nama: e.target.value } })} required placeholder="PT. Selaras Energi" />
            </Field>
            <Field label="Email">
              <input type="email" className={inputCls} value={modal.form.email} onChange={(e) => setModal({ ...modal, form: { ...modal.form, email: e.target.value } })} required placeholder="nama@perusahaan.com" />
            </Field>
            <Field label="Peranan (Role)">
              <select className={inputCls} value={modal.form.role} onChange={(e) => setModal({ ...modal, form: { ...modal.form, role: e.target.value } })}>
                {ROLES.map((r) => <option key={r} value={r}>{LABELS[r]}</option>)}
              </select>
            </Field>
            <Field label={modal.mode === 'create' ? 'Password' : 'Password Baru (opsional)'}>
              <input type="password" className={inputCls} value={modal.form.password} onChange={(e) => setModal({ ...modal, form: { ...modal.form, password: e.target.value } })} minLength={6} placeholder="Minimal 6 karakter" required={modal.mode === 'create'} />
            </Field>
            <div className="flex items-center gap-2 justify-end pt-1">
              <button type="button" onClick={() => setModal(null)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 border border-slate-300 rounded-lg px-4 py-2 hover:bg-slate-100 transition">
                <X className="w-4 h-4" /> Batal
              </button>
              <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-pln-blue rounded-lg px-4 py-2 hover:bg-pln-navy transition disabled:opacity-60">
                {busy ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                {modal.mode === 'create' ? 'Simpan Pengguna' : 'Perbarui'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
function Modal({ onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-fade-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-pln-navy">Kelola Pengguna</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
