import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Plus, Save, Trash2, X } from 'lucide-react';
import { getMeta, getProject, createProject, updateProject, deleteProject } from '../api.js';
import { setPageTitle } from '../components/Layout.jsx';
import { Card, Field, inputCls, Spinner, StatusBadge } from '../components/ui.jsx';
import { isoDate, deriveKategori, buildMonthlyBaseline } from '../utils.js';

const TEGANGAN = ['500 kV', '275 kV', '150 kV', '70 kV', '20 kV'];

function monthKeyAt(startIso, offset) {
  const d = new Date(`${startIso}T00:00:00`);
  if (!startIso || isNaN(d.getTime())) return '';
  const m = new Date(d.getFullYear(), d.getMonth() + Number(offset || 0), 1);
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
}

const EMPTY = {
  kode: '', nama: '', tipe: 'Gardu Induk (GI)', tegangan: '150 kV',
  uip: '', upp: '',
  lokasis: [{ nama: '', latitude: '', longitude: '' }],
  kontraktor: '', nomor_kontrak: '', tgl_kontrak: '', nomor_spmk: '', nilai_kontrak: '', penyerapan_anggaran: '',
  tgl_mulai: '', target_cod: '', progres_rencana: '', progres_realisasi: '',
  tgl_selesai_garansi: '', barang_dicek: false,
  deskripsi: '', organisasi: '',
  termins: [
    { nama: 'Termin I', progres_fisik: '' },
    { nama: 'Termin II', progres_fisik: '' },
    { nama: 'Termin III', progres_fisik: '' },
    { nama: 'Termin IV', progres_fisik: '' },
  ],
};

function Section({ num, title, children }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span className="w-7 h-7 rounded-full bg-pln-blue text-white text-xs font-bold flex items-center justify-center">{num}</span>
        <h3 className="font-bold text-pln-navy">{title}</h3>
      </div>
      <div className="grid md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

export default function ProjectForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [meta, setMeta] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [baseline, setBaseline] = useState(null);
  const [baselineEdited, setBaselineEdited] = useState(false);

  useEffect(() => {
    setPageTitle(isEdit ? 'Ubah Proyek' : 'Pendaftaran Proyek Baru');
    getMeta().then(setMeta);
    if (isEdit) {
      getProject(id).then((p) => {
        setForm({
          kode: p.kode, nama: p.nama, tipe: p.tipe, tegangan: p.tegangan, uip: p.uip, upp: p.upp || '',
          lokasis: p.lokasis && p.lokasis.length
            ? p.lokasis.map((l) => ({ nama: l.nama || '', latitude: l.latitude ?? '', longitude: l.longitude ?? '' }))
            : [{ nama: p.lokasi || p.kode || '', latitude: p.latitude ?? '', longitude: p.longitude ?? '' }],
          kontraktor: p.kontraktor, nomor_kontrak: p.nomor_kontrak || '', tgl_kontrak: isoDate(p.tgl_kontrak) || '',
          nomor_spmk: p.nomor_spmk || '', nilai_kontrak: p.nilai_kontrak,
          penyerapan_anggaran: p.penyerapan_anggaran, tgl_mulai: isoDate(p.tgl_mulai) || '',
          target_cod: isoDate(p.target_cod) || '', progres_rencana: p.progres_rencana,
          progres_realisasi: p.progres_realisasi, tgl_selesai_garansi: isoDate(p.tgl_selesai_garansi) || '',
          barang_dicek: Boolean(p.barang_dicek), deskripsi: p.deskripsi || '', organisasi: p.organisasi || '',
          termins: (p.terminBayars || []).map((t) => ({ nama: t.nama || '', progres_fisik: t.progres_fisik ?? '' })),
        });
        const sc = p.scurves || [];
        if (sc.length) {
          setBaseline(sc.map((s, i) => ({
            bulan: s.bulan || monthKeyAt(p.tgl_mulai, i),
            minggu: s.minggu || `B-${i + 1}`,
            rencana: Number(s.rencana) || 0,
          })));
          setBaselineEdited(true);
        }
        setLoading(false);
      });
    }
  }, [id]);

  useEffect(() => {
    if (!baselineEdited && form.tgl_mulai && form.target_cod && String(form.progres_rencana) !== '') {
      setBaseline(buildMonthlyBaseline(form.tgl_mulai, form.target_cod, form.progres_rencana, form.progres_realisasi));
    }
  }, [form.tgl_mulai, form.target_cod, form.progres_rencana, form.progres_realisasi, baselineEdited]);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function addLokasi() { setForm((f) => ({ ...f, lokasis: [...f.lokasis, { nama: '', latitude: '', longitude: '' }] })); }

  function setLokasi(idx, k, v) {
    setForm((f) => ({ ...f, lokasis: f.lokasis.map((s, i) => (i === idx ? { ...s, [k]: v } : s)) }));
  }

  function removeLokasi(idx) {
    setForm((f) => ({ ...f, lokasis: f.lokasis.filter((_, i) => i !== idx) }));
  }

  function setTermin(idx, k, v) {
    setForm((f) => ({ ...f, termins: f.termins.map((t, i) => (i === idx ? { ...t, [k]: v } : t)) }));
  }

  function addTermin() {
    setForm((f) => ({ ...f, termins: [...f.termins, { nama: `Termin ${f.termins.length + 1}`, progres_fisik: '' }] }));
  }

  function removeTermin(idx) {
    setForm((f) => ({ ...f, termins: f.termins.filter((_, i) => i !== idx) }));
  }

  function setBaselineRencana(idx, v) {
    setBaselineEdited(true);
    setBaseline((b) => (b || []).map((row, i) => (i === idx ? { ...row, rencana: Number(v) || 0 } : row)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { lokasi, latitude, longitude, ...rest } = form;
      const payload = {
        ...rest,
        nilai_kontrak: Number(form.nilai_kontrak || 0),
        tgl_selesai_garansi: form.tgl_selesai_garansi || null,
        baseline_per_bulan: (baseline || []).map((b) => ({ bulan: b.bulan, rencana: Number(b.rencana) || 0 })),
        termins: form.termins
          .filter((t) => String(t.nama || '').trim())
          .map((t) => ({
            nama: String(t.nama || '').trim(),
            progres_fisik: t.progres_fisik === '' ? null : Number(t.progres_fisik),
          })),
        lokasis: form.lokasis
          .filter((s) => String(s.nama || '').trim())
          .map((s) => ({
            nama: String(s.nama || '').trim(),
            latitude: s.latitude === '' ? null : Number(s.latitude),
            longitude: s.longitude === '' ? null : Number(s.longitude),
          })),
      };
      if (isEdit) {
        await updateProject(id, payload);
        navigate(`/projects/${id}`);
      } else {
        const created = await createProject(payload);
        navigate(`/projects/${created.id}`);
      }
    } catch (er) {
      alert(er.message);
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Yakin menghapus proyek ini? Semua data terkait akan ikut terhapus.')) return;
    try {
      await deleteProject(id);
      navigate('/projects');
    } catch (er) { alert(er.message); }
  }

  if (!meta) return <Spinner show />;
  if (loading) return <Spinner show />;

  const preview = deriveKategori(form.progres_realisasi, form.tgl_selesai_garansi, form.barang_dicek);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-pln-blue hover:underline">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-5">
          <Card className="p-5">
            <Section num={1} title="Identitas &amp; Klasifikasi Proyek">
              <Field label="Kode Proyek" required>
                <input className={inputCls} value={form.kode} onChange={(e) => set('kode', e.target.value)} placeholder="GI-150-SRP" />
              </Field>
              <Field label="Nama Proyek" required>
                <input className={inputCls} value={form.nama} onChange={(e) => set('nama', e.target.value)} />
              </Field>
              <Field label="Tipe Pekerjaan" required>
                <select className={inputCls} value={form.tipe} onChange={(e) => set('tipe', e.target.value)}>
                  {meta.allTipe.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Level Tegangan">
                <select className={inputCls} value={form.tegangan} onChange={(e) => set('tegangan', e.target.value)}>
                  {TEGANGAN.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </Section>
          </Card>

          <Card className="p-5">
            <Section num={2} title="Unit Pengelola &amp; Lokasi Lapangan">
              <Field label="Unit Induk (UIP)" required>
                <select className={inputCls} value={form.uip} onChange={(e) => set('uip', e.target.value)}>
                  <option value="">Pilih UIP</option>
                  {meta.allUip.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>
              <Field label="Unit Pelaksana (UPP)">
                <input className={inputCls} value={form.upp} onChange={(e) => set('upp', e.target.value)} />
              </Field>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Lokasi / Titik Pelaksanaan <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-slate-400 mb-2 -mt-1">Satu proyek bisa memiliki lebih dari satu lokasi (mis. beberapa lokasi tower/gardu).</p>
                <div className="space-y-3">
                  {form.lokasis.map((s, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-pln-blue shrink-0" />
                        <span className="text-xs font-bold text-slate-600">Titik #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeLokasi(idx)}
                          disabled={form.lokasis.length === 1}
                          className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-600 disabled:opacity-30"
                        >
                          <X className="w-3.5 h-3.5" /> Hapus
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          className={inputCls}
                          placeholder="Nama lokasi / site (mis. GI Karawang)"
                          value={s.nama}
                          onChange={(e) => setLokasi(idx, 'nama', e.target.value)}
                        />
                        <input
                          className={inputCls}
                          placeholder="Latitude"
                          value={s.latitude}
                          onChange={(e) => setLokasi(idx, 'latitude', e.target.value)}
                        />
                        <input
                          className={inputCls}
                          placeholder="Longitude"
                          value={s.longitude}
                          onChange={(e) => setLokasi(idx, 'longitude', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addLokasi}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-pln-blue hover:underline"
                >
                  <Plus className="w-4 h-4" /> Tambah Lokasi
                </button>
              </div>
            </Section>
          </Card>

          <Card className="p-5">
            <Section num={3} title="Kontrak, Finansial &amp; Serah Terima">
              <Field label="Kontraktor" required>
                <input className={inputCls} value={form.kontraktor} onChange={(e) => set('kontraktor', e.target.value)} />
              </Field>
              <Field label="Nomor Kontrak">
                <input className={inputCls} value={form.nomor_kontrak} onChange={(e) => set('nomor_kontrak', e.target.value)} />
              </Field>
              <Field label="Tanggal Kontrak (Tanda Tangan)" hint="Perpanjangan sisa waktu kontrak dihitung dari Tanggal Mulai Kerja (SPMK).">
                <input className={inputCls} type="date" value={form.tgl_kontrak} onChange={(e) => set('tgl_kontrak', e.target.value)} />
              </Field>
              <Field label="Nomor SPMK">
                <input className={inputCls} value={form.nomor_spmk} onChange={(e) => set('nomor_spmk', e.target.value)} placeholder="cth: SPMK/171.PJ/2023" />
              </Field>
              <Field label="Nilai Kontrak (Rp)">
                <input className={inputCls} type="number" min="0" value={form.nilai_kontrak} onChange={(e) => set('nilai_kontrak', e.target.value)} />
              </Field>
              <Field label="Penyerapan Anggaran (%)">
                <input className={inputCls} type="number" min="0" max="100" value={form.penyerapan_anggaran} onChange={(e) => set('penyerapan_anggaran', e.target.value)} />
              </Field>
              <Field label="Tanggal Mulai Kerja (SPMK)">
                <input className={inputCls} type="date" value={form.tgl_mulai} onChange={(e) => set('tgl_mulai', e.target.value)} />
              </Field>
              <Field label="Target COD">
                <input className={inputCls} type="date" value={form.target_cod} onChange={(e) => set('target_cod', e.target.value)} />
              </Field>
              <Field label="Akhir Masa Garansi (untuk BAST 2)">
                <input className={inputCls} type="date" value={form.tgl_selesai_garansi} onChange={(e) => set('tgl_selesai_garansi', e.target.value)} />
              </Field>
              <div />
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-600 block mb-1.5">Kategori Pekerjaan (hitung otomatis)</label>
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 flex-wrap">
                  <StatusBadge status={preview} className="text-xs px-3 py-1" />
                  <span className="text-[11px] text-slate-500">
                    100% = BAST 1 | 100% + garansi lewat = BAST 2 | barang dicek = BASTB | lainnya = In Progress
                  </span>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.barang_dicek}
                    onChange={(e) => set('barang_dicek', e.target.checked)}
                    className="rounded border-slate-300 text-pln-blue focus:ring-pln-cyan"
                  />
                  Barang sudah melalui checking (BASTB)
                </label>
              </div>
            </Section>
          </Card>

          <Card className="p-5">
            <Section num={4} title="Baseline Progres">
              <Field label="Progres Rencana (%)" hint="Kurva S & milestones default otomatis dibuat saat proyek baru. Rincian rencana per bulan (sesuai Tanggal Mulai → Target COD) tampil di bawah dan bisa disesuaikan.">
                <input className={inputCls} type="number" min="0" max="100" value={form.progres_rencana} onChange={(e) => set('progres_rencana', e.target.value)} />
              </Field>
              <Field label="Progres Realisasi (%)">
                <input className={inputCls} type="number" min="0" max="100" value={form.progres_realisasi} onChange={(e) => set('progres_realisasi', e.target.value)} />
              </Field>
              {baseline && baseline.length > 0 && (
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                    <label className="block text-sm font-medium text-slate-700">Rincian Baseline per Bulan (Kurva S)</label>
                    <button
                      type="button"
                      onClick={() => setBaselineEdited(false)}
                      className="text-[11px] font-semibold text-pln-blue hover:underline"
                    >
                      Regenerasi dari tanggal &amp; progres rencana
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mb-2 -mt-1">
                    Daftar rencana bulanan dibangkitkan dari Tanggal Mulai → Target COD ({baseline.length} bulan), naik monoton dan 100% di COD.
                    Anda dapat menyesuaikannya; nilai tiap baris tidak akan pernah turun dari bulan sebelumnya saat disimpan.
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100 text-left text-xs uppercase tracking-wider text-slate-600">
                        <tr>
                          <th className="px-3 py-2 text-center">No</th>
                          <th className="px-3 py-2">Bulan</th>
                          <th className="px-3 py-2 w-28">Rencana (%)</th>
                          <th className="px-3 py-2 w-8" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {baseline.map((row, i) => {
                          const nonMono = i > 0 && Number(row.rencana) < Number(baseline[i - 1].rencana);
                          return (
                            <tr key={row.bulan || i} className="hover:bg-slate-50">
                              <td className="px-3 py-1.5 text-center text-slate-500">{i + 1}</td>
                              <td className="px-3 py-1.5 text-slate-700">{row.minggu || row.bulan}</td>
                              <td className="px-3 py-1.5">
                                <input
                                  className="w-full border border-slate-300 rounded-md px-2 py-1 text-sm"
                                  type="number" min="0" max="100" step="0.1"
                                  value={row.rencana}
                                  onChange={(e) => setBaselineRencana(i, e.target.value)}
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                {nonMono && (
                                  <span className="block text-[10px] font-bold text-amber-600 whitespace-nowrap" title="Akan otomatis dikunci agar tidak turun dari bulan sebelumnya">Kunci ↑</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <div className="md:col-span-2">
                <Field label="Deskripsi">
                  <textarea className={inputCls} rows={3} value={form.deskripsi} onChange={(e) => set('deskripsi', e.target.value)} />
                </Field>
              </div>
            </Section>
          </Card>

          <Card className="p-5">
            <Section num={5} title="Organisasi Proyek &amp; Rencana Pembayaran">
              <div className="md:col-span-2">
                <Field label="Organisasi Proyek" hint="Struktur tim pelaksana / PIC (mis. Project Manager, Supervisor, Engineer, PIC Dalkon).">
                  <textarea className={inputCls} rows={3} value={form.organisasi} onChange={(e) => set('organisasi', e.target.value)} placeholder="cth: PM: Budi (Kontraktor)&#10;Site Engineer: Andi&#10;Pengawas UIP: ..." />
                </Field>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Rencana Pembayaran (Termin)</label>
                <p className="text-xs text-slate-400 mb-2 -mt-1">
                  Nominal tiap termin dihitung otomatis = <b>progres fisik (%) &times; 95% &times; nilai kontrak</b>; 5% sisanya ditahan sebagai retensi pemeliharaan hingga BAST 2.
                  Akumulasi progres bayar tidak boleh melebihi progres fisik proyek.
                </p>
                <div className="space-y-3">
                  {form.termins.map((t, idx) => {
                    const fisik = Number(t.progres_fisik || 0);
                    const nilai = Number(form.nilai_kontrak || 0);
                    const isRetensi = /retensi/i.test(t.nama);
                    const nominal = isRetensi ? Math.round(nilai * 0.05) : Math.round(nilai * 0.95 * (fisik > 0 ? fisik : 0) / 100);
                    return (
                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_160px_auto] gap-2 items-center">
                          <input
                            className={inputCls}
                            placeholder={`Termin ${idx + 1}`}
                            value={t.nama}
                            onChange={(e) => setTermin(idx, 'nama', e.target.value)}
                          />
                          <input
                            className={inputCls}
                            placeholder="Progres fisik (%)"
                            type="number" min="0" max="100"
                            value={t.progres_fisik}
                            onChange={(e) => setTermin(idx, 'progres_fisik', e.target.value)}
                          />
                          <div className="text-xs text-slate-500 truncate">
                            {isRetensi ? <span className="font-bold text-emerald-700">Retensi 5% &bull; {nominal.toLocaleString('id-ID')}</span> : (
                              fisik > 0 ? <span>Nominal: <b className="text-slate-700">{(nominal || 0).toLocaleString('id-ID')}</b></span> : <span className="text-slate-400">Nominal dihitung otomatis</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeTermin(idx)}
                            disabled={form.termins.length === 1}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-600 disabled:opacity-30"
                          >
                            <X className="w-3.5 h-3.5" /> Hapus
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={addTermin}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-pln-blue hover:underline"
                >
                  <Plus className="w-4 h-4" /> Tambah Termin
                </button>
              </div>
            </Section>
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-6">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 bg-pln-gradient text-white px-5 sm:px-6 py-2.5 rounded-lg font-bold shadow-pln-cta hover:shadow-pln transition">
            <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : (isEdit ? 'Simpan Perubahan' : 'Simpan Proyek')}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="px-5 sm:px-6 py-2.5 rounded-lg border border-slate-300 text-slate-600 text-sm font-semibold">Batal</button>
          {isEdit && (
            <button type="button" onClick={handleDelete} className="ml-auto inline-flex items-center gap-2 text-red-600 border border-red-300 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-600 hover:text-white transition">
              <Trash2 className="w-4 h-4" /> Hapus Proyek
            </button>
          )}
        </div>
      </form>
    </div>
  );
}