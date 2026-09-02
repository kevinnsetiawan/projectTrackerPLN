import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { Printer, MapPin, Building2, UserRound, AlertTriangle, Camera, PencilRuler, PlusCircle } from 'lucide-react';
import { getProject, storeKendala, storeDokumentasi, updateKendalaStatus } from '../api.js';
import { setPageTitle } from '../components/Layout.jsx';
import { Card, StatusBadge, ProgressBar, DevChip, Spinner, Empty, Field, inputCls, BadgeIcon } from '../components/ui.jsx';
import { formatNilaiKontrak, nilaiMilyar, fmtDate, tipeShort, uipShort } from '../utils.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

const TABS = ['Kurva S & Milestones', 'Kendala & Mitigasi', 'Dokumentasi Lapangan', 'Info Kontrak & Teknis'];
const TAHAP_LIST = ['Sipil & Pondasi', 'Erection Tower / Struktur', 'Elektromekanikal', 'Stringing / Penarikan Kabel', 'Testing & Commissioning', 'Energize COD'];
const KATEGORI_KENDALA = ['Lahan / Sosial', 'Cuaca & Geoteknik', 'Material', 'Vendor / Manpower', 'Teknis / Utilitas', 'Regulasi / Perizinan'];

export default function ProjectShow() {
  const { id } = useParams();
  const [proj, setProj] = useState(null);
  const [err, setErr] = useState(null);
  const [tab, setTab] = useState('Kurva S & Milestones');
  const [msg, setMsg] = useState(null);

  const [kModal, setKModal] = useState(false);
  const [dModal, setDModal] = useState(false);
  const [kForm, setKForm] = useState({ kategori: '', deskripsi: '', dampak: '', tindakan_mitigasi: '', status: 'Open' });
  const [dForm, setDForm] = useState({ judul: '', tahap: TAHAP_LIST[0], foto_url: '', keterangan: '' });

  useEffect(() => {
    setPageTitle('Detail Proyek');
    getProject(id).then(setProj).catch((e) => setErr(e.message));
  }, [id]);

  if (err) return <div className="text-red-600 bg-red-50 p-4 rounded-lg">{err}</div>;
  if (!proj) return <Spinner show />;

  const scurveLabels = proj.scurves.map((s) => s.minggu);
  const scurveRencana = proj.scurves.map((s) => Number(s.rencana));
  const scurveRealisasi = proj.scurves.map((s) => s.realisasi !== null ? Number(s.realisasi) : null);
  const isDelayed = Number(proj.deviasi) < -5;

  const sChart = {
    labels: scurveLabels,
    datasets: [
      { label: 'Rencana (%)', data: scurveRencana, borderColor: '#06336b', backgroundColor: 'rgba(6,51,107,0.08)', fill: true, tension: 0.4, pointRadius: 4 },
      { label: 'Realisasi (%)', data: scurveRealisasi, borderColor: isDelayed ? '#ef4444' : '#06b6d4', backgroundColor: 'rgba(239,68,68,0.08)', fill: true, tension: 0.4, pointRadius: 4 },
    ],
  };

  async function handleStatusChange(kenId, status) {
    await updateKendalaStatus(kenId, status);
    const fresh = await getProject(id);
    setProj(fresh);
    setMsg('Status kendala diperbarui.');
    setTimeout(() => setMsg(null), 3000);
  }

  async function submitKendala(e) {
    e.preventDefault();
    try {
      await storeKendala(id, kForm);
      setKModal(false);
      setKForm({ kategori: '', deskripsi: '', dampak: '', tindakan_mitigasi: '', status: 'Open' });
      setProj(await getProject(id));
      setMsg('Kendala lapangan berhasil dilaporkan.');
      setTimeout(() => setMsg(null), 3000);
    } catch (er) { alert(er.message); }
  }

  async function submitDokumentasi(e) {
    e.preventDefault();
    try {
      if (!dForm.foto_url) {
        dForm.foto_url = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=60';
      }
      await storeDokumentasi(id, dForm);
      setDModal(false);
      setDForm({ judul: '', tahap: TAHAP_LIST[0], foto_url: '', keterangan: '' });
      setProj(await getProject(id));
      setMsg('Dokumentasi foto berhasil ditambahkan.');
      setTimeout(() => setMsg(null), 3000);
    } catch (er) { alert(er.message); }
  }

  return (
    <div className="animate-fade-in">
      {msg && <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">{msg}</div>}

      <Card className="p-5 mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold bg-pln-lightcyan text-pln-blue px-2 py-0.5 rounded">{proj.kode}</span>
              <span className="text-xs text-slate-400">{tipeShort(proj.tipe)} &bull; {proj.tegangan}</span>
            </div>
            <h2 className="text-xl font-extrabold text-pln-navy leading-tight">{proj.nama}</h2>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1"><MapPin className="w-4 h-4 text-pln-cyan" />{proj.lokasi}</span>
              <span className="inline-flex items-center gap-1"><Building2 className="w-4 h-4 text-pln-cyan" />{proj.uip} {proj.upp ? `• ${proj.upp}` : ''}</span>
              <span className="inline-flex items-center gap-1"><UserRound className="w-4 h-4 text-pln-cyan" />{proj.kontraktor}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={proj.status} className="text-sm px-3 py-1" />
            <Link to={`/projects/${id}/progress`} className="text-sm font-bold text-pln-cyan border border-pln-cyan/40 rounded-lg px-3 py-2 hover:bg-pln-cyan hover:text-white transition">Input Progres</Link>
            <Link to={`/projects/${id}/edit`} className="text-sm font-bold text-pln-blue border border-pln-blue/30 rounded-lg px-3 py-2 hover:bg-pln-lightcyan transition">
              <PencilRuler className="inline w-4 h-4 mr-1" />Edit
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Rencana Kumulatif', value: `${proj.progres_rencana}%` },
          { label: 'Realisasi Fisik', value: `${proj.progres_realisasi}%` },
          { label: 'Deviasi Jadwal', value: `${Number(proj.deviasi) > 0 ? '+' : ''}${proj.deviasi}%`, cls: isDelayed ? 'text-red-600' : 'text-emerald-600' },
          { label: 'Penyerapan Anggaran', value: `${proj.penyerapan_anggaran}%` },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-xs text-slate-500">{s.label}</div>
            <div className={`text-2xl font-extrabold mt-1 ${s.cls || 'text-pln-navy'}`}>{s.value}</div>
          </Card>
        ))}
      </div>

      <div className="flex gap-1 mb-5 border-b border-slate-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition ${tab === t ? 'border-pln-cyan text-pln-blue' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Kurva S & Milestones' && (
        <Card className="p-5">
          <h3 className="font-bold text-pln-navy mb-1">Kurva S Proyek</h3>
          <p className="text-xs text-slate-500 mb-3">Progres rencana vs realisasi per minggu</p>
          {scurveLabels.length > 0 ? (
            <Line data={sChart} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { min: 0, max: 100 } } }} height={240} />
          ) : <Empty message="Belum ada data Kurva S." />}

          <h3 className="font-bold text-pln-navy mt-8 mb-3">Tahapan / Milestones</h3>
          {proj.milestones.length === 0 ? <Empty /> : (
            <div className="space-y-3">
              {proj.milestones.map((m, i) => (
                <div key={m.id} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-pln-blue text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                      <span className="font-semibold text-sm text-slate-800">{m.nama}</span>
                    </div>
                    <BadgeIcon cls={
                      m.status === 'Done' ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : m.status === 'In Progress' ? 'bg-cyan-100 text-cyan-800 border-cyan-300'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }>{m.status}</BadgeIcon>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs text-slate-500 mb-3">
                    <span>Bobot: <b className="text-slate-700">{m.bobot}%</b></span>
                    <span>Rencana: <b className="text-slate-700">{m.rencana}%</b></span>
                    <span>Realisasi: <b className="text-slate-700">{m.realisasi}%</b></span>
                  </div>
                  <ProgressBar value={m.realisasi} status={m.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'Kendala & Mitigasi' && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-pln-navy">Kendala &amp; Tindakan Mitigasi</h3>
            <button onClick={() => setKModal(true)} className="inline-flex items-center gap-2 text-sm font-bold text-red-600 border border-red-300 rounded-lg px-3 py-2 hover:bg-red-600 hover:text-white transition">
              <AlertTriangle className="w-4 h-4" /> Lapor Kendala
            </button>
          </div>
          {proj.kendalas.length === 0 ? <Empty message="Belum ada kendala yang dilaporkan." /> : (
            <div className="space-y-3">
              {proj.kendalas.map((k) => (
                <div key={k.id} className="border border-red-200 rounded-xl p-4 bg-red-50/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-red-600">{k.kode_kendala}</span>
                      <span className="text-[11px] bg-red-100 text-red-700 px-2 py-0.5 rounded">{k.kategori}</span>
                      <span className="text-[11px] text-slate-500">{fmtDate(k.tgl_lapor)}</span>
                    </div>
                    <select
                      className="text-xs border border-slate-300 rounded-md px-2 py-1"
                      value={k.status}
                      onChange={(e) => handleStatusChange(k.id, e.target.value)}
                    >
                      <option value="Open">Open</option>
                      <option value="In Review">In Review</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>
                  <div className="grid md:grid-cols-3 gap-3 text-sm mt-2">
                    <div><div className="text-xs font-bold text-slate-600 mb-1">Deskripsi Kendala</div><p className="text-slate-700 text-xs">{k.deskripsi}</p></div>
                    <div><div className="text-xs font-bold text-slate-600 mb-1">Dampak Terhadap Schedule</div><p className="text-slate-600 text-xs">{k.dampak || '-'}</p></div>
                    <div><div className="text-xs font-bold text-emerald-700 mb-1">Tindakan Mitigasi</div><p className="text-emerald-800 text-xs bg-emerald-50 p-2 rounded-md">{k.tindakan_mitigasi || '-'}</p></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'Dokumentasi Lapangan' && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-pln-navy">Galeri Dokumentasi Lapangan</h3>
            <button onClick={() => setDModal(true)} className="inline-flex items-center gap-2 text-sm font-bold text-pln-cyan border border-pln-cyan/40 rounded-lg px-3 py-2 hover:bg-pln-cyan hover:text-white transition">
              <Camera className="w-4 h-4" /> Unggah Foto
            </button>
          </div>
          {proj.dokumentasis.length === 0 ? <Empty message="Belum ada dokumentasi." /> : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {proj.dokumentasis.map((d) => (
                <div key={d.id} className="border border-slate-200 rounded-xl overflow-hidden group">
                  <div className="relative h-44 bg-slate-100">
                    <img src={d.foto} alt={d.judul} className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 bg-pln-blue/90 text-white text-[10px] px-2 py-0.5 rounded capitalize">{d.tahap}</span>
                  </div>
                  <div className="p-3">
                    <div className="font-semibold text-sm text-slate-800">{d.judul}</div>
                    <div className="text-[11px] text-slate-500">{fmtDate(d.tgl)}</div>
                    {d.keterangan && <div className="mt-1 text-[11px] text-slate-500">{d.keterangan}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'Info Kontrak & Teknis' && (
        <div className="grid lg:grid-cols-2 gap-5">
          <Card className="p-5">
            <h3 className="font-bold text-pln-navy mb-3">Data Kontrak &amp; Finansial</h3>
            <dl className="text-sm space-y-2">
              <Row k="Nomor Kontrak" v={proj.nomor_kontrak || '-'} />
              <Row k="Nilai Kontrak" v={formatNilaiKontrak(proj.nilai_kontrak)} />
              <Row k="Kontraktor" v={proj.kontraktor} />
              <Row k="Penyerapan" v={`${proj.penyerapan_anggaran}%`} />
              <Row k="Tanggal Mulai" v={fmtDate(proj.tgl_mulai)} />
              <Row k="Target COD" v={fmtDate(proj.target_cod)} />
            </dl>
          </Card>
          <Card className="p-5">
            <h3 className="font-bold text-pln-navy mb-3">Informasi Teknis &amp; Lokasi</h3>
            <dl className="text-sm space-y-2">
              <Row k="Tipe / Tegangan" v={`${tipeShort(proj.tipe)} / ${proj.tegangan}`} />
              <Row k="Unit Induk" v={proj.uip} />
              <Row k="Unit Pelaksana" v={proj.upp || '-'} />
              <Row k="Koordinat GPS" v={proj.latitude && proj.longitude ? `${proj.latitude}, ${proj.longitude}` : '-'} />
              <Row k="Status" v={proj.status} />
            </dl>
            <div className="mt-4">
              <div className="text-xs font-bold text-slate-600 mb-1">Deskripsi</div>
              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-3">{proj.deskripsi || '-'}</p>
            </div>
          </Card>
        </div>
      )}

      {/* Kendala modal */}
      {kModal && <Modal title="Lapor Kendala Lapangan" onClose={() => setKModal(false)}>
        <form onSubmit={submitKendala} className="space-y-3">
          <Field label="Kategori" required>
            <select className={inputCls} value={kForm.kategori} onChange={(e) => setKForm({ ...kForm, kategori: e.target.value })}>
              <option value="">Pilih kategori</option>
              {KATEGORI_KENDALA.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </Field>
          <Field label="Deskripsi Kendala" required>
            <textarea className={inputCls} rows={3} value={kForm.deskripsi} onChange={(e) => setKForm({ ...kForm, deskripsi: e.target.value })} />
          </Field>
          <Field label="Dampak Terhadap Schedule">
            <input className={inputCls} value={kForm.dampak} onChange={(e) => setKForm({ ...kForm, dampak: e.target.value })} />
          </Field>
          <Field label="Tindakan Mitigasi">
            <textarea className={inputCls} rows={2} value={kForm.tindakan_mitigasi} onChange={(e) => setKForm({ ...kForm, tindakan_mitigasi: e.target.value })} />
          </Field>
          <Field label="Status">
            <select className={inputCls} value={kForm.status} onChange={(e) => setKForm({ ...kForm, status: e.target.value })}>
              <option>Open</option><option>In Review</option><option>Resolved</option>
            </select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setKModal(false)} className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600">Batal</button>
            <button className="px-4 py-2 text-sm font-bold bg-red-600 text-white rounded-lg">Laporkan</button>
          </div>
        </form>
      </Modal>}

      {/* Dokumentasi modal */}
      {dModal && <Modal title="Unggah Dokumentasi" onClose={() => setDModal(false)}>
        <form onSubmit={submitDokumentasi} className="space-y-3">
          <Field label="Judul" required>
            <input className={inputCls} value={dForm.judul} onChange={(e) => setDForm({ ...dForm, judul: e.target.value })} />
          </Field>
          <Field label="Tahap" required>
            <select className={inputCls} value={dForm.tahap} onChange={(e) => setDForm({ ...dForm, tahap: e.target.value })}>
              {TAHAP_LIST.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="URL Foto" hint="Tempel URL gambar, atau kosongkan untuk memakai foto contoh.">
            <input className={inputCls} value={dForm.foto_url} onChange={(e) => setDForm({ ...dForm, foto_url: e.target.value })} placeholder="https://..." />
          </Field>
          <Field label="Keterangan">
            <textarea className={inputCls} rows={2} value={dForm.keterangan} onChange={(e) => setDForm({ ...dForm, keterangan: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setDModal(false)} className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600">Batal</button>
            <button className="px-4 py-2 text-sm font-bold bg-pln-cyan text-white rounded-lg">Simpan</button>
          </div>
        </form>
      </Modal>}
    </div>
  );
}

function Row({ k, v }) {
  return <div className="flex justify-between gap-4 py-1.5 border-b border-slate-50"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-800 text-right">{v}</dd></div>;
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-fade-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-pln-navy">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}