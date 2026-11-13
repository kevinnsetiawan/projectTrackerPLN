import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileCheck, Search, Filter } from 'lucide-react';
import { listDrawings, listProjectOptions } from '../api.js';
import { TOPIC, useLive } from '../events.js';
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
  const urlSearch = params.get('search') || '';
  const [search, setSearch] = useState(urlSearch);

  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  const loadData = useCallback(() => {
    listDrawings({ project_id: selectedProjectId, status: selectedStatus, search: urlSearch || undefined })
      .then(setDrawings)
      .catch((e) => setErr(e.message));
  }, [selectedProjectId, selectedStatus, urlSearch]);

  const reload = useCallback(() => {
    listDrawings({ project_id: selectedProjectId, status: selectedStatus, search: urlSearch || undefined })
      .then(setDrawings)
      .catch(() => {});
  }, [selectedProjectId, selectedStatus, urlSearch]);

  useEffect(() => {
    setPageTitle('Monitoring Approval Drawing');
    listProjectOptions('drawings').then((res) => setProjects(res.data || [])).catch(() => {});
    loadData();
  }, [loadData]);

  // Status approval / review engineering berubah dari akun vendor, dalkon, enjin.
  useLive(TOPIC.DRAWING, reload);

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
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              updateParam('search', search.trim());
            }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                className={`${inputCls} pl-9`}
                placeholder="Cari judul, nomor drawing, proyek..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm shrink-0">Cari</button>
          </form>

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
            <option value="Menunggu Penyerahan Engineering">Menunggu Penyerahan ke Engineering</option>
            <option value="Dalam Review Engineering">Dalam Review Engineering</option>
            <option value="Approved">Approved</option>
            <option value="Revisi">Revisi</option>
          </select>
        </div>
        {selectedProjectId === 'all' && (
          <p className="mt-2 text-2xs text-slate-500 flex items-center gap-1">
            <FileCheck className="w-3.5 h-3.5" /> Pilih salah satu proyek untuk mengunggah drawing baru dari halaman ini.
          </p>
        )}
      </Card>

      {/* Reusable Approval Drawing List Component */}
      <ApprovalDrawingList
        projectId={selectedProjectId !== 'all' ? selectedProjectId : null}
        drawings={drawings}
        onRefresh={loadData}
        showStatusFilter={false}
      />
    </div>
  );
}
