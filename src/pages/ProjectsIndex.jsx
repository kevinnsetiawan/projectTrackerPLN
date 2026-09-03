import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Download, PencilRuler, RefreshCw, Clock } from 'lucide-react';
import { listProjects, exportCsvUrl } from '../api.js';
import { setPageTitle } from '../components/Layout.jsx';
import { Card, StatusBadge, ProgressBar, DevChip, PageHeader, Spinner, Empty, inputCls } from '../components/ui.jsx';
import { nilaiMilyar, fmtDate, tipeShort, uipShort, formatSisaKontrak } from '../utils.js';

export default function ProjectsIndex() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [search, setSearch] = useState(params.get('search') || '');
  const uip = params.get('uip') || 'all';
  const tipe = params.get('tipe') || 'all';
  const status = params.get('status') || 'all';
  const page = params.get('page') || '1';

  useEffect(() => {
    setPageTitle('Daftar & Monitoring Proyek');
    listProjects({
      search: search || undefined, uip, tipe, status, page,
    }).then(setData).catch((e) => setErr(e.message));
  }, [params]);

  function updateParam(key, value) {
    const next = new URLSearchParams(params);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setParams(next);
  }

  if (err) return <div className="text-red-600 bg-red-50 p-4 rounded-lg">{err}</div>;
  if (!data) return <Spinner show />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Daftar &amp; Monitoring Proyek"
        subtitle={`${data.pagination.total} proyek konstruksi terdaftar`}
        actions={
          <>
            <Link to={exportCsvUrl()} className="inline-flex items-center gap-2 text-sm font-semibold text-pln-blue border border-pln-blue/30 rounded-lg px-4 py-2 hover:bg-pln-blue hover:text-white transition">
              <Download className="w-4 h-4" /> Export CSV
            </Link>
            <Link to="/projects/new" className="inline-flex items-center gap-2 text-sm font-bold bg-pln-gradient text-white rounded-lg px-4 py-2 shadow-pln-cta hover:shadow-pln transition">
              <PencilRuler className="w-4 h-4" /> Tambah Proyek
            </Link>
          </>
        }
      />

      <Card className="p-4 mb-5">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              className={`${inputCls} pl-9`} placeholder="Cari kode, nama, kontraktor, lokasi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && updateParam('search', search)}
            />
          </div>
          <select className={inputCls} value={uip} onChange={(e) => updateParam('uip', e.target.value)}>
            <option value="all">Semua Unit Induk</option>
            {data.distinctUip.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          <select className={inputCls} value={tipe} onChange={(e) => updateParam('tipe', e.target.value)}>
            <option value="all">Semua Tipe</option>
            {data.allTipe.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className={inputCls} value={status} onChange={(e) => updateParam('status', e.target.value)}>
            <option value="all">Semua Status</option>
            {['In Progress', 'Critical', 'Testing', 'COD / Energized', 'Planning'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </Card>

      {data.data.length === 0 ? (
        <Empty message="Tidak ada proyek yang cocok dengan filter." />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.data.map((p) => {
            const sisa = formatSisaKontrak(p.tgl_mulai, p.target_cod, p.status);
            return (
              <Card key={p.id} className="p-5 flex flex-col hover:shadow-pln-hover transition animate-fade-up">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="font-mono text-xs font-bold bg-pln-lightcyan text-pln-blue px-2 py-0.5 rounded">{p.kode}</div>
                  <StatusBadge status={p.status} />
                </div>
                <div className="font-semibold text-slate-800 leading-snug line-clamp-2 mb-1">{p.nama}</div>
                <div className="text-xs text-slate-500 mb-3">{p.lokasi}</div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{tipeShort(p.tipe)}</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{p.tegangan}</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{uipShort(p.uip)}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${sisa.cls}`}>
                    ⏱️ {sisa.badgeText}
                  </span>
                </div>

                <div className="space-y-3 mt-auto">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                      <span>Progres Realisasi</span><span className="font-semibold text-slate-700">{p.progres_realisasi}%</span>
                    </div>
                    <ProgressBar value={p.progres_realisasi} status={p.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <DevChip dev={p.deviasi} />
                    <span className="text-[11px] text-slate-500">{nilaiMilyar(p.nilai_kontrak)}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">Kontraktor: <span className="text-slate-700">{p.kontraktor}</span></div>
                  <div className="bg-slate-50 p-2 rounded-lg text-[11px] text-slate-600 flex items-center justify-between border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Awal Kontrak</span>
                      <span className="font-medium">{fmtDate(p.tgl_mulai)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">Target COD</span>
                      <span className="font-medium">{fmtDate(p.target_cod)}</span>
                    </div>
                  </div>
                </div>

              <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                <Link to={`/projects/${p.id}/progress`} className="flex-1 text-center text-xs font-bold text-pln-cyan border border-pln-cyan/40 rounded-lg py-2 hover:bg-pln-cyan hover:text-white transition">Update Progres</Link>
                <Link to={`/projects/${p.id}`} className="flex-1 text-center text-xs font-bold text-pln-blue rounded-lg py-2 hover:bg-pln-lightcyan transition">Detail</Link>
              </div>
            </Card>
          );
        })}
        </div>
      )}

      {data.pagination.lastPage > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {Array.from({ length: data.pagination.lastPage }, (_, i) => i + 1).map((pg) => (
            <button
              key={pg}
              onClick={() => updateParam('page', String(pg))}
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