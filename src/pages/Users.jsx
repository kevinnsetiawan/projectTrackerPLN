import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { listUsers, createUser, updateUser, listUnits, listMemberships, saveMembership } from '../api.js';
import { canAction, getAuthState, ROLE_FULL_LABELS } from '../auth.js';
import { setPageTitle } from '../components/Layout.jsx';
import { TOPIC, useLive } from '../events.js';
import { Card, Field, inputCls, Spinner, PageHeader, Drawer } from '../components/ui.jsx';

const EMPTY = { nama: '', email: '', role: 'vendor', password: '', active: true };
export default function Users() {
  const [data, setData] = useState(null);
  const [units, setUnits] = useState([]);
  const [form, setForm] = useState(null);
  const [target, setTarget] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [memberForm, setMemberForm] = useState({ unit_id: '', role: 'vendor', jabatan: '', active: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const central = canAction('membership_manage');
  const currentUnit = getAuthState()?.context?.unit_id;
  async function reload() { setData(await listUsers()); }
  useEffect(() => {
    setPageTitle('Manajemen Pengguna');
    Promise.all([reload(), listUnits().then((d) => setUnits(d.data || []))]).catch((e) => setError(e.message));
  }, []);
  useLive(TOPIC.USERS, () => { if (!form && !target) reload().catch(() => {}); });
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      if (form.id) await updateUser(form.id, { nama: form.nama, active: form.active, password: form.password || undefined });
      else await createUser(form);
      setForm(null); await reload(); setNotice('Akun disimpan. Tetapkan keanggotaan agar pengguna dapat mengakses unit.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function openMembership(user) {
    setError(''); setBusy(true);
    try {
      setMemberships((await listMemberships(user.id)).data || []);
      setMemberForm({ unit_id: currentUnit || '', role: 'staff', jabatan: '', active: true }); setTarget(user);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function assign(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await saveMembership(target.id, memberForm.unit_id, { role: memberForm.role, jabatan: memberForm.jabatan.trim() || null, active: memberForm.active });
      setMemberships((await listMemberships(target.id)).data || []);
      await reload(); setNotice('Keanggotaan disimpan. Pengguna perlu login ulang.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const roles = (data?.roles || []).filter((role) => (central || role !== 'admin') && !(units.find((u) => String(u.id) === String(memberForm.unit_id))?.kind === 'unit_induk' && role === 'vendor'));
  const allowedUnits = units.filter((u) => u.active && (central || u.id === currentUnit));
  return <div className="space-y-5"><PageHeader title="Manajemen Pengguna" subtitle="Identitas akun global; peran dan akses ditetapkan per unit." actions={<button className="btn btn-primary btn-md" onClick={() => { setError(''); setForm({ ...EMPTY }); }}><Plus className="w-4 h-4" />Tambah Pengguna</button>} />
    {error && <p role="alert" className="bg-red-50 p-4 rounded-lg text-red-700">{error}</p>}
    {notice && <p role="status" className="bg-emerald-50 p-4 rounded-lg text-emerald-700">{notice}</p>}
    {!central && <p className="text-sm text-slate-600">Admin UPT mengelola akun non-admin yang hanya menjadi anggota unit ini. Identitas dan password akun multi-unit, penetapan admin, serta akses lintas unit dikelola pusat.</p>}
    {!data ? <Spinner show /> : <Card className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-100"><tr><th scope="col" className="p-4">Nama</th><th scope="col" className="p-4">Email</th><th scope="col" className="p-4">Status / Peran unit</th><th scope="col" className="p-4">Aksi</th></tr></thead><tbody>{data.data.map((user) => <tr key={user.id} className="border-t border-slate-200"><td className="p-4 font-semibold text-pln-navy">{user.nama}</td><td className="p-4">{user.email}</td><td className="p-4">{user.active ? 'Aktif' : 'Nonaktif'}{user.role && ` / ${ROLE_FULL_LABELS[user.role] || user.role}`}{user.jabatan && <div className="text-xs text-slate-500">{user.jabatan}</div>}{user.is_superadmin && ' / Admin pusat teknis'}</td><td className="p-4"><div className="flex flex-wrap gap-2">{user.can_update_identity && <button className="min-h-11 px-2 text-pln-blue font-bold" onClick={() => { setError(''); setForm({ ...user, password: '' }); }}>Edit Akun</button>}{(central || (user.role !== 'admin' && !user.is_superadmin)) && <button disabled={busy} className="min-h-11 px-2 text-pln-blue font-bold" onClick={() => openMembership(user)}>Keanggotaan</button>}</div></td></tr>)}</tbody></table>{!data.data.length && <p className="p-6 text-slate-500">Belum ada pengguna di cakupan ini.</p>}</Card>}
    {form && <Drawer title={form.id ? 'Edit Akun' : 'Tambah Pengguna'} onClose={() => setForm(null)}><form onSubmit={submit} className="space-y-4">
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <Field label="Nama lengkap" required><input aria-label="Nama lengkap" required className={inputCls} value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} /></Field>
      <Field label="Email" required><input aria-label="Email" type="email" required disabled={Boolean(form.id)} className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
      {!form.id && !central && <Field label="Peran di UPT aktif"><select aria-label="Peran di UPT aktif" className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{(data?.roles || []).filter((role) => role !== 'admin').map((role) => <option key={role} value={role}>{ROLE_FULL_LABELS[role] || role}</option>)}</select></Field>}
      {(!form.id || form.can_reset_password) && <Field label={form.id ? 'Password baru (opsional)' : 'Password'} hint="Minimal 6 karakter. Perubahan kredensial memerlukan login ulang."><input aria-label="Password" type="password" autoComplete="new-password" minLength={6} required={!form.id} className={inputCls} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>}
      {form.id && <label className="flex items-center gap-3 min-h-11"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />Akun aktif</label>}
      <button disabled={busy} className="btn btn-primary btn-md" type="submit">{busy ? 'Menyimpan…' : 'Simpan Akun'}</button>
    </form></Drawer>}
    {target && <Drawer title={`Keanggotaan: ${target.nama}`} onClose={() => setTarget(null)}><div className="space-y-5">
      <p className="text-sm text-slate-600">{target.email}. Perubahan berlaku setelah login ulang.</p>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <div className="divide-y divide-slate-200">{memberships.map((m) => <div key={m.unit_id} className="py-3 flex justify-between items-center gap-2"><div><p className="font-bold text-pln-navy">{m.name || units.find((u) => u.id === m.unit_id)?.name}</p><p className="text-xs text-slate-600">{ROLE_FULL_LABELS[m.role]}{m.jabatan ? ` · ${m.jabatan}` : ''} · {m.active ? 'Aktif' : 'Dicabut'}</p></div>{(central || m.role !== 'admin') && <button className="min-h-11 px-2 text-pln-blue font-bold" onClick={() => setMemberForm({ unit_id: m.unit_id, role: m.role, jabatan: m.jabatan || '', active: m.active })}>Ubah</button>}</div>)}{!memberships.length && <p className="text-sm text-slate-500">Belum memiliki keanggotaan.</p>}</div>
      <form onSubmit={assign} className="space-y-4 border-t border-slate-200 pt-4"><Field label="Unit" required><select aria-label="Unit keanggotaan" required className={inputCls} value={memberForm.unit_id} onChange={(e) => setMemberForm({ ...memberForm, unit_id: e.target.value, role: 'staff', jabatan: '' })}><option value="">Pilih unit</option>{allowedUnits.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field><Field label="Peran"><select aria-label="Peran keanggotaan" className={inputCls} value={memberForm.role} onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}>{roles.map((role) => <option key={role} value={role}>{ROLE_FULL_LABELS[role] || role}</option>)}</select></Field><Field label="Jabatan unit" hint="Opsional, maksimal 120 karakter"><input aria-label="Jabatan unit" maxLength={120} className={inputCls} value={memberForm.jabatan} onChange={(e) => setMemberForm({ ...memberForm, jabatan: e.target.value })} /></Field><label className="flex items-center gap-3 min-h-11"><input type="checkbox" checked={memberForm.active} onChange={(e) => setMemberForm({ ...memberForm, active: e.target.checked })} />Keanggotaan aktif</label><button type="submit" disabled={busy || !memberForm.unit_id} className="btn btn-primary btn-md">{busy ? 'Menyimpan…' : 'Simpan Keanggotaan'}</button></form>
    </div></Drawer>}
  </div>;
}
