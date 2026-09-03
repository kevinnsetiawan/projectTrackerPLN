import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileCheck, Search, Filter } from 'lucide-react';
import { listDrawings, listProjects } from '../api.js';
import { setPageTitle } from '../components/Layout.jsx';
import { PageHeader, Spinner, inputCls, Card } from '../components/ui.jsx';
import ApprovalDrawingList from '../components/ApprovalDrawingList.jsx';

export default function ApprovalDrawingsIndex() {
  const [params, setParams] = useSearchParams();
  const [drawings, setDrawings] = useState(null);
  const [projects, setProjects] = useState([]);
  const [err, setErr] = useState(null);

  const selectedProjectId = params.get('project_id') || 'all';
  const selectedStatus = params.get('status') || 'all';
  const [search, setSearch] = useState(params.get('search') || '');

  function loadData() {
    listDrawings({ project_id: selectedProjectId, status: selectedStatus, search: search || undefined })
      .then(setDrawings)
      .catch((e) => setErr(e.message));
  }

  useEffect(() => {
    setPageTitle('Monitoring Approval Drawing');
    listProjects({ limit: 100 }).then((res) => setProjects(res.data || [])).catch(() => {});
    loadData();
  }, [params]);

  function updateParam(key, value) {
    const next = new URLSearchParams(params);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    setParams(next);
  }

  if (err) return <div className="text-red-600 bg-red-50 p-4 rounded-lg">{err}</div>;
  if (!drawings) return <Spinner show />;

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title="Monitoring Approval Drawing Pekerjaan"
        subtitle="Tracking &amp; Verifikasi Dokumen Gambar Teknis Konstruksi (8 Tahapan Approval)"
      />

      {/* Global Filter Bar */}
      <Card className="p-4">
        <div className="grid md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              className={`${inputCls} pl-9`}
              placeholder="Cari judul, nomor drawing, proyek..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && updateParam('search', search)}
            />
          </div>

          <select className={inputCls} value={selectedProjectId} onChange={(e) => updateParam('project_id', e.target.value)}>
            <option value="all">Semua Proyek Konstruksi</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.kode} - {p.nama}
              </option>
            ))}
          </select>

          <select className={inputCls} value={selectedStatus} onChange={(e) => updateParam('status', e.target.value)}>
            <option value="all">Semua Status Approval</option>
            <option value="Menunggu Hardfile">Menunggu Hardfile Vendor</option>
            <option value="Menunggu Nodin">Menunggu Nodin Dalkon</option>
            <option value="Menunggu Penyerahan Enjin">Menunggu Penyerahan ke Enjin</option>
            <option value="Dalam Review Enjin">Dalam Review Enjin</option>
            <option value="Approved">Approved</option>
            <option value="Revisi">Revisi</option>
          </select>
        </div>
      </Card>

      {/* Reusable Approval Drawing List Component */}
      <ApprovalDrawingList
        projectId={selectedProjectId !== 'all' ? selectedProjectId : projects[0]?.id || 1}
        drawings={drawings}
        onRefresh={loadData}
      />
    </div>
  );
}
