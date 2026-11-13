import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listUnits, createUnit, updateUnit } from '../api.js';
import { canAction } from '../auth.js';
import { setPageTitle } from '../components/Layout.jsx';
import { Card, PageHeader, Field, inputCls, Spinner, Drawer } from '../components/ui.jsx';

const EMPTY = { code: '', name: '', kind: 'unit_induk', parent_id: '', active: true };

export default function Organization() {
  const [units, setUnits] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  async function reload() { setUnits((await listUnits()).data || []); }
  useEffect(() => { setPageTitle('Organisasi & Keanggotaan'); reload().catch((e) => setError(e.message)); }, []);
  if (!canAction('unit_manage')) return <p role="alert">Akses pengelolaan organisasi tidak tersedia.</p>;
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const data = { ...editing, parent_id: editing.kind === 'upt' ? Number(editing.parent_id) : null };
      if (editing.id) await updateUnit(editing.id, data);
      else await createUnit(data);
      setEditing(null); await reload(); setNotice('Data organisasi disimpan.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const parents = (units || []).filter((u) => u.kind === 'unit_induk' && u.active);
  return <div className="space-y-5">
    <PageHeader title="Organisasi & Keanggotaan" subtitle="Isi nama resmi Unit Induk dan enam UPT. Keanggotaan ditetapkan pada akun pengguna." actions={<button className="btn btn-primary btn-md" onClick={() => { setError(''); setEditing({ ...EMPTY, kind: parents.length ? 'upt' : 'unit_induk', parent_id: parents[0]?.id || '' }); }}>Tambah Unit</button>} />
    {error && <div role="alert" className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>}
    {notice && <div role="status" className="p-4 bg-emerald-50 text-emerald-700 rounded-lg">{notice}</div>}
    <Card className="p-5"><p className="text-sm text-slate-600">Satu akun email dapat memiliki peran berbeda pada beberapa unit. Admin pusat menetapkan admin dan akses lintas unit.</p><Link to="/users" className="inline-block mt-3 text-pln-blue font-bold underline">Kelola akun dan keanggotaan</Link></Card>
    {!units ? <Spinner show /> : <Card className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-100 text-slate-600"><tr><th className="p-4" scope="col">Kode</th><th className="p-4" scope="col">Nama resmi</th><th className="p-4" scope="col">Jenis / Induk</th><th className="p-4" scope="col">Status</th><th className="p-4" scope="col">Aksi</th></tr></thead><tbody>{units.map((u) => <tr className="border-t border-slate-200 hover:bg-slate-50 transition-colors" key={u.id}><td className="p-4 font-mono text-xs font-bold text-pln-navy">{u.code}</td><td className="p-4 font-semibold text-pln-navy">{u.name}</td><td className="p-4 text-slate-600">{u.kind === 'unit_induk' ? 'Unit Induk' : `UPT / ${units.find((parent) => parent.id === u.parent_id)?.name || '—'}`}</td><td className="p-4"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold border ${u.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{u.active ? 'Aktif' : 'Nonaktif'}</span></td><td className="p-4"><button className="text-pln-blue font-bold min-h-11 px-2 hover:underline" onClick={() => { setError(''); setEditing(u); }}>Edit</button></td></tr>)}</tbody></table>{!units.length && <p className="p-6 text-slate-500">Belum ada unit. Tambahkan Unit Induk dengan nama resmi terlebih dahulu.</p>}</Card>}
    {editing && <Drawer title={editing.id ? 'Edit Unit' : 'Tambah Unit'} onClose={() => setEditing(null)}><form onSubmit={submit} className="space-y-4">
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <Field label="Kode resmi" required><input aria-label="Kode resmi" required className={inputCls} value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} /></Field>
      <Field label="Nama resmi" required><input aria-label="Nama resmi" required className={inputCls} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
      <Field label="Jenis unit"><select aria-label="Jenis unit" disabled={Boolean(editing.id)} className={inputCls} value={editing.kind} onChange={(e) => setEditing({ ...editing, kind: e.target.value })}><option value="unit_induk">Unit Induk</option><option value="upt">UPT</option></select></Field>
      {editing.kind === 'upt' && <Field label="Unit Induk" required><select aria-label="Unit Induk" required disabled={Boolean(editing.id)} className={inputCls} value={editing.parent_id || ''} onChange={(e) => setEditing({ ...editing, parent_id: e.target.value })}><option value="">Pilih Unit Induk</option>{parents.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>}
      {editing.id && <label className="flex gap-3 items-center min-h-11 text-sm"><input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />Unit aktif</label>}
      <button disabled={busy} className="btn btn-primary btn-md" type="submit">{busy ? 'Menyimpan…' : 'Simpan Unit'}</button>
    </form></Drawer>}
  </div>;
}
