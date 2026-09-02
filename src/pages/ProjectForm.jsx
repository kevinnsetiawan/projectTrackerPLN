import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { getMeta, getProject, createProject, updateProject, deleteProject } from '../api.js';
import { setPageTitle } from '../components/Layout.jsx';
import { Card, Field, inputCls, Spinner } from '../components/ui.jsx';
import { isoDate } from '../utils.js';

const TEGANGAN = ['500 kV', '275 kV', '150 kV', '70 kV', '20 kV'];

const EMPTY = {
  kode: '', nama: '', tipe: 'Gardu Induk (GI)', tegangan: '150 kV',
  uip: '', upp: '', lokasi: '', latitude: '', longitude: '',
  kontraktor: '', nomor_kontrak: '', nilai_kontrak: '', penyerapan_anggaran: '',
  tgl_mulai: '', target_cod: '', progres_rencana: '', progres_realisasi: '',
  deskripsi: '',
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
  const [status, setStatus] = useState('In Progress');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPageTitle(isEdit ? 'Ubah Proyek' : 'Pendaftaran Proyek Baru');
    getMeta().then(setMeta);
    if (isEdit) {
      getProject(id).then((p) => {
        setForm({
          kode: p.kode, nama: p.nama, tipe: p.tipe, tegangan: p.tegangan, uip: p.uip, upp: p.upp || '',
          lokasi: p.lokasi, latitude: p.latitude ?? '', longitude: p.longitude ?? '',
          kontraktor: p.kontraktor, nomor_kontrak: p.nomor_kontrak || '', nilai_kontrak: p.nilai_kontrak,
          penyerapan_anggaran: p.penyerapan_anggaran, tgl_mulai: isoDate(p.tgl_mulai) || '',
          target_cod: isoDate(p.target_cod) || '', progres_rencana: p.progres_rencana,
          progres_realisasi: p.progres_realisasi, deskripsi: p.deskripsi || '',
        });
        setStatus(p.status);
        setLoading(false);
      });
    }
  }, [id]);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, nilai_kontrak: Number(form.nilai_kontrak || 0) };
      if (isEdit) {
        await updateProject(id, { ...payload, status });
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
              <Field label="Lokasi" required>
                <input className={inputCls} value={form.lokasi} onChange={(e) => set('lokasi', e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Latitude">
                  <input className={inputCls} value={form.latitude} onChange={(e) => set('latitude', e.target.value)} />
                </Field>
                <Field label="Longitude">
                  <input className={inputCls} value={form.longitude} onChange={(e) => set('longitude', e.target.value)} />
                </Field>
              </div>
            </Section>
          </Card>

          <Card className="p-5">
            <Section num={3} title={isEdit ? 'Kontrak &amp; Status Pelaksanaan' : 'Kontrak &amp; Finansial'}>
              <Field label="Kontraktor" required>
                <input className={inputCls} value={form.kontraktor} onChange={(e) => set('kontraktor', e.target.value)} />
              </Field>
              <Field label="Nomor Kontrak">
                <input className={inputCls} value={form.nomor_kontrak} onChange={(e) => set('nomor_kontrak', e.target.value)} />
              </Field>
              <Field label="Nilai Kontrak (Rp)">
                <input className={inputCls} type="number" min="0" value={form.nilai_kontrak} onChange={(e) => set('nilai_kontrak', e.target.value)} />
              </Field>
              <Field label="Penyerapan Anggaran (%)">
                <input className={inputCls} type="number" min="0" max="100" value={form.penyerapan_anggaran} onChange={(e) => set('penyerapan_anggaran', e.target.value)} />
              </Field>
              <Field label="Tanggal Mulai">
                <input className={inputCls} type="date" value={form.tgl_mulai} onChange={(e) => set('tgl_mulai', e.target.value)} />
              </Field>
              <Field label="Target COD">
                <input className={inputCls} type="date" value={form.target_cod} onChange={(e) => set('target_cod', e.target.value)} />
              </Field>
              {isEdit && (
                <Field label="Status Proyek">
                  <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
                    {['In Progress', 'Critical', 'Testing', 'COD / Energized', 'Planning'].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
              )}
              {!isEdit && <Field label="Penyerapan awal tersimpan otomatis saat input progres."><div /></Field>}
            </Section>
          </Card>

          <Card className="p-5">
            <Section num={4} title="Baseline Progres">
              <Field label="Progres Rencana (%)" hint="Otomatis dibuatkan Kurva S & milestones default saat proyek baru.">
                <input className={inputCls} type="number" min="0" max="100" value={form.progres_rencana} onChange={(e) => set('progres_rencana', e.target.value)} />
              </Field>
              <Field label="Progres Realisasi (%)">
                <input className={inputCls} type="number" min="0" max="100" value={form.progres_realisasi} onChange={(e) => set('progres_realisasi', e.target.value)} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Deskripsi">
                  <textarea className={inputCls} rows={3} value={form.deskripsi} onChange={(e) => set('deskripsi', e.target.value)} />
                </Field>
              </div>
            </Section>
          </Card>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 bg-pln-gradient text-white px-6 py-2.5 rounded-lg font-bold shadow-pln-cta hover:shadow-pln transition">
            <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : (isEdit ? 'Simpan Perubahan' : 'Simpan Proyek')}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-600 text-sm font-semibold">Batal</button>
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