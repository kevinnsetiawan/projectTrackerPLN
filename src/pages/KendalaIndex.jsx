import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, AlertTriangle, ClipboardCheck, CheckCircle2 } from 'lucide-react';
import { listKendala, updateKendalaStatus } from '../api.js';
import { setPageTitle } from '../components/Layout.jsx';
import { Card, Field, inputCls, Spinner, Empty, PageHeader, StatCard } from '../components/ui.jsx';
import { fmtDate, uipShort } from '../utils.js';

const KATEGORI = ['Lahan / Sosial', 'Cuaca & Geoteknik', 'Material', 'Vendor / Manpower', 'Teknis / Utilitas', 'Regulasi / Perizinan'];

export default function KendalaIndex() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const search = params.get('search') || '';
  const kategori = params.get('kategori') || 'all';
  const status = params.get('status') || 'all';
  const page = params.get('page') || '1';

  useEffect(() => {
    setPageTitle('Pusat Monitoring Kendala');
    listKendala({ search: search || undefined, kategori, status, page }).then(setData).catch((e) => setErr(e.message));
  }, [params]);

  function setParam(key, value) {
    const next = new URLSearchParams(params);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setParams(next);
  }

  async function handleStatus(kenId, st) {
    await updateKendalaStatus(kenId, st);
    const fresh = await listKendala({ search: search || undefined, kategori, status, page });
    setData(fresh);
  }

  if (err) return <div className="text-red-600 bg-red-50 p-4 rounded-lg">{err}</div>;
  if (!data) return <Spinner show />;

  const counts = data.counts || { open: 0, inreview: 0, resolved: 0 };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Pusat Monitoring Kendala" subtitle="Issue & obstacle pada pekerjaan konstruksi" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <StatCard label="Kendala Terbuka" value={counts.open} icon={AlertTriangle} accent="text-red-600" />
        <StatCard label="Dalam Penanganan" value={counts.inreview} icon={ClipboardCheck} accent="text-amber-600" />
        <StatCard label="Terselesaikan" value={counts.resolved} icon={CheckCircle2} accent="text-emerald-600" />
      </div>

      <Card className="p-4 mb-5">
        <div className="grid md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              className={`${inputCls} pl-9`} placeholder="Cari deskripsi, kendala, proyek..."
              defaultValue={search}
              onKeyDown={(e) => e.key === 'Enter' && setParam('search', e.target.value)}
            />
          </div>
          <select className={inputCls} value={kategori} onChange={(e) => setParam('kategori', e.target.value)}>
            <option value="all">Semua Kategori</option>
            {KATEGORI.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <select className={inputCls} value={status} onChange={(e) => setParam('status', e.target.value)}>
            <option value="all">Semua Status</option>
            <option>Open</option><option>In Review</option><option>Resolved</option>
          </select>
        </div>
      </Card>

      {data.data.length === 0 ? <Empty message="Tidak ada kendala yang cocok." /> : (
        <div className="space-y-3">
          {data.data.map((k) => (
            <Card key={k.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Link to={`/projects/${k.project_id}`} className="font-mono text-xs font-bold text-pln-blue hover:underline">{k.project_kode}</Link>
                  <span className="text-sm text-slate-800 font-medium">{k.project_nama}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] bg-red-100 text-red-700 px-2 py-0.5 rounded">{k.kategori}</span>
                  <span className="text-[11px] text-slate-500">{uipShort(k.project_uip)} &bull; {fmtDate(k.tgl_lapor)}</span>
                  <select
                    className="text-xs border border-slate-300 rounded-md px-2 py-1"
                    value={k.status}
                    onChange={(e) => handleStatus(k.id, e.target.value)}
                  >
                    <option>Open</option><option>In Review</option><option>Resolved</option>
                  </select>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-3 text-sm">
                <div><div className="text-xs font-bold text-slate-600 mb-1">Deskripsi Kendala</div><p className="text-slate-700 text-xs">{k.deskripsi}</p></div>
                <div><div className="text-xs font-bold text-slate-600 mb-1">Dampak Terhadap Schedule</div><p className="text-slate-600 text-xs">{k.dampak || '-'}</p></div>
                <div><div className="text-xs font-bold text-emerald-700 mb-1">Tindakan Mitigasi</div><p className="text-emerald-800 text-xs bg-emerald-50 rounded-md p-2">{k.tindakan_mitigasi || '-'}</p></div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {data.pagination.lastPage > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {Array.from({ length: data.pagination.lastPage }, (_, i) => i + 1).map((pg) => (
            <button
              key={pg}
              onClick={() => setParam('page', String(pg))}
              className={`w-9 h-9 rounded-lg text-sm font-semibold transition ${pg === data.pagination.page ? 'bg-pln-blue text-white' : 'bg-white text-slate-600 border hover:bg-slate-100'}`}
            >
              {pg}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}