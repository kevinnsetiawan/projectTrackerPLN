import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, CalendarClock } from 'lucide-react';
import { getProject, storeProgress } from '../api.js';
import { setPageTitle } from '../components/Layout.jsx';
import { Card, Field, inputCls, Spinner, StatusBadge } from '../components/ui.jsx';
import { fmtDate } from '../utils.js';

export default function ProgressForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [proj, setProj] = useState(null);
  const [form, setForm] = useState({});
  const [milestones, setMilestones] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    setPageTitle('Input Progres Mingguan');
    getProject(id).then((p) => {
      setProj(p);
      const nextM = `M-${p.scurves.length + 1} (${new Date().toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })})`;
      setForm({
        minggu_label: nextM, progres_rencana: p.progres_rencana, progres_realisasi: p.progres_realisasi,
        penyerapan_anggaran: p.penyerapan_anggaran, catatan: '',
      });
      setMilestones(p.milestones.map((m) => ({ id: m.id, realisasi: m.realisasi, status: m.status })));
    }).catch((e) => setErr(e.message));
  }, [id]);

  if (err) return <div className="text-red-600 bg-red-50 p-4 rounded-lg">{err}</div>;
  if (!proj) return <Spinner show />;

  function setField(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function setMilestone(idx, field, value) {
    setMilestones((arr) => arr.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await storeProgress(id, {
        minggu_label: form.minggu_label, progres_rencana: form.progres_rencana,
        progres_realisasi: form.progres_realisasi, penyerapan_anggaran: form.penyerapan_anggaran,
        catatan: form.catatan, milestones,
      });
      navigate(`/projects/${id}`);
    } catch (er) {
      alert(er.message);
      setSaving(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-pln-blue hover:underline mb-5">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </button>

      <Card className="p-5 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold bg-pln-lightcyan text-pln-blue px-2 py-0.5 rounded">{proj.kode}</span>
              <StatusBadge status={proj.status} />
            </div>
            <h2 className="text-lg font-extrabold text-pln-navy">{proj.nama}</h2>
            <div className="text-xs text-slate-500 mt-1">{proj.kontraktor} &bull; Target COD {fmtDate(proj.target_cod)}</div>
          </div>
          <div className="inline-flex items-center gap-2 text-sm text-pln-blue bg-pln-lightcyan rounded-lg px-3 py-2 font-semibold">
            <CalendarClock className="w-4 h-4" /> {form.minggu_label}
          </div>
        </div>
      </Card>

      <form onSubmit={handleSubmit}>
        <Card className="p-5 mb-5">
          <h3 className="font-bold text-pln-navy mb-4">1. Update Titik Kurva S &amp; Capaian Kumulatif</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Field label="Label Minggu">
                <input className={inputCls} value={form.minggu_label} onChange={(e) => setField('minggu_label', e.target.value)} />
              </Field>
            </div>
            <Field label="Progres Rencana Kumulatif (%)" required>
              <input className={inputCls} type="number" min="0" max="100" value={form.progres_rencana} onChange={(e) => setField('progres_rencana', e.target.value)} />
            </Field>
            <Field label="Progres Realisasi Kumulatif (%)" required>
              <input className={inputCls} type="number" min="0" max="100" value={form.progres_realisasi} onChange={(e) => setField('progres_realisasi', e.target.value)} />
            </Field>
            <Field label="Penyerapan Anggaran (%)">
              <input className={inputCls} type="number" min="0" max="100" value={form.penyerapan_anggaran} onChange={(e) => setField('penyerapan_anggaran', e.target.value)} />
            </Field>
            <Field label="Catatan Mingguan">
              <input className={inputCls} value={form.catatan} onChange={(e) => setField('catatan', e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card className="p-5 mb-5">
          <h3 className="font-bold text-pln-navy mb-1">2. Capaian Fisik per Tahapan (Milestones)</h3>
          <p className="text-xs text-slate-500 mb-4">Perbarui realisasi dan status tiap tahapan pekerjaan.</p>
          <div className="space-y-3">
            {milestones.map((m, idx) => {
              const ms = proj.milestones[idx];
              return (
                <div key={m.id} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div>
                      <div className="font-semibold text-sm text-slate-800">{ms.nama}</div>
                      <div className="text-[11px] text-slate-500">Bobot {ms.bobot}% &bull; Rencana {ms.rencana}%</div>
                    </div>
                    <select
                      className="text-xs border border-slate-300 rounded-md px-2 py-1.5"
                      value={m.status}
                      onChange={(e) => setMilestone(idx, 'status', e.target.value)}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Done">Done</option>
                    </select>
                  </div>
                  <Field label="Realisasi (%)">
                    <input className={inputCls} type="number" min="0" max="100" value={m.realisasi} onChange={(e) => setMilestone(idx, 'realisasi', e.target.value)} />
                  </Field>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 bg-pln-gradient text-white px-6 py-2.5 rounded-lg font-bold shadow-pln-cta hover:shadow-pln transition">
            <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Laporan Mingguan'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-600 text-sm font-semibold">Batal</button>
        </div>
      </form>
    </div>
  );
}