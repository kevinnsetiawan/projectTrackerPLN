import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { Printer, MapPin, Building2, UserRound, AlertTriangle, Camera, PencilRuler, PlusCircle, ArrowLeft, ChevronDown, Clock, FileText } from 'lucide-react';
import { getProject, storeKendala, storeDokumentasi, updateKendalaStatus, storeBoq } from '../api.js';
import Tesseract from 'tesseract.js';
import { setPageTitle } from '../components/Layout.jsx';
import { Card, StatusBadge, ProgressBar, DevChip, Spinner, Empty, Field, inputCls, BadgeIcon } from '../components/ui.jsx';
import { formatNilaiKontrak, nilaiMilyar, fmtDate, tipeShort, uipShort, formatSisaKontrak } from '../utils.js';
import { getUser } from '../auth.js';
import ProjectTimeline from '../components/ProjectTimeline.jsx';
import ApprovalDrawingList from '../components/ApprovalDrawingList.jsx';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

const TABS = ['Timeline & Durasi', 'Approval Drawing', 'Kurva S & Milestones', 'Kendala & Mitigasi', 'Dokumentasi & LK (Vendor)', 'Info Kontrak & Teknis', 'BOQ Kontrak'];
const TAHAP_LIST = ['Sipil & Pondasi', 'Erection Tower / Struktur', 'Elektromekanikal', 'Stringing / Penarikan Kabel', 'Testing & Commissioning', 'Energize COD'];
const KATEGORI_KENDALA = ['Lahan / Sosial', 'Cuaca & Geoteknik', 'Material', 'Vendor / Manpower', 'Teknis / Utilitas', 'Regulasi / Perizinan'];

export default function ProjectShow() {
  const { id } = useParams();
  const me = getUser();
  const isAdmin = me && me.role === 'admin';
  const isVendor = me && me.role === 'vendor';
  const isDalkon = me && me.role === 'dalkon';
  const [proj, setProj] = useState(null);
  const [err, setErr] = useState(null);
  const [tab, setTab] = useState('Timeline & Durasi');
  const [msg, setMsg] = useState(null);

  const [kModal, setKModal] = useState(false);
  const [dModal, setDModal] = useState(false);
  const [bayarOpen, setBayarOpen] = useState(false);
  const [kForm, setKForm] = useState({ kategori: '', deskripsi: '', dampak: '', tindakan_mitigasi: '', status: 'Open' });
  const [dForm, setDForm] = useState({ judul: '', tahap: TAHAP_LIST[0], foto_url: '', keterangan: '' });

  const [boqImg, setBoqImg] = useState(null);
  const [boqItems, setBoqItems] = useState(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrPct, setOcrPct] = useState(0);
  const [boqMsg, setBoqMsg] = useState(null);
  const [boqSaving, setBoqSaving] = useState(false);

  useEffect(() => {
    setPageTitle('Detail Proyek');
    getProject(id).then((p) => {
      setProj(p);
      setBoqImg(p.boq_image || null);
      setBoqItems(p.boqs && p.boqs.length ? p.boqs : null);
      setBoqMsg(null);
    }).catch((e) => setErr(e.message));
  }, [id]);

  if (err) return <div className="text-red-600 bg-red-50 p-4 rounded-lg">{err}</div>;
  if (!proj) return <Spinner show />;

  const scurveLabels = proj.scurves.map((s) => s.minggu);
  const scurveRencana = proj.scurves.map((s) => Number(s.rencana));
  const scurveRealisasi = proj.scurves.map((s) => s.realisasi !== null ? Number(s.realisasi) : null);
  const isDelayed = Number(proj.deviasi) < -5;
  const sisaInfo = formatSisaKontrak(proj.tgl_mulai, proj.target_cod, proj.status);

  // Progres bayar (per termin) calculations.
  const terminBayars = proj.terminBayars || [];
  const totalBayarRp = terminBayars
    .filter((t) => t.status === 'Terbayar')
    .reduce((s, t) => s + Number(t.nominal || 0), 0);
  const progresBayarPct = proj.nilai_kontrak
    ? Math.round((totalBayarRp / Number(proj.nilai_kontrak)) * 1000) / 10
    : 0;

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

  async function handleBoqFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const url = reader.result;
      setBoqImg(url);
      setBoqItems(null);
      setBoqMsg(null);
      setOcrBusy(true);
      setOcrPct(0);
      try {
        const worker = await Tesseract.createWorker('ind', 1, {
          logger: (m) => { if (m.status === 'recognizing text') setOcrPct(Math.round(m.progress * 100)); },
        });
        const { data } = await worker.recognize(url);
        await worker.terminate();
        const items = parseBoqText(data.text);
        if (items.length === 0) {
          setBoqMsg('Tidak ada baris item yang terbaca. Coba pakai gambar BOQ yang lebih tajam/kontras.');
        } else {
          setBoqItems(items);
          setBoqMsg(`${items.length} item berhasil di-generate dari gambar. Periksa & sesuaikan, lalu simpan.`);
        }
      } catch (er) {
        setBoqMsg('OCR gagal: ' + er.message);
      } finally {
        setOcrBusy(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function handleBoqChange(idx, field, value) {
    setBoqItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  }

  function handleBoqRemove(idx) {
    setBoqItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleItemPhoto(idx, field, e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => handleBoqChange(idx, field, reader.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handleBoqSave() {
    if (!boqItems || boqItems.length === 0) return;
    setBoqSaving(true);
    try {
      const fresh = await storeBoq(id, { image_url: boqImg || null, items: boqItems });
      setProj(fresh);
      setMsg('Daftar detail BOQ berhasil disimpan.');
      setBoqMsg(null);
      setTimeout(() => setMsg(null), 3000);
    } catch (er) { alert(er.message); } finally { setBoqSaving(false); }
  }

  function handleBoqReset() {
    setBoqImg(null);
    setBoqItems(null);
    setBoqMsg(null);
  }

  return (
    <div className="animate-fade-in">
      {msg && <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">{msg}</div>}

      <div className="mb-4">
        <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm font-semibold text-pln-blue hover:underline">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Proyek
        </Link>
      </div>

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
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={proj.status} className="text-sm px-3 py-1" />
            <Link to={`/projects/${id}/progress`} className="text-sm font-bold text-pln-cyan border border-pln-cyan/40 rounded-lg px-3 py-2 hover:bg-pln-cyan hover:text-white transition">Input Progres</Link>
            <Link to={`/projects/${id}/edit`} className="text-sm font-bold text-pln-blue border border-pln-blue/30 rounded-lg px-3 py-2 hover:bg-pln-lightcyan transition">
              <PencilRuler className="inline w-4 h-4 mr-1" />Edit
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-5">
        {[
          { label: 'Rencana Kumulatif', value: `${proj.progres_rencana}%` },
          { label: 'Realisasi Fisik', value: `${proj.progres_realisasi}%` },
          { label: 'Deviasi Jadwal', value: `${Number(proj.deviasi) > 0 ? '+' : ''}${proj.deviasi}%`, cls: isDelayed ? 'text-red-600' : 'text-emerald-600' },
          { label: 'Sisa Waktu Kontrak', value: sisaInfo.daysText, sub: sisaInfo.shortText, cls: sisaInfo.isOverdue ? 'text-red-600' : sisaInfo.isExpiringSoon ? 'text-amber-600' : 'text-pln-blue' },
          { label: 'Penyerapan Anggaran', value: `${proj.penyerapan_anggaran}%` },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-xs text-slate-500">{s.label}</div>
            <div className={`text-xl font-extrabold mt-1 ${s.cls || 'text-pln-navy'}`}>{s.value}</div>
            {s.sub && <div className="text-[11px] text-slate-500 mt-0.5 truncate">{s.sub}</div>}
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

      {tab === 'Timeline & Durasi' && (
        <ProjectTimeline project={proj} />
      )}

      {tab === 'Approval Drawing' && (
        <ApprovalDrawingList projectId={id} drawings={proj.drawings || []} onRefresh={() => getProject(id).then(setProj)} />
      )}

      {tab === 'Kurva S & Milestones' && (
        <Card className="p-5">
          <h3 className="font-bold text-pln-navy mb-1">Kurva S Proyek</h3>
          <p className="text-xs text-slate-500 mb-3">Progres rencana vs realisasi per minggu</p>
          {scurveLabels.length > 0 ? (
            <div className="relative h-72 w-full">
              <Line data={sChart} options={{ maintainAspectRatio: false, responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { min: 0, max: 100 } } }} />
            </div>
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-500 mb-3">
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
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
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

      {tab === 'Dokumentasi & LK (Vendor)' && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-bold text-pln-navy">Dokumentasi &amp; LK (Laporan Konstruksi)</h3>
              <p className="text-xs text-slate-500">Unggah foto progres lapangan dan dokumen Laporan Konstruksi (LK) oleh Vendor</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setDModal(true)} className="inline-flex items-center gap-1.5 text-xs font-bold text-pln-cyan border border-pln-cyan/40 rounded-lg px-3 py-2 hover:bg-pln-cyan hover:text-white transition">
                <Camera className="w-4 h-4" /> Unggah Foto Lapangan
              </button>
              <button onClick={() => setDModal(true)} className="inline-flex items-center gap-1.5 text-xs font-bold bg-pln-blue text-white rounded-lg px-3 py-2 hover:bg-pln-navy transition shadow-sm">
                <FileText className="w-4 h-4" /> Unggah LK (Vendor)
              </button>
            </div>
          </div>
          {proj.dokumentasis.length === 0 ? <Empty message="Belum ada dokumentasi atau Laporan Konstruksi (LK)." /> : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {proj.dokumentasis.map((d) => (
                <div key={d.id} className="border border-slate-200 rounded-xl overflow-hidden group bg-white shadow-sm">
                  <div className="relative h-44 bg-slate-100 flex items-center justify-center">
                    {d.foto && (d.foto.startsWith('data:application/pdf') || d.foto.endsWith('.pdf')) ? (
                      <div className="text-center p-4">
                        <FileText className="w-12 h-12 text-pln-blue mx-auto mb-2" />
                        <span className="text-xs font-bold text-slate-700 block">{d.judul}</span>
                        <a href={d.foto} target="_blank" rel="noreferrer" className="text-[11px] text-pln-cyan font-bold hover:underline mt-1 block">Buka File PDF &rarr;</a>
                      </div>
                    ) : (
                      <img src={d.foto} alt={d.judul} className="w-full h-full object-cover" />
                    )}
                    <span className="absolute top-2 left-2 bg-pln-blue/90 text-white text-[10px] px-2 py-0.5 rounded capitalize">{d.tahap || 'Dokumentasi'}</span>
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
        <div className="space-y-5">
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
                <Row k="Total Durasi Kontrak" v={sisaInfo.totalDays ? `${sisaInfo.totalDays} Hari` : '-'} />
                <Row k="Sisa Waktu Kontrak" v={<span className={`inline-block px-2 py-0.5 rounded text-xs border ${sisaInfo.cls}`}>{sisaInfo.text}</span>} />
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

          <Card className="p-5">
            <button type="button" onClick={() => setBayarOpen(!bayarOpen)} className="w-full text-left">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-pln-navy">Progres Bayar (Per Termin)</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Klik untuk melihat rincian tiap termin bayar</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xl font-extrabold text-pln-blue">{progresBayarPct}%</div>
                    <div className="text-[11px] text-slate-500">{formatNilaiKontrak(totalBayarRp)} terbayar</div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${bayarOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
              <div className="mt-3">
                <ProgressBar value={progresBayarPct} status="In Progress" />
                <div className="flex flex-wrap justify-between gap-2 text-[11px] text-slate-500 mt-1">
                  <span>{progresBayarPct}% dibayarkan dari nilai kontrak</span>
                  <span>Nilai Kontrak {formatNilaiKontrak(proj.nilai_kontrak)}</span>
                </div>
              </div>
            </button>

            {bayarOpen && (
              <div className="mt-4 overflow-x-auto border-t border-slate-100 pt-4">
                {terminBayars.length === 0 ? <Empty message="Belum ada data termin bayar." /> : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">No</th>
                        <th className="px-4 py-3">Termin</th>
                        <th className="px-4 py-3 text-right">Bobot</th>
                        <th className="px-4 py-3 text-right">Nominal</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Terbayar (Bulan)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {terminBayars.map((t, i) => (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800">{t.nama}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{Number(t.bobot)}%</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-700">{formatNilaiKontrak(t.nominal)}</td>
                          <td className="px-4 py-3">
                            <BadgeIcon cls={t.status === 'Terbayar' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-600 border-slate-300'}>
                              {t.status === 'Terbayar' ? 'Terbayar' : 'Belum Bayar'}
                            </BadgeIcon>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">{t.status === 'Terbayar' ? fmtMonth(t.tgl_bayar) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
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

      {tab === 'BOQ Kontrak' && (
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="font-bold text-pln-navy">BOQ Kontrak</h3>
              <p className="text-xs text-slate-500 mt-0.5">Unggah gambar BOQ (Bill of Quantities), daftar item proyek akan ter-generate otomatis.</p>
            </div>
            <label className="text-sm font-bold bg-pln-cyan text-white rounded-lg px-4 py-2 cursor-pointer hover:bg-cyan-500 transition inline-flex items-center gap-1.5">
              <UploadIcon /> {boqImg ? 'Ganti Gambar BOQ' : 'Unggah Gambar BOQ'}
              <input type="file" accept="image/*" className="hidden" onChange={handleBoqFile} disabled={ocrBusy} />
            </label>
          </div>

          {boqImg && (
            <div className="mb-4">
              <div className="rounded-xl border border-slate-200 overflow-hidden max-h-72 flex justify-center bg-slate-50">
                <img src={boqImg} alt="BOQ Kontrak" className="object-contain max-h-72" />
              </div>
            </div>
          )}

          {ocrBusy && (
            <div className="mb-4 rounded-lg border border-pln-lightcyan bg-pln-lightcyan/50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-pln-blue mb-2">
                <Spinner show /> Membaca gambar & menghasilkan daftar item...
              </div>
              <ProgressBar value={ocrPct} status="In Progress" />
            </div>
          )}

          {boqMsg && !ocrBusy && <div className="mb-4 bg-pln-lightcyan/70 border border-pln-lightcyan text-pln-blue px-4 py-3 rounded-lg text-sm">{boqMsg}</div>}

          {boqItems === null ? (
            !boqImg && <Empty message="Belum ada gambar BOQ. Unggah gambar untuk mulai generate daftar item." />
          ) : (
            <div>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-3 w-10">No</th>
                      <th className="px-3 py-3">Uraian Pekerjaan</th>
                      <th className="px-3 py-3 w-24">Satuan</th>
                      <th className="px-3 py-3 w-28 text-right">Volume</th>
                      <th className="px-3 py-3 w-40 text-right">Harga Satuan</th>
                      <th className="px-3 py-3 w-40 text-right">Total</th>
                      <th className="px-3 py-3 w-40">Foto Vendor</th>
                      <th className="px-3 py-3 w-40">Foto Dalkon</th>
                      <th className="px-3 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {boqItems.map((it, i) => (
                      <tr key={i} className="align-top">
                        <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                        <td className="px-3 py-2">
                          <input className={`${inputCls} min-w-52`} value={it.uraian} onChange={(e) => handleBoqChange(i, 'uraian', e.target.value)} />
                        </td>
                        <td className="px-3 py-2">
                          <input className={inputCls} value={it.satuan || ''} onChange={(e) => handleBoqChange(i, 'satuan', e.target.value)} />
                        </td>
                        <td className="px-3 py-2">
                          <input className={`${inputCls} text-right`} type="number" step="any" value={it.volume ?? ''} onChange={(e) => handleBoqChange(i, 'volume', e.target.value)} />
                        </td>
                        <td className="px-3 py-2">
                          <input className={`${inputCls} text-right`} type="number" step="any" value={it.harga_satuan ?? ''} onChange={(e) => handleBoqChange(i, 'harga_satuan', e.target.value)} />
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-slate-700 whitespace-nowrap">
                          {formatNilaiKontrak((Number(it.volume) || 0) * (Number(it.harga_satuan) || 0))}
                        </td>
                        <td className="px-3 py-2">
                          <ItemPhotoSlot label="Vendor" photo={it.foto_vendor} disabled={!isAdmin && !isVendor} onPick={(e) => handleItemPhoto(i, 'foto_vendor', e)} onClear={() => handleBoqChange(i, 'foto_vendor', null)} />
                        </td>
                        <td className="px-3 py-2">
                          <ItemPhotoSlot label="Dalkon" photo={it.foto_dalkon} disabled={!isAdmin && !isDalkon} onPick={(e) => handleItemPhoto(i, 'foto_dalkon', e)} onClear={() => handleBoqChange(i, 'foto_dalkon', null)} />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button type="button" onClick={() => handleBoqRemove(i)} className="text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <div className="text-sm">
                  <span className="text-slate-500">Total BOQ: </span>
                  <span className="font-extrabold text-pln-navy">{formatNilaiKontrak(boqItems.reduce((s, it) => s + (Number(it.volume) || 0) * (Number(it.harga_satuan) || 0), 0))}</span>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={handleBoqReset} className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition">Reset</button>
                  <button type="button" onClick={handleBoqSave} disabled={boqSaving || boqItems.length === 0} className="px-4 py-2 text-sm font-bold bg-pln-cyan text-white rounded-lg hover:bg-cyan-500 transition disabled:opacity-50">
                    {boqSaving ? 'Menyimpan...' : 'Simpan BOQ'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function UploadIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 8l-4-4-4 4M12 4v12" /></svg>;
}

function ItemPhotoSlot({ label, photo, onPick, onClear, disabled }) {
  if (photo) {
    return (
      <div className="group relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
        <img src={photo} alt={`Foto ${label}`} className="w-full h-full object-cover" />
        {!disabled && (
          <button type="button" onClick={onClear} title={`Hapus foto ${label}`} className="absolute top-0.5 right-0.5 bg-white/90 text-red-500 w-5 h-5 rounded-full text-xs leading-none shadow hover:bg-red-500 hover:text-white transition">&times;</button>
        )}
        <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] font-semibold text-center py-0.5">{label}</span>
      </div>
    );
  }
  if (disabled) {
    return (
      <div className="flex items-center justify-center w-24 h-24 rounded-lg border border-dashed border-slate-200 bg-slate-50 text-slate-300 text-[10px] font-semibold">
        Hanya <span className="ml-0.5">{label}</span>
      </div>
    );
  }
  return (
    <label className="flex flex-col items-center justify-center gap-1 w-24 h-24 rounded-lg border border-dashed border-slate-300 text-slate-400 hover:border-pln-cyan hover:text-pln-blue cursor-pointer transition text-[10px] font-semibold">
      <UploadIcon />
      Foto {label}
      <input type="file" accept="image/*" className="hidden" onChange={onPick} />
    </label>
  );
}

function Row({ k, v }) {
  return <div className="flex justify-between gap-4 py-1.5 border-b border-slate-50"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-800 text-right">{v}</dd></div>;
}

function fmtMonth(d) {
  if (!d) return '-';
  const date = new Date(d);
  if (isNaN(date)) return '-';
  return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

const BOQ_UNITS = ['m2', 'm²', 'm3', 'm³', 'bm', 'kt', 'kmt', 'ls', 'lot', 'unit', 'units', 'set', 'sets', 'tt', 'bay', 'pt', 'buah', 'pack', 'paket', 'titik', 'trip'];

function parseIdNum(s) {
  return Number(String(s).replace(/\./g, '').replace(/,/g, '.'));
}

function parseBoqText(text) {
  const lines = String(text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const items = [];
  for (const line of lines) {
    const nums = line.match(/\d[\d.,]*/g) || [];
    const parsed = nums.map(parseIdNum).filter((n) => !isNaN(n));
    if (parsed.length === 0) continue;
    const low = line.toLowerCase();
    const satuan = BOQ_UNITS.find((u) => low.includes(u));
    const desc = line.replace(/\d[\d.,]*/g, ' ').replace(/\s+/g, ' ').trim();
    if (!desc) continue;
    let volume = null;
    let harga = null;
    if (parsed.length >= 2) {
      volume = parsed[0];
      harga = parsed[parsed.length - 1];
    } else {
      harga = parsed[0];
    }
    items.push({
      uraian: desc,
      satuan: satuan ? satuan.toUpperCase() : '',
      volume: volume,
      harga_satuan: harga,
      foto_vendor: null,
      foto_dalkon: null,
    });
  }
  return items;
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