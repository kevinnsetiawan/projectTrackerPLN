import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardCheck, Search } from 'lucide-react';
import { listInstruksi, listProjects } from '../api.js';
import { TOPIC, useLive } from '../events.js';
import { setPageTitle } from '../components/Layout.jsx';
import { PageHeader, Spinner, inputCls, Card } from '../components/ui.jsx';
import InstruksiKerjaList from '../components/InstruksiKerjaList.jsx';

const TAHAP = ['Kontraktual', 'Survei & JSA', 'Pembahasan IK', 'Penjadwalan Jalur', 'Penerbitan JSA/WP/DP3', 'Pelaksanaan'];
const STATUS = ['Menunggu ULTG', 'Menunggu UPT', 'Menunggu Unit Induk', 'Approved', 'Revisi', 'Ditolak'];

export default function InstruksiKerjaIndex() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState(null);
  const [projects, setProjects] = useState([]);
  const [err, setErr] = useState(null);

  const selectedProjectId = params.get('project_id') || 'all';
  const selectedStatus = params.get('status') || 'all';
  const selectedTahap = params.get('tahap') || 'all';
  const [search, setSearch] = useState(params.get('search') || '');

  function loadData() {
    listInstruksi({
      project_id: selectedProjectId,
      status: selectedStatus,
      tahap: selectedTahap,
      search: search || undefined,
    })
      .then(setItems)
      .catch((e) => setErr(e.message));
  }

  const reload = useCallback(() => {
    listInstruksi({
      project_id: selectedProjectId,
      status: selectedStatus,
      tahap: selectedTahap,
      search: search || undefined,
    })
      .then(setItems)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    setPageTitle('Approval Instruksi Kerja');
    listProjects({ limit: 100 }).then((res) => setProjects(res.data || [])).catch(() => {});
    loadData();
  }, [params]);

  // Keputusan approval dari akun dalkon/enjin/admin langsung tampil di sini.
  useLive(TOPIC.INSTRUKSI, reload);

  function updateParam(key, value) {
    const next = new URLSearchParams(params);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    setParams(next);
  }

  if (err) return <div className="text-red-600 bg-red-50 p-4 rounded-lg">{err}</div>;
  if (!items) return <Spinner show />;

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title="Approval Instruksi Kerja (IK)"
        subtitle="Alur Pekerjaan Eksternal 02 — pengajuan Vendor sampai approval berjenjang ULTG → UPT → Unit Induk"
      />

      <Card className="p-4">
        <div className="grid md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              className={`${inputCls} pl-9`}
              placeholder="Cari judul, nomor IK, proyek..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && updateParam('search', search)}
            />
          </div>

          <select className={inputCls} value={selectedProjectId} onChange={(e) => updateParam('project_id', e.target.value)}>
            <option value="all">Semua Proyek Konstruksi</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.kode} - {p.nama}</option>
            ))}
          </select>

          <select className={inputCls} value={selectedStatus} onChange={(e) => updateParam('status', e.target.value)}>
            <option value="all">Semua Status Approval</option>
            {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select className={inputCls} value={selectedTahap} onChange={(e) => updateParam('tahap', e.target.value)}>
            <option value="all">Semua Tahap Pekerjaan</option>
            {TAHAP.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {selectedProjectId === 'all' && (
          <p className="mt-2 text-2xs text-slate-500 flex items-center gap-1">
            <ClipboardCheck className="w-3.5 h-3.5" /> Pilih salah satu proyek untuk mengajukan IK baru dari halaman ini.
          </p>
        )}
      </Card>

      <InstruksiKerjaList
        projectId={selectedProjectId !== 'all' ? selectedProjectId : null}
        items={items}
        onRefresh={loadData}
      />
    </div>
  );
}
