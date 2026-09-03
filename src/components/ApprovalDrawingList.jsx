import React, { useState } from 'react';
import {
  FileText, Upload, CheckCircle2, Clock, XCircle, AlertCircle, FileCheck, FileDown, PlusCircle, Pencil, ExternalLink, Send, ShieldCheck, UserCheck, Eye, Trash2
} from 'lucide-react';
import { Card, BadgeIcon, inputCls, Field } from './ui.jsx';
import { fmtDate } from '../utils.js';
import { getUser } from '../auth.js';
import { storeDrawing, updateDrawingDalkon, updateDrawingEnjin, deleteDrawing } from '../api.js';

const KATEGORI_DRAWING = ['Sipil & Konstruksi', 'Elektromekanikal', 'Proteksi & Kontrol', 'Arsitektur', 'Struktur Tower', 'Skema Sistem'];

export default function ApprovalDrawingList({ projectId, drawings = [], onRefresh }) {
  const me = getUser();
  const isAdmin = me && me.role === 'admin';
  const isVendor = me && me.role === 'vendor';
  const isDalkon = me && me.role === 'dalkon';
  const isEnjin = me && me.role === 'enjin';

  const [filterKategori, setFilterKategori] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modals
  const [vendorModal, setVendorModal] = useState(false);
  const [dalkonModal, setDalkonModal] = useState(null); // holding drawing object
  const [enjinModal, setEnjinModal] = useState(null); // holding drawing object

  // Vendor Form
  const [vForm, setVForm] = useState({ judul: '', nomor_drawing: '', kategori: 'Sipil & Konstruksi', file_vendor: '' });
  // Dalkon Form
  const [dForm, setDForm] = useState({ hardfile_vendor: false, tgl_hardfile_vendor: '', nodin_kons: false, nomor_nodin: '', tgl_nodin: '', hardfile_ke_enjin: false, tgl_hardfile_ke_enjin: '' });
  // Enjin Form
  const [eForm, setEForm] = useState({ enjin_review_status: 'Approved', catatan_enjin: '', file_enjin: '' });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  function notify(text) {
    setMsg(text);
    setTimeout(() => setMsg(null), 3500);
  }

  // Submit Upload Vendor (Step 1 & 2)
  async function handleVendorSubmit(e) {
    e.preventDefault();
    if (!vForm.judul || !vForm.file_vendor) {
      alert('Judul drawing dan link/dokumen vendor wajib diisi');
      return;
    }
    setLoading(true);
    try {
      await storeDrawing(projectId, vForm);
      setVendorModal(false);
      setVForm({ judul: '', nomor_drawing: '', kategori: 'Sipil & Konstruksi', file_vendor: '' });
      notify('Dokumen drawing berhasil diunggah oleh Vendor.');
      if (onRefresh) onRefresh();
    } catch (er) {
      alert(er.message);
    } finally {
      setLoading(false);
    }
  }

  // Open Dalkon Verification Modal (Step 3, 4, 5, 6)
  function openDalkonModal(dwg) {
    setDalkonModal(dwg);
    setDForm({
      hardfile_vendor: Boolean(dwg.hardfile_vendor),
      tgl_hardfile_vendor: dwg.tgl_hardfile_vendor ? String(dwg.tgl_hardfile_vendor).slice(0, 10) : '',
      nodin_kons: Boolean(dwg.nodin_kons),
      nomor_nodin: dwg.nomor_nodin || '',
      tgl_nodin: dwg.tgl_nodin ? String(dwg.tgl_nodin).slice(0, 10) : '',
      hardfile_ke_enjin: Boolean(dwg.hardfile_ke_enjin),
      tgl_hardfile_ke_enjin: dwg.tgl_hardfile_ke_enjin ? String(dwg.tgl_hardfile_ke_enjin).slice(0, 10) : '',
    });
  }

  async function handleDalkonSubmit(e) {
    e.preventDefault();
    if (!dalkonModal) return;
    setLoading(true);
    try {
      await updateDrawingDalkon(dalkonModal.id, dForm);
      setDalkonModal(null);
      notify('Status verifikasi Dalkon berhasil diperbarui.');
      if (onRefresh) onRefresh();
    } catch (er) {
      alert(er.message);
    } finally {
      setLoading(false);
    }
  }

  // Open Enjin Approval Modal (Step 7 & 8)
  function openEnjinModal(dwg) {
    setEnjinModal(dwg);
    setEForm({
      enjin_review_status: dwg.enjin_review_status === 'Revisi' ? 'Revisi' : 'Approved',
      catatan_enjin: dwg.catatan_enjin || '',
      file_enjin: dwg.file_enjin || '',
    });
  }

  async function handleEnjinSubmit(e) {
    e.preventDefault();
    if (!enjinModal) return;
    if (eForm.enjin_review_status === 'Approved' && !eForm.file_enjin) {
      if (!confirm('Anda belum melampirkan file dokumen hasil approval Enjin. Lanjutkan simpan?')) return;
    }
    setLoading(true);
    try {
      await updateDrawingEnjin(enjinModal.id, eForm);
      setEnjinModal(null);
      notify(`Status Drawing berhasil diset: ${eForm.enjin_review_status}.`);
      if (onRefresh) onRefresh();
    } catch (er) {
      alert(er.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteDrawing(id) {
    if (!confirm('Yakin menghapus dokumen approval drawing ini?')) return;
    try {
      await deleteDrawing(id);
      notify('Dokumen drawing berhasil dihapus.');
      if (onRefresh) onRefresh();
    } catch (er) { alert(er.message); }
  }

  // Filter items
  const filtered = drawings.filter((d) => {
    if (filterKategori !== 'all' && d.kategori !== filterKategori) return false;
    if (filterStatus !== 'all' && d.status_approval !== filterStatus) return false;
    return true;
  });

  // Helper file upload handler
  function handleFileRead(setFn, fieldKey, e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFn((prev) => ({ ...prev, [fieldKey]: reader.result }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  return (
    <div className="space-y-5">
      {msg && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">{msg}</div>}

      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="font-bold text-pln-navy text-base flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-pln-cyan" />
            Approval Drawing Proyek ({drawings.length})
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Alur verifikasi &amp; persetujuan dokumen teknis (Vendor &rarr; Dalkon &rarr; Enjin)
          </p>
        </div>
        {(isVendor || isAdmin) && (
          <button
            onClick={() => setVendorModal(true)}
            className="inline-flex items-center gap-2 bg-pln-gradient text-white text-xs font-bold px-4 py-2 rounded-lg shadow-pln-cta hover:shadow-pln transition"
          >
            <PlusCircle className="w-4 h-4" /> Upload Drawing Baru
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
        <select className={`${inputCls} max-w-xs text-xs`} value={filterKategori} onChange={(e) => setFilterKategori(e.target.value)}>
          <option value="all">Semua Kategori Drawing</option>
          {KATEGORI_DRAWING.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <select className={`${inputCls} max-w-xs text-xs`} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">Semua Status Approval</option>
          <option value="Menunggu Hardfile">Menunggu Hardfile Vendor</option>
          <option value="Menunggu Nodin">Menunggu Nodin Dalkon</option>
          <option value="Menunggu Penyerahan Enjin">Menunggu Penyerahan ke Enjin</option>
          <option value="Dalam Review Enjin">Dalam Review Enjin</option>
          <option value="Approved">Approved</option>
          <option value="Revisi">Revisi</option>
        </select>
      </div>

      {/* Drawings List */}
      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium">Belum ada dokumen Approval Drawing.</p>
          <p className="text-xs text-slate-400 mt-1">Vendor dapat mengunggah gambar teknis/drawing untuk diproses verifikasinya.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((d) => {
            const isApproved = d.status_approval === 'Approved';
            const isRevisi = d.status_approval === 'Revisi';
            const isReview = d.status_approval === 'Dalam Review Enjin';

            return (
              <Card key={d.id} className="p-5 border border-slate-200 hover:shadow-md transition">
                {/* Header Item */}
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold bg-slate-100 text-pln-blue px-2 py-0.5 rounded">
                        {d.nomor_drawing || 'NO-REG'}
                      </span>
                      <span className="text-xs bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded font-semibold">{d.kategori}</span>
                    </div>
                    <h4 className="font-bold text-pln-navy text-base">{d.judul}</h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${
                        isApproved
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : isRevisi
                          ? 'bg-red-100 text-red-800 border-red-300'
                          : isReview
                          ? 'bg-cyan-100 text-cyan-800 border-cyan-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      {isApproved && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {isRevisi && <XCircle className="w-3.5 h-3.5" />}
                      {!isApproved && !isRevisi && <Clock className="w-3.5 h-3.5" />}
                      {d.status_approval}
                    </span>

                    {(isDalkon || isAdmin) && (
                      <button
                        onClick={() => openDalkonModal(d)}
                        className="text-xs font-bold text-pln-blue border border-pln-blue/30 rounded-lg px-2.5 py-1.5 hover:bg-pln-lightcyan transition"
                        title="Verifikasi Hardfile & Nodin (Dalkon)"
                      >
                        <UserCheck className="inline w-3.5 h-3.5 mr-1" /> Dalkon Action
                      </button>
                    )}

                    {(isEnjin || isAdmin) && (
                      <button
                        onClick={() => openEnjinModal(d)}
                        className="text-xs font-bold text-emerald-700 border border-emerald-300 rounded-lg px-2.5 py-1.5 hover:bg-emerald-50 transition"
                        title="Review & Approval Enjin"
                      >
                        <ShieldCheck className="inline w-3.5 h-3.5 mr-1" /> Review Enjin
                      </button>
                    )}

                    {isAdmin && (
                      <button onClick={() => handleDeleteDrawing(d.id)} className="text-slate-400 hover:text-red-600 p-1" title="Hapus">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 8-Step Workflow Status Tracker */}
                <div className="mt-4 pt-2">
                  <div className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-3">
                    Progress Alur Verifikasi (8 Tahap Approval):
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-center text-xs">
                    {/* Step 1: Judul */}
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <div className="font-bold text-[10px] text-slate-400">1. Nama Drawing</div>
                      <div className="font-semibold text-slate-800 text-[11px] truncate mt-0.5" title={d.judul}>{d.judul}</div>
                      <div className="text-[9px] text-emerald-600 font-bold mt-1">✓ Terdaftar</div>
                    </div>

                    {/* Step 2: Upload Vendor */}
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <div className="font-bold text-[10px] text-slate-400">2. Dokumen Vendor</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{fmtDate(d.tgl_upload_vendor)}</div>
                      {d.file_vendor ? (
                        <a href={d.file_vendor} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-bold text-pln-cyan hover:underline mt-1">
                          <Eye className="w-3 h-3" /> Lihat File
                        </a>
                      ) : <span className="text-[10px] text-red-500">Belum ada</span>}
                    </div>

                    {/* Step 3: Hardfile Vendor */}
                    <div className={`p-2 rounded-lg border ${d.hardfile_vendor ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="font-bold text-[10px] text-slate-500">3. Hardfile Vendor</div>
                      <div className={`font-bold text-[11px] mt-0.5 ${d.hardfile_vendor ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {d.hardfile_vendor ? '✓ Sudah Kirim' : 'Belum Kirim'}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">{fmtDate(d.tgl_hardfile_vendor)}</div>
                    </div>

                    {/* Step 4: Kons Nodin */}
                    <div className={`p-2 rounded-lg border ${d.nodin_kons ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="font-bold text-[10px] text-slate-500">4. Nodin Dalkon</div>
                      <div className={`font-bold text-[11px] mt-0.5 ${d.nodin_kons ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {d.nodin_kons ? '✓ Sudah Nodin' : 'Belum Nodin'}
                      </div>
                      <div className="text-[9px] text-slate-500 truncate" title={d.nomor_nodin}>{d.nomor_nodin || '-'}</div>
                    </div>

                    {/* Step 5: Hardfile ke Enjin */}
                    <div className={`p-2 rounded-lg border ${d.hardfile_ke_enjin ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="font-bold text-[10px] text-slate-500">5. Serah ke Enjin</div>
                      <div className={`font-bold text-[11px] mt-0.5 ${d.hardfile_ke_enjin ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {d.hardfile_ke_enjin ? '✓ Diserahkan' : 'Belum Serah'}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">{fmtDate(d.tgl_hardfile_ke_enjin)}</div>
                    </div>

                    {/* Step 6: Review Enjin */}
                    <div className={`p-2 rounded-lg border ${d.hardfile_ke_enjin ? 'bg-cyan-50/70 border-cyan-200' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="font-bold text-[10px] text-slate-500">6. Review Enjin</div>
                      <div className="font-bold text-[11px] text-cyan-800 mt-0.5">
                        {d.enjin_review_status || 'Pending'}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">{fmtDate(d.tgl_enjin_review)}</div>
                    </div>

                    {/* Step 7: Keputusan Approval */}
                    <div className={`p-2 rounded-lg border ${isApproved ? 'bg-emerald-50 border-emerald-300' : isRevisi ? 'bg-red-50 border-red-300' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="font-bold text-[10px] text-slate-500">7. Keputusan Enjin</div>
                      <div className={`font-extrabold text-[11px] mt-0.5 ${isApproved ? 'text-emerald-700' : isRevisi ? 'text-red-700' : 'text-slate-400'}`}>
                        {d.enjin_review_status === 'Approved' ? '✓ Approved' : d.enjin_review_status === 'Revisi' ? '✕ Revisi' : 'Menunggu'}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">{fmtDate(d.tgl_approval_enjin)}</div>
                    </div>

                    {/* Step 8: Dokumen Approval (Enjin Upload) */}
                    <div className={`p-2 rounded-lg border ${d.file_enjin ? 'bg-emerald-50/90 border-emerald-300' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="font-bold text-[10px] text-slate-500">8. Dokumen Approval</div>
                      {d.file_enjin ? (
                        <a href={d.file_enjin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 hover:underline mt-1 bg-emerald-200/60 px-1.5 py-0.5 rounded">
                          <FileDown className="w-3 h-3" /> File Enjin
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-400 block mt-1">Belum ada</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Catatan Enjin Feedback */}
                {d.catatan_enjin && (
                  <div className="mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                    <span className="font-bold text-slate-700">Catatan / Tanggapan Engineering:</span>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">{d.catatan_enjin}</p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal 1: Vendor Upload Drawing (Step 1 & 2) */}
      {vendorModal && (
        <Modal title="Upload Drawing Baru (Vendor)" onClose={() => setVendorModal(false)}>
          <form onSubmit={handleVendorSubmit} className="space-y-4">
            <Field label="Judul / Nama Drawing" required hint="Contoh: DWG-150-001 Single Line Diagram Substation">
              <input
                className={inputCls}
                placeholder="Masukkan judul drawing..."
                value={vForm.judul}
                onChange={(e) => setVForm({ ...vForm, judul: e.target.value })}
                required
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nomor Drawing">
                <input
                  className={inputCls}
                  placeholder="DWG/2024/001"
                  value={vForm.nomor_drawing}
                  onChange={(e) => setVForm({ ...vForm, nomor_drawing: e.target.value })}
                />
              </Field>
              <Field label="Kategori Drawing">
                <select className={inputCls} value={vForm.kategori} onChange={(e) => setVForm({ ...vForm, kategori: e.target.value })}>
                  {KATEGORI_DRAWING.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Upload Dokumen Vendor (PDF / Gambar)" required hint="Format URL file / pilih berkas dari komputer">
              <input
                type="file"
                accept="application/pdf,image/*"
                className={`${inputCls} text-xs`}
                onChange={(e) => handleFileRead(setVForm, 'file_vendor', e)}
              />
              {vForm.file_vendor && (
                <div className="mt-2 text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  ✓ Dokumen siap diunggah
                </div>
              )}
            </Field>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button type="button" onClick={() => setVendorModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Batal</button>
              <button type="submit" disabled={loading} className="px-4 py-2 text-xs font-bold bg-pln-blue text-white rounded-lg hover:bg-pln-navy transition">
                {loading ? 'Menyimpan...' : 'Upload Dokumen'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal 2: Dalkon Verification (Step 3, 4, 5) */}
      {dalkonModal && (
        <Modal title={`Verifikasi Status Dalkon: ${dalkonModal.judul}`} onClose={() => setDalkonModal(null)}>
          <form onSubmit={handleDalkonSubmit} className="space-y-4">
            {/* Step 3: Hardfile Vendor */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 text-sm">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-pln-cyan rounded"
                  checked={dForm.hardfile_vendor}
                  onChange={(e) => setDForm({ ...dForm, hardfile_vendor: e.target.checked })}
                />
                3. Vendor Sudah Kirim Hardfile
              </label>
              {dForm.hardfile_vendor && (
                <div className="mt-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Terima Hardfile</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={dForm.tgl_hardfile_vendor}
                    onChange={(e) => setDForm({ ...dForm, tgl_hardfile_vendor: e.target.value })}
                  />
                </div>
              )}
            </div>

            {/* Step 4: Kons Nodin */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 text-sm">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-pln-cyan rounded"
                  checked={dForm.nodin_kons}
                  onChange={(e) => setDForm({ ...dForm, nodin_kons: e.target.checked })}
                />
                4. Konsultan (Dalkon) Sudah Terbitkan Nota Dinas (Nodin)
              </label>
              {dForm.nodin_kons && (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nomor Nota Dinas (Nodin)</label>
                    <input
                      className={inputCls}
                      placeholder="ND-000/PLN/2024"
                      value={dForm.nomor_nodin}
                      onChange={(e) => setDForm({ ...dForm, nomor_nodin: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Nodin</label>
                    <input
                      type="date"
                      className={inputCls}
                      value={dForm.tgl_nodin}
                      onChange={(e) => setDForm({ ...dForm, tgl_nodin: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Step 5: Hardfile ke Enjin */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 text-sm">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-pln-cyan rounded"
                  checked={dForm.hardfile_ke_enjin}
                  onChange={(e) => setDForm({ ...dForm, hardfile_ke_enjin: e.target.checked })}
                />
                5. Kons menyerahkan hardfile ke Engineering (Enjin)
              </label>
              {dForm.hardfile_ke_enjin && (
                <div className="mt-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Penyerahan ke Enjin</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={dForm.tgl_hardfile_ke_enjin}
                    onChange={(e) => setDForm({ ...dForm, tgl_hardfile_ke_enjin: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button type="button" onClick={() => setDalkonModal(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Batal</button>
              <button type="submit" disabled={loading} className="px-4 py-2 text-xs font-bold bg-pln-blue text-white rounded-lg hover:bg-pln-navy transition">
                {loading ? 'Menyimpan...' : 'Simpan Status Dalkon'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal 3: Enjin Approval & File Upload (Step 7 & 8) */}
      {enjinModal && (
        <Modal title={`Review & Approval Engineering: ${enjinModal.judul}`} onClose={() => setEnjinModal(null)}>
          <form onSubmit={handleEnjinSubmit} className="space-y-4">
            <Field label="Keputusan Engineering" required>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setEForm({ ...eForm, enjin_review_status: 'Approved' })}
                  className={`py-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-2 transition ${
                    eForm.enjin_review_status === 'Approved'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                      : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" /> APPROVE (Disetujui)
                </button>
                <button
                  type="button"
                  onClick={() => setEForm({ ...eForm, enjin_review_status: 'Revisi' })}
                  className={`py-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-2 transition ${
                    eForm.enjin_review_status === 'Revisi'
                      ? 'bg-red-600 text-white border-red-600 shadow-md'
                      : 'bg-white text-red-700 border-red-300 hover:bg-red-50'
                  }`}
                >
                  <XCircle className="w-4 h-4" /> REVISI (Perlu Diperbaiki)
                </button>
              </div>
            </Field>

            <Field label="Catatan / Tanggapan Engineering">
              <textarea
                rows={3}
                className={inputCls}
                placeholder="Tuliskan catatan teknis, tanggapan, atau instruksi revisi..."
                value={eForm.catatan_enjin}
                onChange={(e) => setEForm({ ...eForm, catatan_enjin: e.target.value })}
              />
            </Field>

            <Field label="8. Upload Dokumen Approval Enjin (File Hasil Stempel/Tanda Tangan Enjin)" hint="Enjin yang mengunggah dokumen hasil persetujuan/revisi">
              <input
                type="file"
                accept="application/pdf,image/*"
                className={`${inputCls} text-xs`}
                onChange={(e) => handleFileRead(setEForm, 'file_enjin', e)}
              />
              {eForm.file_enjin && (
                <div className="mt-2 text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  ✓ Dokumen approval Enjin terlampir
                </div>
              )}
            </Field>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button type="button" onClick={() => setEnjinModal(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Batal</button>
              <button type="submit" disabled={loading} className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
                {loading ? 'Proses...' : 'Simpan Keputusan Engineering'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-fade-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-pln-navy text-base">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
