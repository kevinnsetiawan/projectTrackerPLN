import React, { useEffect, useState } from 'react';
import { listProjectVendors, saveProjectVendor } from '../api.js';
import { canAction } from '../auth.js';
import { Drawer, inputCls } from './ui.jsx';

export default function ProjectVendors({ projectId }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState('');
  useEffect(() => {
    if (open) listProjectVendors(projectId).then(setData).catch((e) => setError(e.message));
  }, [open, projectId]);
  if (!canAction('user_manage')) return null;
  async function save(userId, active) {
    setBusy(true); setError('');
    try { await saveProjectVendor(projectId, userId, active); setData(await listProjectVendors(projectId)); setSelected(''); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <><button className="text-sm font-bold text-pln-blue border border-slate-300 rounded-lg px-3 py-2 min-h-11" onClick={() => setOpen(true)}>Penugasan Vendor</button>
    {open && <Drawer title="Penugasan Vendor Proyek" onClose={() => setOpen(false)}><p className="text-sm text-slate-600 mb-4">Vendor hanya melihat proyek penugasannya. Perubahan akses memerlukan login ulang vendor.</p>{error && <p role="alert" className="p-3 mb-4 bg-red-50 text-red-700 rounded-lg">{error}</p>}
      {!data ? <p role="status">Memuat penugasan…</p> : <div className="space-y-5"><div className="divide-y divide-slate-200">{data.data.map((user) => <div key={user.id} className="flex justify-between items-center gap-3 py-3"><div><p className="font-bold text-pln-navy">{user.nama}</p><p className="text-xs text-slate-500">{user.email}</p></div><button className="text-red-600 min-h-11 px-2 font-bold text-sm" disabled={busy} onClick={() => save(user.id, false)}>Cabut</button></div>)}{!data.data.length && <p className="text-sm text-slate-500">Belum ada vendor ditugaskan.</p>}</div>
      <form onSubmit={(e) => { e.preventDefault(); save(selected, true); }} className="space-y-3"><label htmlFor="project-vendor" className="block text-sm font-bold text-slate-700">Vendor aktif pada UPT proyek</label><select id="project-vendor" className={inputCls} required value={selected} onChange={(e) => setSelected(e.target.value)}><option value="">Pilih vendor</option>{(data.candidates || []).filter((user) => !user.assigned).map((user) => <option key={user.id} value={user.id}>{user.nama} — {user.email}</option>)}</select><button type="submit" className="btn btn-primary btn-md" disabled={busy || !selected}>{busy ? 'Menyimpan…' : 'Tugaskan Vendor'}</button></form></div>}
    </Drawer>}
  </>;
}
