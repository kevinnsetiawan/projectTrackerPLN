import React, { useEffect, useState } from 'react';
import { listGarduInduk } from '../api.js';
import { canAction } from '../auth.js';
import { setPageTitle } from '../components/Layout.jsx';
import { Card, PageHeader, Spinner, inputCls } from '../components/ui.jsx';

export default function GarduIndukIndex() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [unit, setUnit] = useState('');
  const allowed = canAction('read') || canAction('unit_manage');

  async function reload() {
    setError('');
    try { setData((await listGarduInduk({ include_inactive: 1 })).data || []); }
    catch (e) { if (e.name !== 'AbortError') setError(e.message); }
  }
  useEffect(() => {
    setPageTitle('Master Gardu Induk');
    if (allowed) reload();
  }, [allowed]);

  if (!allowed) return <p role="alert" className="p-4 bg-amber-50 text-amber-800 rounded-lg">Pilih unit dengan akses baca untuk melihat master Gardu Induk.</p>;
  const units = [...new Map((data || []).map((gi) => [String(gi.unit_id), gi.unit_name || gi.unit_code || `Unit #${gi.unit_id}`])).entries()].sort((a, b) => a[1].localeCompare(b[1], 'id'));
  const query = search.trim().toLocaleLowerCase('id');
  const rows = (data || []).filter((gi) => (!unit || String(gi.unit_id) === unit) && (!query || `${gi.nama} ${gi.unit_name || ''} ${gi.unit_code || ''}`.toLocaleLowerCase('id').includes(query)));

  return <div className="space-y-5">
    <PageHeader title="Master Gardu Induk" subtitle="Referensi Gardu Induk sesuai cakupan unit. Data aktif dan nonaktif ditampilkan untuk penelusuran." />
    {error && <div role="alert" className="p-4 rounded-lg bg-red-50 text-red-700">{error}<button type="button" onClick={reload} className="min-h-11 ml-3 px-2 font-bold underline">Coba lagi</button></div>}
    <Card className="p-4"><div className="grid gap-4 sm:grid-cols-2">
      <div><label htmlFor="gi-search" className="block mb-1 text-sm font-medium text-slate-700">Cari Gardu Induk</label><input id="gi-search" type="search" className={`${inputCls} min-h-11`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nama GI atau UPT" /></div>
      <div><label htmlFor="gi-unit" className="block mb-1 text-sm font-medium text-slate-700">UPT</label><select id="gi-unit" className={`${inputCls} min-h-11`} value={unit} onChange={(e) => setUnit(e.target.value)}><option value="">Semua UPT dalam cakupan</option>{units.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div>
    </div></Card>
    {!data && !error ? <Spinner show /> : data && <Card className="overflow-hidden">
      <p role="status" className="px-4 py-3 text-sm text-slate-600 border-b border-slate-200">{rows.length} dari {data.length} Gardu Induk</p>
      <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-100 text-slate-600"><tr><th scope="col" className="p-4">Gardu Induk</th><th scope="col" className="p-4">UPT</th><th scope="col" className="p-4">Status</th><th scope="col" className="p-4">Koordinat referensi</th><th scope="col" className="p-4">Sumber peta</th></tr></thead><tbody>{rows.map((gi) => <tr key={gi.id} className="border-t border-slate-200"><th scope="row" className="p-4 font-semibold text-pln-navy">{gi.nama}</th><td className="p-4">{gi.unit_name || gi.unit_code || `Unit #${gi.unit_id}`}</td><td className="p-4"><span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${gi.active ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{gi.active ? 'Aktif' : 'Nonaktif'}</span></td><td className="p-4 tabular-nums">{gi.latitude == null || gi.longitude == null ? 'Belum tersedia' : `${gi.latitude}, ${gi.longitude}`}</td><td className="p-4">{/^https?:\/\//i.test(gi.map_source_url || '') ? <a className="inline-flex items-center min-h-11 font-semibold text-pln-blue underline" href={gi.map_source_url} target="_blank" rel="noopener noreferrer" aria-label={`Buka sumber peta ${gi.nama}`}>Buka peta<span className="sr-only"> (tab baru)</span></a> : '—'}</td></tr>)}</tbody></table></div>
      {!rows.length && <p className="p-6 text-sm text-slate-500">{data.length ? 'Tidak ada Gardu Induk yang sesuai filter.' : 'Belum ada referensi Gardu Induk dalam cakupan ini.'}</p>}
    </Card>}
  </div>;
}
