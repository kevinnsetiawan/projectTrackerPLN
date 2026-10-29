import React, { useState } from 'react';
import {
  ClipboardCheck, PlusCircle, FileText, CheckCircle2, Clock, XCircle, Send,
  ShieldCheck, Eye, Pencil, Trash2, RotateCcw, HardHat,
} from 'lucide-react';
import { Card, inputCls, Field } from './ui.jsx';
import { fmtDate, fileToDataUrl } from '../utils.js';
import { getUser } from '../auth.js';
import {
  storeInstruksiKerja, updateInstruksiKerja, deleteInstruksiKerja,
  approveInstruksi, ajukanUlangInstruksi, getInstruksi,
} from '../api.js';

// Sinkron dengan server/_lib/business.js (IK_TAHAP, IK_APPROVAL_LEVELS,
// IK_INDIKATOR, IK_IZIN). Jangan mengubah urutan tahap di satu sisi saja.
const IK_TAHAP = ['Kontraktual', 'Survei & JSA', 'Pembahasan IK', 'Penjadwalan Jalur', 'Penerbitan JSA/WP/DP3', 'Pelaksanaan'];
const IK_LEVELS = [
  { level: 1, nama: 'ULTG', peran: 'dalkon' },
  { level: 2, nama: 'UPT', peran: 'enjin' },
  { level: 3, nama: 'Unit Induk', peran: 'admin' },
];
const IK_INDIKATOR = [
  { key: 'on_safety', label: 'On Safety' },
  { key: 'on_quality', label: 'On Quality' },
  { key: 'on_schedule', label: 'On Schedule' },
  { key: 'on_supervision', label: 'On Supervision' },
];
const IK_IZIN = [
  { key: 'jsa', label: 'JSA' },
  { key: 'wp', label: 'WP' },
  { key: 'dp3', label: 'DP3' },
];
const JENIS_IK = ['Instruksi Kerja', 'Surat Perintah Kerja (SPK)', 'Gambar Kerja (Shop Drawing)', 'Metode Pelaksanaan', 'JSA / WP / DP3', 'Lainnya'];
const STATUS_FILTER = ['Menunggu ULTG', 'Menunggu UPT', 'Menunggu Unit Induk', 'Approved', 'Revisi', 'Ditolak'];

const TAHAP_EMPTY = {
  judul: '', nomor_instruksi: '', jenis: 'Instruksi Kerja', file: '', keterangan: '',
  tahap: 'Pembahasan IK', tgl: new Date().toISOString().slice(0, 10),
  tgl_kontrak: '', tgl_survei: '', tgl_pembahasan: '', tgl_penjadwalan: '', tgl_izin: '',
  jsa: false, wp: false, dp3: false,
  on_safety: false, on_quality: false, on_schedule: false, on_supervision: false,
};

function statusCls(s) {
  if (s === 'Approved') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
  if (s === 'Revisi') return 'bg-amber-100 text-amber-800 border-amber-300';
  if (s === 'Ditolak') return 'bg-red-100 text-red-800 border-red-300';
  return 'bg-cyan-100 text-cyan-800 border-cyan-300';
}

function levelForRole(role) {
  const lv = IK_LEVELS.find((l) => l.peran === role);
  return lv ? lv.level : null;
}

function pendingLevel(ik) {
  const rows = [...(ik.approvals || [])].sort((a, b) => Number(a.level) - Number(b.level));
  if (!rows.length) return null;
  if (rows.some((r) => r.status === 'Ditolak' || r.status === 'Revisi')) return null;
  const row = rows.find((r) => r.status !== 'Approved');
  return row ? Number(row.level) : null;
}

export default function InstruksiKerjaList({ projectId, items = [], onRefresh }) {
  const me = getUser();
  const role = me && me.role;
  const canSubmit = ['vendor', 'dalkon', 'admin'].includes(role);

  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTahap, setFilterTahap] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(TAHAP_EMPTY);
  const [approveTarget, setApproveTarget] = useState(null); // { ik, level }
  const [approveForm, setApproveForm] = useState({ keputusan: 'Approved', catatan: '', file: '' });
  const [openId, setOpenId] = useState(null);
  const [details, setDetails] = useState({});
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  function notify(text) {
    setMsg(text);
    setTimeout(() => setMsg(null), 3500);
  }

  function openAdd() {
    if (!projectId) return;
    setEditId(null);
    setForm(TAHAP_EMPTY);
    setFormOpen(true);
  }

  function openEdit(ik) {
    setEditId(ik.id);
    setForm({
      judul: ik.judul || '', nomor_instruksi: ik.nomor_instruksi || '', jenis: ik.jenis || 'Instruksi Kerja',
      file: ik.file || '', keterangan: ik.keterangan || '', tahap: ik.tahap || 'Pembahasan IK',
      tgl: (ik.tgl || '').slice(0, 10),
      tgl_kontrak: (ik.tgl_kontrak || '').slice(0, 10),
      tgl_survei: (ik.tgl_survei || '').slice(0, 10),
      tgl_pembahasan: (ik.tgl_pembahasan || '').slice(0, 10),
      tgl_penjadwalan: (ik.tgl_penjadwalan || '').slice(0, 10),
      tgl_izin: (ik.tgl_izin || '').slice(0, 10),
      jsa: Boolean(ik.jsa), wp: Boolean(ik.wp), dp3: Boolean(ik.dp3),
      on_safety: Boolean(ik.on_safety), on_quality: Boolean(ik.on_quality),
      on_schedule: Boolean(ik.on_schedule), on_supervision: Boolean(ik.on_supervision),
    });
    setFormOpen(true);
  }

  async function submitForm(e) {
    e.preventDefault();
    if (!form.judul.trim()) return alert('Judul instruksi wajib diisi');
    if (!editId && !form.file) return alert('File instruksi kerja wajib diunggah');
    setLoading(true);
    try {
      if (editId) {
        await updateInstruksiKerja(editId, form);
        notify('Instruksi kerja diperbarui.');
      } else {
        await storeInstruksiKerja(projectId, form);
        notify('IK diajukan — menunggu approval ULTG.');
      }
      setFormOpen(false);
      setDetails({});
      if (onRefresh) onRefresh();
    } catch (er) {
      alert(er.message);
    } finally {
      setLoading(false);
    }
  }

  function openApprove(ik, level) {
    setApproveTarget({ ik, level });
    setApproveForm({ keputusan: 'Approved', catatan: '', file: '' });
  }

  async function submitApprove(e) {
    e.preventDefault();
    if (!approveTarget) return;
    setLoading(true);
    try {
      await approveInstruksi(approveTarget.ik.id, { ...approveForm, level: approveTarget.level });
      notify(`Keputusan ${approveForm.keputusan} tersimpan untuk jenjang ${labelLevel(approveTarget.level)}.`);
      setApproveTarget(null);
      setDetails({});
      if (onRefresh) onRefresh();
    } catch (er) {
      alert(er.message);
    } finally {
      setLoading(false);
    }
  }

  async function resubmit(ik) {
    if (!confirm('Ajukan ulang IK ini? Alur approval akan dimulai lagi dari jenjang ULTG.')) return;
    try {
      await ajukanUlangInstruksi(ik.id);
      notify('IK diajukan ulang — menunggu approval ULTG.');
      setDetails({});
      if (onRefresh) onRefresh();
    } catch (er) { alert(er.message); }
  }

  async function remove(ik) {
    if (!confirm(`Hapus instruksi kerja "${ik.judul}"?`)) return;
    try {
      await deleteInstruksiKerja(ik.id);
      notify('Instruksi kerja dihapus.');
      setDetails({});
      if (onRefresh) onRefresh();
    } catch (er) { alert(er.message); }
  }

  async function toggleDetail(ik) {
    if (openId === ik.id) {
      setOpenId(null);
      return;
    }
    setOpenId(ik.id);
    if (!details[ik.id]) {
      try {
        const full = await getInstruksi(ik.id);
        setDetails((prev) => ({ ...prev, [ik.id]: full }));
      } catch {
        /* detail opsional — kartu tetap memakai data daftar */
      }
    }
  }

  async function readFile(setFn, key, e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setFn((prev) => ({ ...prev, [key]: dataUrl }));
    } catch (er) { alert(er.message); }
    e.target.value = '';
  }

  const filtered = items.filter((ik) => {
    if (filterStatus !== 'all' && ik.status_approval !== filterStatus) return false;
    if (filterTahap !== 'all' && ik.tahap !== filterTahap) return false;
    return true;
  });

  const myLevel = levelForRole(role);

  return (
    <div className="space-y-5">
      {msg && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">{msg}</div>}

      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <h3 className="font-bold text-pln-navy text-base flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-pln-cyan" /> Approval Instruksi Kerja ({items.length})
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Alur pekerjaan eksternal: pengajuan Vendor &rarr; approval berjenjang ULTG &rarr; UPT &rarr; Unit Induk
          </p>
        </div>
        {canSubmit && projectId && (
          <button onClick={openAdd} className="inline-flex items-center gap-2 bg-pln-gradient text-white text-xs font-bold px-4 py-2 rounded-lg shadow-pln-cta hover:shadow-pln transition">
            <PlusCircle className="w-4 h-4" /> Ajukan IK Baru
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
        <select className={`${inputCls} max-w-xs text-xs`} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">Semua Status Approval</option>
          {STATUS_FILTER.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={`${inputCls} max-w-xs text-xs`} value={filterTahap} onChange={(e) => setFilterTahap(e.target.value)}>
          <option value="all">Semua Tahap Pekerjaan</option>
          {IK_TAHAP.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-slate-400">
          <ClipboardCheck className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium">Belum ada Instruksi Kerja.</p>
          <p className="text-xs text-slate-400 mt-1">Vendor mengajukan IK untuk diproses approval berjenjang.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((ik) => {
            const approvals = [...(ik.approvals || [])].sort((a, b) => Number(a.level) - Number(b.level));
            const pending = pendingLevel(ik);
            const canActHere = pending !== null
              && (role === 'admin' || (myLevel !== null && myLevel === pending));
            const canResubmit = canSubmit && ['Revisi', 'Ditolak'].includes(ik.status_approval);
            const canModify = canSubmit && (role === 'admin' || ['Menunggu ULTG', 'Revisi', 'Ditolak'].includes(ik.status_approval));
            const tahapIdx = IK_TAHAP.indexOf(ik.tahap);
            const expanded = openId === ik.id;
            const full = details[ik.id] || ik;

            return (
              <Card key={ik.id} className="p-5 border border-slate-200 hover:shadow-md transition">
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold bg-slate-100 text-pln-blue px-2 py-0.5 rounded">
                        {ik.nomor_instruksi || 'NO-REG'}
                      </span>
                      <span className="text-xs bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded font-semibold">{ik.jenis || 'Instruksi Kerja'}</span>
                      {ik.project_kode && <span className="text-2xs text-slate-500">{ik.project_kode} — {ik.project_nama}</span>}
                    </div>
                    <h4 className="font-bold text-pln-navy text-base">{ik.judul}</h4>
                    <div className="text-2xs text-slate-500 mt-0.5">
                      Diajukan {fmtDate(ik.tgl)}{ik.putaran > 1 ? ` • putaran approval ke-${ik.putaran}` : ''}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${statusCls(ik.status_approval)}`}>
                      {ik.status_approval === 'Approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {['Revisi', 'Ditolak'].includes(ik.status_approval) && <XCircle className="w-3.5 h-3.5" />}
                      {!['Approved', 'Revisi', 'Ditolak'].includes(ik.status_approval) && <Clock className="w-3.5 h-3.5" />}
                      {ik.status_approval}
                    </span>
                    {canActHere && (
                      <button
                        onClick={() => openApprove(ik, pending)}
                        className="text-xs font-bold text-emerald-700 border border-emerald-300 rounded-lg px-2.5 py-1.5 hover:bg-emerald-50 transition"
                      >
                        <ShieldCheck className="inline w-3.5 h-3.5 mr-1" /> Review {labelLevel(pending)}
                      </button>
                    )}
                    {canResubmit && (
                      <button onClick={() => resubmit(ik)} className="text-xs font-bold text-amber-700 border border-amber-300 rounded-lg px-2.5 py-1.5 hover:bg-amber-50 transition">
                        <RotateCcw className="inline w-3.5 h-3.5 mr-1" /> Ajukan Ulang
                      </button>
                    )}
                  </div>
                </div>

                {/* Tahapan alur pekerjaan eksternal */}
                <div className="mt-4">
                  <div className="text-3xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Tahapan Alur Pekerjaan Eksternal</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center">
                    {IK_TAHAP.map((t, i) => {
                      const done = tahapIdx >= 0 && i < tahapIdx;
                      const current = i === tahapIdx;
                      return (
                        <div key={t} className={`p-2 rounded-lg border ${current ? 'bg-cyan-50 border-cyan-300' : done ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                          <div className={`text-3xs font-bold ${current ? 'text-cyan-800' : done ? 'text-emerald-700' : 'text-slate-400'}`}>{i + 1}. {t}</div>
                          <div className={`text-3xs mt-0.5 ${current ? 'text-cyan-700 font-bold' : done ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {current ? '● Tahap aktif' : done ? '✓ Selesai' : 'Menunggu'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-2xs">
                    {[
                      ['Kontraktual', ik.tgl_kontrak],
                      ['Survei & JSA', ik.tgl_survei],
                      ['Pembahasan IK', ik.tgl_pembahasan],
                      ['Penjadwalan Jalur', ik.tgl_penjadwalan],
                      ['Penerbitan Izin', ik.tgl_izin],
                    ].filter(([, d]) => d).map(([label, d]) => (
                      <div key={label} className="text-slate-500"><span className="font-semibold text-slate-600">{label}:</span> {fmtDate(d)}</div>
                    ))}
                  </div>
                </div>

                {/* Perizinan & indikator pelaksanaan */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-3xs font-extrabold text-slate-500 uppercase tracking-wider">Perizinan:</span>
                  {IK_IZIN.map((z) => (
                    <span key={z.key} className={`inline-flex items-center gap-1 text-2xs font-bold px-2 py-0.5 rounded border ${ik[z.key] ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                      {ik[z.key] ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} {z.label}
                    </span>
                  ))}
                  {IK_INDIKATOR.map((ind) => (
                    <span key={ind.key} className={`inline-flex items-center gap-1 text-2xs font-bold px-2 py-0.5 rounded border ${ik[ind.key] ? 'bg-pln-lightcyan text-pln-blue border-pln-cyan/40' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                      <HardHat className="w-3 h-3" /> {ind.label}
                    </span>
                  ))}
                </div>

                {/* Rantai approval berjenjang */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="text-3xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Approval Berjenjang</div>
                  {approvals.length === 0 ? (
                    <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> IK lama — dianggap sudah approved sebelum alur berjenjang diterapkan.
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-3 gap-2">
                      {approvals.map((row) => {
                        const isPending = row.status === 'Pending';
                        const isApproved = row.status === 'Approved';
                        const isRejected = row.status === 'Revisi' || row.status === 'Ditolak';
                        return (
                          <div key={row.id} className={`p-2.5 rounded-lg border ${isApproved ? 'bg-emerald-50/70 border-emerald-200' : isRejected ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-xs font-bold text-slate-700">{row.level_nama}</div>
                              <span className={`text-3xs font-bold px-1.5 py-0.5 rounded ${isApproved ? 'bg-emerald-200 text-emerald-800' : isRejected ? 'bg-red-200 text-red-800' : 'bg-slate-200 text-slate-600'}`}>
                                {row.status}
                              </span>
                            </div>
                            <div className="text-2xs text-slate-500 mt-1">{row.approver || 'Belum diputuskan'}</div>
                            <div className="text-3xs text-slate-400">{row.tgl ? fmtDate(row.tgl) : '-'}</div>
                            {row.catatan && <div className="text-2xs text-slate-600 mt-1 whitespace-pre-wrap line-clamp-3">{row.catatan}</div>}
                            {row.file && (
                              <a href={row.file} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-3xs font-bold text-pln-cyan hover:underline mt-1">
                                <Eye className="w-3 h-3" /> Dokumen keputusan
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {ik.keterangan && (
                  <div className="mt-3 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2.5">{ik.keterangan}</div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <a href={ik.file} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-pln-cyan border border-pln-cyan/40 rounded-lg px-3 py-1.5 hover:bg-pln-cyan hover:text-pln-navy transition">
                    <FileText className="w-3.5 h-3.5" /> Buka File IK
                  </a>
                  <button onClick={() => toggleDetail(ik)} className="text-xs font-bold text-slate-600 border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-100 transition">
                    {expanded ? 'Sembunyikan Detail' : 'Detail & Riwayat'}
                  </button>
                  {canModify && (
                    <button onClick={() => openEdit(ik)} className="text-xs font-bold text-pln-blue border border-pln-blue/30 rounded-lg px-3 py-1.5 hover:bg-pln-lightcyan transition">
                      <Pencil className="inline w-3.5 h-3.5 mr-1" /> Edit
                    </button>
                  )}
                  {canModify && (
                    <button onClick={() => remove(ik)} className="text-xs font-bold text-red-500 border border-red-300 rounded-lg px-3 py-1.5 hover:bg-red-500 hover:text-white transition">
                      <Trash2 className="inline w-3.5 h-3.5 mr-1" /> Hapus
                    </button>
                  )}
                </div>

                {expanded && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <div className="text-3xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Riwayat Keputusan (semua putaran)</div>
                    {(ik.riwayat || full.riwayat || approvals).length === 0 ? (
                      <div className="text-xs text-slate-400">Belum ada riwayat approval.</div>
                    ) : (
                      <ul className="space-y-1.5">
                        {[...(ik.riwayat || full.riwayat || approvals)].map((r) => (
                          <li key={`${r.id}-${r.putaran}-${r.level}`} className="text-2xs text-slate-600 flex flex-wrap gap-x-2">
                            <span className="font-bold text-slate-500">Putaran {r.putaran}</span>
                            <span className="font-semibold">{r.level_nama}</span>
                            <span className={r.status === 'Approved' ? 'text-emerald-700 font-bold' : r.status === 'Pending' ? 'text-slate-400' : 'text-red-600 font-bold'}>{r.status}</span>
                            <span>{r.approver || '-'}</span>
                            <span className="text-slate-400">{r.tgl ? fmtDate(r.tgl) : '-'}</span>
                            {r.catatan && <span className="italic">“{r.catatan}”</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {formOpen && (
        <Modal title={editId ? 'Edit Instruksi Kerja' : 'Ajukan Instruksi Kerja Baru'} onClose={() => setFormOpen(false)}>
          <form onSubmit={submitForm} className="space-y-3">
            <Field label="Judul Instruksi" required>
              <input className={inputCls} value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} placeholder="cth: IK Pekerjaan Eksternal Bay Line 150 kV" required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nomor Instruksi / SPK">
                <input className={inputCls} value={form.nomor_instruksi} onChange={(e) => setForm({ ...form, nomor_instruksi: e.target.value })} placeholder="cth: IK/2026/UIP-JBB/001" />
              </Field>
              <Field label="Jenis">
                <select className={inputCls} value={form.jenis} onChange={(e) => setForm({ ...form, jenis: e.target.value })}>
                  {JENIS_IK.map((j) => <option key={j} value={j}>{j}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Tahap Pekerjaan Eksternal">
              <select className={inputCls} value={form.tahap} onChange={(e) => setForm({ ...form, tahap: e.target.value })}>
                {IK_TAHAP.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <details className="border border-slate-200 rounded-lg p-3">
              <summary className="text-xs font-bold text-slate-600 cursor-pointer">Tanggal tiap tahap (opsional)</summary>
              <div className="grid grid-cols-2 gap-3 mt-3">
                {[
                  ['tgl_kontrak', 'Kontraktual'],
                  ['tgl_survei', 'Survei & JSA'],
                  ['tgl_pembahasan', 'Pembahasan IK'],
                  ['tgl_penjadwalan', 'Penjadwalan Jalur'],
                  ['tgl_izin', 'Penerbitan Izin'],
                ].map(([key, label]) => (
                  <Field key={key} label={label}>
                    <input type="date" className={inputCls} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                  </Field>
                ))}
              </div>
            </details>
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-slate-200 rounded-lg p-3">
                <div className="text-xs font-bold text-slate-600 mb-2">Perizinan Terbit</div>
                {IK_IZIN.map((z) => (
                  <label key={z.key} className="flex items-center gap-2 text-xs text-slate-700 mb-1 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded text-pln-cyan" checked={Boolean(form[z.key])} onChange={(e) => setForm({ ...form, [z.key]: e.target.checked })} />
                    {z.label}
                  </label>
                ))}
              </div>
              <div className="border border-slate-200 rounded-lg p-3">
                <div className="text-xs font-bold text-slate-600 mb-2">Indikator Pelaksanaan</div>
                {IK_INDIKATOR.map((ind) => (
                  <label key={ind.key} className="flex items-center gap-2 text-xs text-slate-700 mb-1 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded text-pln-cyan" checked={Boolean(form[ind.key])} onChange={(e) => setForm({ ...form, [ind.key]: e.target.checked })} />
                    {ind.label}
                  </label>
                ))}
              </div>
            </div>
            <Field label="File Instruksi" required={!editId} hint="PDF / gambar. Untuk edit, kosongkan bila tidak ingin mengganti file.">
              <input type="file" accept="application/pdf,image/*" className={`${inputCls} text-xs`} onChange={(e) => readFile(setForm, 'file', e)} />
              {form.file && <div className="mt-1.5 text-2xs text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> File siap diunggah</div>}
            </Field>
            <Field label="Keterangan">
              <textarea className={inputCls} rows={2} value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button type="button" onClick={() => setFormOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Batal</button>
              <button type="submit" disabled={loading} className="btn btn-primary btn-sm">
                {loading ? 'Menyimpan...' : (editId ? 'Simpan Perubahan' : 'Ajukan IK')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {approveTarget && (
        <Modal title={`Keputusan ${labelLevel(approveTarget.level)}: ${approveTarget.ik.judul}`} onClose={() => setApproveTarget(null)}>
          <form onSubmit={submitApprove} className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-2xs text-slate-600">
              Alur: pengajuan Vendor &rarr; ULTG &rarr; UPT &rarr; Unit Induk. Keputusan jenjang sebelumnya harus Approved sebelum jenjang ini dapat diputuskan.
            </div>
            <Field label="Keputusan" required>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['Approved', 'Approve', 'bg-emerald-600 border-emerald-600'],
                  ['Revisi', 'Revisi', 'bg-amber-500 border-amber-500'],
                  ['Ditolak', 'Tolak', 'bg-red-600 border-red-600'],
                ].map(([val, label, activeCls]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setApproveForm({ ...approveForm, keputusan: val })}
                    className={`py-2.5 text-xs font-bold rounded-lg border transition ${approveForm.keputusan === val ? `${activeCls} text-white shadow` : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Catatan / Tanggapan">
              <textarea rows={3} className={inputCls} placeholder="Catatan teknis, alasan revisi, atau instruksi perbaikan..." value={approveForm.catatan} onChange={(e) => setApproveForm({ ...approveForm, catatan: e.target.value })} />
            </Field>
            <Field label="Dokumen Keputusan (opsional)">
              <input type="file" accept="application/pdf,image/*" className={`${inputCls} text-xs`} onChange={(e) => readFile(setApproveForm, 'file', e)} />
              {approveForm.file && <div className="mt-1.5 text-2xs text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Dokumen terlampir</div>}
            </Field>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button type="button" onClick={() => setApproveTarget(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Batal</button>
              <button type="submit" disabled={loading} className="btn btn-emerald btn-sm">
                {loading ? 'Memproses...' : <><Send className="w-3.5 h-3.5" /> Simpan Keputusan</>}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function labelLevel(level) {
  const lv = IK_LEVELS.find((l) => l.level === Number(level));
  return lv ? lv.nama : `Level ${level}`;
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl animate-fade-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-pln-navy text-base pr-4">{title}</h3>
          <button onClick={onClose} aria-label="Tutup" className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
