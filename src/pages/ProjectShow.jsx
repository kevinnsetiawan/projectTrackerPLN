import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { Printer, MapPin, Building2, UserRound, AlertTriangle, Camera, PencilRuler, PlusCircle, ArrowLeft, ChevronDown, Clock, FileText, ClipboardList, CheckCircle2, ScrollText, CalendarDays, Users } from 'lucide-react';
import { getProject, storeKendala, updateKendala, deleteKendala, storeDokumentasi, updateDokumentasi, deleteDokumentasi, updateKendalaStatus, storeBoqGroup, updateBoqGroup, deleteBoqGroup, storeInstruksiKerja, updateInstruksiKerja, deleteInstruksiKerja, storeAmandemen, deleteAmandemen, storeAgenda, updateAgenda, deleteAgenda } from '../api.js';
import { readSheet } from 'read-excel-file/browser';
import { setPageTitle } from '../components/Layout.jsx';
import { Card, StatusBadge, ProgressBar, DevChip, Spinner, Empty, Field, inputCls, BadgeIcon } from '../components/ui.jsx';
import { formatNilaiKontrak, nilaiMilyar, fmtDate, tipeShort, uipShort, formatSisaKontrak } from '../utils.js';
import { getUser } from '../auth.js';
import ProjectTimeline from '../components/ProjectTimeline.jsx';
import ApprovalDrawingList from '../components/ApprovalDrawingList.jsx';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

const TABS = ['Timeline & Durasi', 'Approval Drawing', 'Kurva S & Milestones', 'Kendala & Mitigasi', 'Dokumentasi & LK (Vendor)', 'Agenda Rapat', 'Info Kontrak & Teknis', 'BOQ Kontrak', 'Instruksi Kerja'];
const TAHAP_LIST = ['Sipil & Pondasi', 'Erection Tower / Struktur', 'Elektromekanikal', 'Stringing / Penarikan Kabel', 'Testing & Commissioning', 'Energize COD'];
const KATEGORI_KENDALA = ['Lahan / Sosial', 'Cuaca & Geoteknik', 'Material', 'Vendor / Manpower', 'Teknis / Utilitas', 'Regulasi / Perizinan'];
const AGENDA_STATUS_OPTS = ['Terjadwal', 'Selesai', 'Dibatalkan'];
const AGENDA_SURAT_OPTS = ['Belum Dibuat', 'Sudah Dibuat di AMS'];
const AGENDA_EMPTY = { judul: '', tgl_rapat: new Date().toISOString().slice(0, 10), jam_rapat: '', lokasi: '', link_video: '', peserta: '', topik: '', hasil: '', status_surat: 'Belum Dibuat', nomor_surat: '', reminder_hari: 1, status: 'Terjadwal' };

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
  const [kEditId, setKEditId] = useState(null);
  const [dModal, setDModal] = useState(false);
  const [dEditId, setDEditId] = useState(null);
  const [bayarOpen, setBayarOpen] = useState(false);
  const [kForm, setKForm] = useState({ kategori: '', deskripsi: '', dampak: '', tindakan_mitigasi: '', status: 'Open' });
  const [dForm, setDForm] = useState({ judul: '', tahap: TAHAP_LIST[0], foto_url: '', keterangan: '' });
  const [ikModal, setIKModal] = useState(false);
  const [ikEditId, setIKEditId] = useState(null);
  const [ikForm, setIKForm] = useState({ judul: '', nomor_instruksi: '', jenis: 'Instruksi Kerja', file: '', keterangan: '' });

  const [activeBoqId, setActiveBoqId] = useState(null);
  const [boqItems, setBoqItems] = useState(null);
  const [boqBusy, setBoqBusy] = useState(false);
  const [boqMsg, setBoqMsg] = useState(null);
  const [boqSaving, setBoqSaving] = useState(false);
  const [amModal, setAmModal] = useState(false);
  const [amForm, setAmForm] = useState({ nomor: '', keterangan: '', durasi_hari: 30 });
  const [amSaving, setAmSaving] = useState(false);
  const [agendaModal, setAgendaModal] = useState(false);
  const [agendaEditId, setAgendaEditId] = useState(null);
  const [agendaForm, setAgendaForm] = useState(AGENDA_EMPTY);
  const [agendaSaving, setAgendaSaving] = useState(false);

  const projBoqGroups = (proj && proj.boqGroups) || [];

  useEffect(() => {
    setPageTitle('Detail Proyek');
    getProject(id).then((p) => {
      setProj(p);
      const groups = p.boqGroups || [];
      const firstId = groups.length ? groups[0].id : null;
      setActiveBoqId(firstId);
      setBoqItems(firstId && groups[0].items.length ? groups[0].items : null);
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

  // Keselarasan BOQ vs Kurva S: realisasi tertimbang dari item BOQ.
  const boqsArr = proj.boqs || [];
  const boqTotalRp = boqsArr.reduce((s, it) => {
    const tot = Number(it.total) || (Number(it.volume) || 0) * (Number(it.harga_satuan) || 0);
    return s + tot;
  }, 0);
  const boqRealPct = boqTotalRp
    ? Math.round(boqsArr.reduce((s, it) => {
      const tot = Number(it.total) || (Number(it.volume) || 0) * (Number(it.harga_satuan) || 0);
      const pg = Math.min(100, Math.max(0, Number(it.progres) || 0));
      return s + (tot * pg) / 100;
    }, 0) * 1000 / boqTotalRp) / 10
    : null;
  const boqSelisih = boqRealPct === null ? null : Math.round((Number(proj.progres_realisasi) - boqRealPct) * 10) / 10;

  // Bobot item BOQ aktif = (volume x harga satuan) / total BOQ (sebelum PPN).
  const boqItemsTotal = (boqItems || []).reduce((s, it) => {
    const tot = (Number(it.volume) || 0) * (Number(it.harga_satuan) || 0);
    return s + tot;
  }, 0);
  const bobotOf = (it) => boqItemsTotal > 0
    ? (((Number(it.volume) || 0) * (Number(it.harga_satuan) || 0)) / boqItemsTotal) * 100
    : 0;

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

  function openKendalaAdd() {
    setKEditId(null);
    setKForm({ kategori: '', deskripsi: '', dampak: '', tindakan_mitigasi: '', status: 'Open' });
    setKModal(true);
  }

  function openKendalaEdit(k) {
    setKEditId(k.id);
    setKForm({ kategori: k.kategori, deskripsi: k.deskripsi, dampak: k.dampak || '', tindakan_mitigasi: k.tindakan_mitigasi || '', status: k.status });
    setKModal(true);
  }

  async function submitKendala(e) {
    e.preventDefault();
    try {
      if (kEditId) {
        await updateKendala(kEditId, kForm);
        setMsg('Kendala berhasil diperbarui.');
      } else {
        await storeKendala(id, kForm);
        setMsg('Kendala lapangan berhasil dilaporkan.');
      }
      setKModal(false);
      setKForm({ kategori: '', deskripsi: '', dampak: '', tindakan_mitigasi: '', status: 'Open' });
      setProj(await getProject(id));
      setTimeout(() => setMsg(null), 3000);
    } catch (er) { alert(er.message); }
  }

  async function handleKendalaDelete(kenId) {
    if (!confirm('Hapus kendala ini?')) return;
    try {
      await deleteKendala(kenId);
      setProj(await getProject(id));
      setMsg('Kendala dihapus.');
      setTimeout(() => setMsg(null), 3000);
    } catch (er) { alert(er.message); }
  }

  function openDokumentasiAdd() {
    setDEditId(null);
    setDForm({ judul: '', tahap: TAHAP_LIST[0], foto_url: '', keterangan: '' });
    setDModal(true);
  }

  function openDokumentasiEdit(d) {
    setDEditId(d.id);
    setDForm({ judul: d.judul, tahap: d.tahap || TAHAP_LIST[0], foto_url: d.foto || '', keterangan: d.keterangan || '' });
    setDModal(true);
  }

  async function submitDokumentasi(e) {
    e.preventDefault();
    try {
      if (dEditId) {
        await updateDokumentasi(id, dEditId, dForm);
        setMsg('Dokumentasi berhasil diperbarui.');
      } else {
        await storeDokumentasi(id, dForm);
        setMsg('Dokumentasi foto berhasil ditambahkan.');
      }
      setDModal(false);
      setDForm({ judul: '', tahap: TAHAP_LIST[0], foto_url: '', keterangan: '' });
      setProj(await getProject(id));
      setTimeout(() => setMsg(null), 3000);
    } catch (er) { alert(er.message); }
  }

  async function handleDokumentasiDelete(docId) {
    if (!confirm('Hapus dokumentasi ini?')) return;
    try {
      await deleteDokumentasi(id, docId);
      setProj(await getProject(id));
      setMsg('Dokumentasi dihapus.');
      setTimeout(() => setMsg(null), 3000);
    } catch (er) { alert(er.message); }
  }

  async function submitAmandemen(e) {
    e.preventDefault();
    setAmSaving(true);
    try {
      const created = await storeAmandemen(id, amForm);
      setAmModal(false);
      setAmForm({ nomor: '', keterangan: '', durasi_hari: 30 });
      setProj(await getProject(id));
      setMsg(`Amandemen ${created.nomor || 'baru'} diterbitkan. Target COD kini ${fmtDate(created.target_cod_baru)}.`);
      setTimeout(() => setMsg(null), 5000);
    } catch (er) { alert(er.message); } finally { setAmSaving(false); }
  }

  async function handleAmandemenDelete(amId) {
    if (!confirm('Hapus amandemen ini? Target COD proyek akan dikembalikan ke nilai sebelum amandemen.')) return;
    try {
      await deleteAmandemen(amId);
      setProj(await getProject(id));
      setMsg('Amandemen dihapus dan Target COD dikembalikan.');
      setTimeout(() => setMsg(null), 4000);
    } catch (er) { alert(er.message); }
  }

  function handleIKFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setIKForm((prev) => ({ ...prev, file: reader.result }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function openIKAdd() {
    setIKEditId(null);
    setIKForm({ judul: '', nomor_instruksi: '', jenis: 'Instruksi Kerja', file: '', keterangan: '' });
    setIKModal(true);
  }

  function openIKEdit(ik) {
    setIKEditId(ik.id);
    setIKForm({ judul: ik.judul, nomor_instruksi: ik.nomor_instruksi || '', jenis: ik.jenis || 'Instruksi Kerja', file: ik.file || '', keterangan: ik.keterangan || '' });
    setIKModal(true);
  }

  async function submitInstruksi(e) {
    e.preventDefault();
    try {
      const payload = { ...ikForm };
      if (!ikEditId && !payload.file) {
        payload.file = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
      }
      if (ikEditId) {
        await updateInstruksiKerja(ikEditId, payload);
        setMsg('Instruksi kerja berhasil diperbarui.');
      } else {
        await storeInstruksiKerja(id, payload);
        setMsg('Instruksi kerja berhasil diunggah.');
      }
      setIKModal(false);
      setIKForm({ judul: '', nomor_instruksi: '', jenis: 'Instruksi Kerja', file: '', keterangan: '' });
      setProj(await getProject(id));
      setTimeout(() => setMsg(null), 3000);
    } catch (er) { alert(er.message); }
  }

  function openAgendaAdd() {
    setAgendaEditId(null);
    setAgendaForm(AGENDA_EMPTY);
    setAgendaModal(true);
  }

  function openAgendaEdit(a) {
    setAgendaEditId(a.id);
    setAgendaForm({
      judul: a.judul, tgl_rapat: (a.tgl_rapat || '').slice(0, 10), jam_rapat: a.jam_rapat || '',
      lokasi: a.lokasi || '', link_video: a.link_video || '', peserta: a.peserta || '',
      topik: a.topik || '', hasil: a.hasil || '', status_surat: a.status_surat || 'Belum Dibuat',
      nomor_surat: a.nomor_surat || '', reminder_hari: a.reminder_hari ?? 1, status: a.status || 'Terjadwal',
    });
    setAgendaModal(true);
  }

  function setAgenda(k, v) {
    setAgendaForm((prev) => ({ ...prev, [k]: v }));
  }

  async function submitAgenda(e) {
    e.preventDefault();
    setAgendaSaving(true);
    try {
      if (agendaEditId) {
        await updateAgenda(agendaEditId, agendaForm);
        setMsg('Agenda rapat diperbarui.');
      } else {
        await storeAgenda(id, agendaForm);
        setMsg('Agenda rapat berhasil ditambahkan.');
      }
      setAgendaModal(false);
      setProj(await getProject(id));
      setTimeout(() => setMsg(null), 3000);
    } catch (er) { alert(er.message); } finally { setAgendaSaving(false); }
  }

  async function handleAgendaDelete(agId) {
    if (!confirm('Hapus agenda rapat ini?')) return;
    try {
      await deleteAgenda(agId);
      setProj(await getProject(id));
      setMsg('Agenda rapat dihapus.');
      setTimeout(() => setMsg(null), 3000);
    } catch (er) { alert(er.message); }
  }

  async function handleIKDelete(ikId) {
    if (!confirm('Hapus instruksi kerja ini?')) return;
    try {
      await deleteInstruksiKerja(ikId);
      setProj(await getProject(id));
      setMsg('Instruksi kerja dihapus.');
      setTimeout(() => setMsg(null), 3000);
    } catch (er) { alert(er.message); }
  }

  async function handleBoqFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setBoqBusy(true);
    setBoqMsg(null);
    try {
      const rows = await readSheet(file);
      const items = parseBoqExcel(rows);
      if (items.length === 0) {
        setBoqMsg('Tidak ada baris item yang terbaca. Pastikan file Excel berisi kolom Uraian, Satuan, Volume, dan Harga Satuan.');
      } else {
        const msByName = {};
        (proj.milestones || []).forEach((m) => { msByName[String(m.nama).toLowerCase().trim()] = m.id; });
        for (const it of items) {
          if (it.milestone) {
            const mid = msByName[String(it.milestone).toLowerCase().trim()];
            if (mid !== undefined) it.milestone_id = mid;
          }
          delete it.milestone;
          delete it.id;
        }
        const nama = file.name.replace(/\.[^.]+$/, '').trim() || 'BOQ Kontrak';
        const fresh = await storeBoqGroup(id, { nama, items });
        setProj(fresh);
        const groups = fresh.boqGroups || [];
        const newGroup = groups[groups.length - 1];
        setActiveBoqId(newGroup ? newGroup.id : null);
        setBoqItems(newGroup && newGroup.items.length ? newGroup.items : null);
        setBoqMsg(`BOQ "${nama}" berhasil disimpan otomatis (${items.length} item).`);
      }
    } catch (er) {
      setBoqMsg('Gagal simpan BOQ: ' + er.message);
    } finally {
      setBoqBusy(false);
    }
    e.target.value = '';
  }

  function selectBoqGroup(groupId) {
    const g = projBoqGroups.find((x) => x.id === groupId);
    setActiveBoqId(groupId || null);
    setBoqItems(groupId && g && g.items.length ? g.items : null);
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
    if (!activeBoqId || !boqItems || boqItems.length === 0) return;
    setBoqSaving(true);
    try {
      const fresh = await updateBoqGroup(id, activeBoqId, { items: boqItems });
      setProj(fresh);
      selectBoqGroup(activeBoqId);
      setMsg('Perubahan BOQ berhasil disimpan.');
      setBoqMsg(null);
      setTimeout(() => setMsg(null), 3000);
    } catch (er) { alert(er.message); } finally { setBoqSaving(false); }
  }

  async function handleBoqDelete(groupId) {
    const g = projBoqGroups.find((x) => x.id === groupId);
    if (!confirm(`Hapus BOQ "${g ? g.nama : ''}" beserta seluruh itemnya?`)) return;
    try {
      const fresh = await deleteBoqGroup(id, groupId);
      setProj(fresh);
      const groups = fresh.boqGroups || [];
      const nextId = groups.length ? groups[0].id : null;
      setActiveBoqId(nextId);
      setBoqItems(nextId && groups[0].items.length ? groups[0].items : null);
      setMsg('BOQ berhasil dihapus.');
      setTimeout(() => setMsg(null), 3000);
    } catch (er) { alert(er.message); }
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
              <span className="font-mono text-xs font-bold bg-slate-100 text-pln-navy border border-slate-200 px-2 py-0.5 rounded">{proj.kode}</span>
              <span className="text-xs text-slate-400">{tipeShort(proj.tipe)} &bull; {proj.tegangan}</span>
            </div>
            <h2 className="text-xl font-extrabold text-pln-navy leading-tight">{proj.nama}</h2>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1"><MapPin className="w-4 h-4 text-pln-blue" />{proj.lokasi}</span>
              <span className="inline-flex items-center gap-1"><Building2 className="w-4 h-4 text-pln-blue" />{proj.uip} {proj.upp ? `• ${proj.upp}` : ''}</span>
              <span className="inline-flex items-center gap-1"><UserRound className="w-4 h-4 text-pln-blue" />{proj.kontraktor}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={proj.status} className="text-sm px-3 py-1" />
            <Link to={`/projects/${id}/progress`} className="text-sm font-bold text-white bg-pln-blue rounded-lg px-3 py-2 hover:bg-pln-navy transition">Input Progres</Link>
            <Link to={`/projects/${id}/edit`} className="text-sm font-bold text-pln-navy border border-slate-300 rounded-lg px-3 py-2 hover:bg-slate-100 transition">
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
        <>
          <ProjectTimeline project={proj} />
          <Card className="p-5 mt-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-pln-navy">Amandemen / Perpanjangan Durasi</h3>
                <p className="text-xs text-slate-500 mt-0.5">Dokumen pengajuan perpanjangan durasi menggeser Target COD otomatis.</p>
              </div>
              {(isDalkon || isAdmin) && (
                <button onClick={() => setAmModal(true)} className="inline-flex items-center gap-1.5 text-xs font-bold bg-pln-blue text-white rounded-lg px-3 py-2 hover:bg-pln-navy transition shadow-sm">
                  <ScrollText className="w-4 h-4" /> Terbitkan Amandemen
                </button>
              )}
            </div>
            {(proj.amandements || []).length === 0 ? (
              <Empty message="Belum ada amandemen untuk proyek ini." />
            ) : (
              <div className="space-y-3">
                {(proj.amandements || []).map((a) => (
                  <div key={a.id} className="border border-pln-lightcyan bg-pln-lightcyan/30 rounded-lg p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-pln-blue">{a.nomor || 'Amandemen'}</span>
                        <BadgeIcon cls="bg-pln-lightcyan text-pln-blue border-pln-lightcyan">{a.jenis || 'Perpanjangan Waktu'}</BadgeIcon>
                        <span className="text-xs text-slate-500">oleh {a.created_by || '-'}</span>
                      </div>
                      <span className="text-xs font-bold text-amber-600">+{a.durasi_hari} hari</span>
                    </div>
                    <div className="grid md:grid-cols-3 gap-2 mt-2 text-xs text-slate-600">
                      <span>Target COD lama: <b className="text-red-600 line-through">{fmtDate(a.target_cod_lama)}</b></span>
                      <span>Target COD baru: <b className="text-emerald-600">{fmtDate(a.target_cod_baru)}</b></span>
                      <span>Selisih: <b>{fmtDate(a.target_cod_lama)} &rarr; {fmtDate(a.target_cod_baru)}</b></span>
                    </div>
                    {a.keterangan && <p className="mt-2 text-xs text-slate-600 bg-white/70 rounded-lg px-3 py-2">{a.keterangan}</p>}
                    {a.file && (
                      <a href={a.file} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-pln-cyan hover:underline">
                        <FileText className="w-3.5 h-3.5" /> Buka Dokumen
                      </a>
                    )}
                    {(isDalkon || isAdmin) && (
                      <button onClick={() => handleAmandemenDelete(a.id)} className="inline-flex items-center gap-1 mt-2 ml-3 text-xs font-bold text-red-500 border border-red-300 rounded-md px-2 py-1 hover:bg-red-500 hover:text-white transition">
                        Hapus
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {tab === 'Approval Drawing' && (
        <ApprovalDrawingList projectId={id} drawings={proj.drawings || []} onRefresh={() => getProject(id).then(setProj)} />
      )}

      {tab === 'Kurva S & Milestones' && (
        <Card className="p-5">
          <h3 className="font-bold text-pln-navy mb-1">Kurva S Proyek</h3>
          <p className="text-xs text-slate-500 mb-3">Timeline bulanan — rencana (Vendor) vs realisasi (Dalkon)</p>
          {scurveLabels.length > 0 ? (
            <div className="relative h-72 w-full">
              <Line data={sChart} options={{ maintainAspectRatio: false, responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { min: 0, max: 100 } } }} />
            </div>
          ) : <Empty message="Belum ada data Kurva S." />}

          <div className="flex flex-wrap gap-4 mt-4 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5"><i className="w-3 h-3 rounded-full inline-block" style={{ background: '#06336b' }} /> Rencana (dibuat Vendor)</span>
            <span className="inline-flex items-center gap-1.5"><i className="w-3 h-3 rounded-full inline-block" style={{ background: isDelayed ? '#ef4444' : '#06b6d4' }} /> Realisasi (dinput Dalkon)</span>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-4 py-3">Bulan (S-Curve)</th>
                  <th className="px-4 py-3 text-right">Rencana (%)</th>
                  <th className="px-4 py-3 text-right">Realisasi (%)</th>
                  <th className="px-4 py-3 text-right">Deviasi (pt)</th>
                  <th className="px-4 py-3">Diinput oleh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {proj.scurves.map((s) => {
                  const dev = s.realisasi !== null ? Math.round((Number(s.realisasi) - Number(s.rencana)) * 10) / 10 : null;
                  return (
                    <tr key={s.id ?? s.urutan} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-800">{s.minggu}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{Number(s.rencana)}%</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700">{s.realisasi !== null ? `${s.realisasi}%` : '-'}</td>
                      <td className="px-4 py-3 text-right">
                        {dev === null ? <span className="text-slate-300">-</span> : (
                          <span className={dev >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {dev > 0 ? '+' : ''}{dev}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <BadgeIcon cls={s.pembuat === 'dalkon' ? 'bg-cyan-100 text-cyan-800 border-cyan-300' : 'bg-pln-lightcyan text-pln-blue border-pln-lightcyan'}>
                          {s.pembuat === 'dalkon' ? 'Dalkon' : 'Vendor'}
                        </BadgeIcon>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-[11px] text-slate-400 mt-2">Maks 5% deviasi dianggap wajar; &lt; -5% proyek masuk status Critical.</p>
          </div>

          <h3 className="font-bold text-pln-navy mt-8 mb-3">Tahapan / Milestones</h3>
          {proj.milestones.length === 0 ? <Empty /> : (
            <div className="space-y-3">
              {proj.milestones.map((m, i) => (
                <div key={m.id} className="border border-slate-200 rounded-lg p-4">
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
            <button onClick={openKendalaAdd} className="inline-flex items-center gap-2 text-sm font-bold text-red-600 border border-red-300 rounded-lg px-3 py-2 hover:bg-red-600 hover:text-white transition">
              <AlertTriangle className="w-4 h-4" /> Lapor Kendala
            </button>
          </div>
          {proj.kendalas.length === 0 ? <Empty message="Belum ada kendala yang dilaporkan." /> : (
            <div className="space-y-3">
              {proj.kendalas.map((k) => (
                <div key={k.id} className="border border-red-200 rounded-lg p-4 bg-red-50/30">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-red-600">{k.kode_kendala}</span>
                      <span className="text-[11px] bg-red-100 text-red-700 px-2 py-0.5 rounded">{k.kategori}</span>
                      <span className="text-[11px] text-slate-500">{fmtDate(k.tgl_lapor)}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${k.pelapor === 'dalkon' ? 'bg-cyan-100 text-cyan-800' : 'bg-violet-100 text-violet-700'}`}>
                        {k.pelapor === 'dalkon' ? 'Dalkon' : 'Vendor'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        className="text-xs border border-slate-300 rounded-md px-2 py-1"
                        value={k.status}
                        onChange={(e) => handleStatusChange(k.id, e.target.value)}
                      >
                        <option value="Open">Open</option>
                        <option value="In Review">In Review</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                      <button onClick={() => openKendalaEdit(k)} className="text-xs font-bold text-pln-blue border border-pln-blue/30 rounded-md px-2 py-1 hover:bg-pln-lightcyan transition">Edit</button>
                      <button onClick={() => handleKendalaDelete(k.id)} className="text-xs font-bold text-red-500 border border-red-300 rounded-md px-2 py-1 hover:bg-red-500 hover:text-white transition">Hapus</button>
                    </div>
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
              <button onClick={openDokumentasiAdd} className="inline-flex items-center gap-1.5 text-xs font-bold text-pln-cyan border border-pln-cyan/40 rounded-lg px-3 py-2 hover:bg-pln-cyan hover:text-white transition">
                <Camera className="w-4 h-4" /> Unggah Foto Lapangan
              </button>
              <button onClick={openDokumentasiAdd} className="inline-flex items-center gap-1.5 text-xs font-bold bg-pln-blue text-white rounded-lg px-3 py-2 hover:bg-pln-navy transition shadow-sm">
                <FileText className="w-4 h-4" /> Unggah LK (Vendor)
              </button>
            </div>
          </div>
          {proj.dokumentasis.length === 0 ? <Empty message="Belum ada dokumentasi atau Laporan Konstruksi (LK)." /> : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {proj.dokumentasis.map((d) => (
                <div key={d.id} className="border border-slate-200 rounded-lg overflow-hidden group bg-white shadow-sm">
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
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => openDokumentasiEdit(d)} className="text-[11px] font-bold text-pln-blue border border-pln-blue/30 rounded-md px-2 py-1 hover:bg-pln-lightcyan transition">Edit</button>
                      <button onClick={() => handleDokumentasiDelete(d.id)} className="text-[11px] font-bold text-red-500 border border-red-300 rounded-md px-2 py-1 hover:bg-red-500 hover:text-white transition">Hapus</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'Agenda Rapat' && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-bold text-pln-navy">Agenda &amp; Jadwal Rapat</h3>
              <p className="text-xs text-slate-500 mt-0.5">Jadwal rapat koordinasi kontrak ini, status surat undangan AMS, dan pengingat.</p>
            </div>
            <button onClick={openAgendaAdd} className="inline-flex items-center gap-1.5 text-xs font-bold bg-pln-blue text-white rounded-lg px-3 py-2 hover:bg-pln-navy transition shadow-sm">
              <CalendarDays className="w-4 h-4" /> Tambah Agenda
            </button>
          </div>

          {(proj.agendas || []).length === 0 ? <Empty message="Belum ada agenda rapat untuk kontrak ini." /> : (
            <div className="space-y-3">
              {(proj.agendas || []).map((a) => (
                <div key={a.id} className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-pln-blue bg-pln-lightcyan px-2 py-0.5 rounded">
                          <CalendarDays className="w-3.5 h-3.5" /> {fmtDate(a.tgl_rapat)}
                        </span>
                        {a.jam_rapat && <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Clock className="w-3.5 h-3.5" /> {a.jam_rapat}</span>}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${a.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' : a.status === 'Dibatalkan' ? 'bg-red-100 text-red-700' : 'bg-cyan-100 text-cyan-800'}`}>{a.status}</span>
                      </div>
                      <div className="font-bold text-sm text-slate-800 mt-1">{a.judul}</div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 mt-1.5">
                        {a.lokasi && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {a.lokasi}</span>}
                        {a.peserta && <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" /> {a.peserta}</span>}
                        {a.reminder_hari != null && <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> Pengingat H-{a.reminder_hari}</span>}
                      </div>
                      {a.topik && <p className="text-xs text-slate-600 mt-2">{a.topik}</p>}
                      {a.hasil && <div className="mt-2 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-3 py-2">{a.hasil}</div>}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <span className={`text-[11px] font-bold px-2 py-1 rounded ${a.status_surat === 'Sudah Dibuat di AMS' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {a.status_surat === 'Sudah Dibuat di AMS' ? 'Surat AMS ✓' : 'Surat AMS ✗'}
                        </span>
                        {a.nomor_surat && <span className="text-[10px] text-slate-400 font-mono">{a.nomor_surat}</span>}
                      </div>
                      <div className="flex gap-2">
                        {a.link_video && <a href={a.link_video} target="_blank" rel="noreferrer" className="text-xs font-bold text-pln-cyan border border-pln-cyan/40 rounded-lg px-2.5 py-1 hover:bg-pln-cyan hover:text-white transition">Link</a>}
                        <button onClick={() => openAgendaEdit(a)} className="text-xs font-bold text-pln-blue border border-pln-blue/30 rounded-lg px-2.5 py-1 hover:bg-pln-lightcyan transition">Edit</button>
                        <button onClick={() => handleAgendaDelete(a.id)} className="text-xs font-bold text-red-500 border border-red-300 rounded-lg px-2.5 py-1 hover:bg-red-500 hover:text-white transition">Hapus</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'Instruksi Kerja' && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-bold text-pln-navy">Instruksi Kerja</h3>
              <p className="text-xs text-slate-500 mt-0.5">Unggah dokumen instruksi kerja / surat perintah kerja (SPK) oleh Vendor</p>
            </div>
            {(isVendor || isAdmin) && (
              <button onClick={openIKAdd} className="inline-flex items-center gap-1.5 text-xs font-bold bg-pln-blue text-white rounded-lg px-3 py-2 hover:bg-pln-navy transition shadow-sm">
                <ClipboardList className="w-4 h-4" /> Unggah Instruksi Kerja
              </button>
            )}
          </div>
          {(proj.instruksiKerja || []).length === 0 ? <Empty message="Belum ada instruksi kerja yang diunggah." /> : (
            <div className="space-y-3">
              {(proj.instruksiKerja || []).map((ik) => (
                <div key={ik.id} className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-lg bg-pln-lightcyan flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-pln-blue" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-slate-800">{ik.judul}</div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 mt-1">
                        {ik.nomor_instruksi && <span className="font-mono font-bold text-pln-blue">{ik.nomor_instruksi}</span>}
                        <span>{ik.jenis || 'Instruksi Kerja'}</span>
                        <span>{fmtDate(ik.tgl)}</span>
                      </div>
                      {ik.keterangan && <div className="text-xs text-slate-600 mt-1.5">{ik.keterangan}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a href={ik.file} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-pln-cyan border border-pln-cyan/40 rounded-lg px-3 py-1.5 hover:bg-pln-cyan hover:text-white transition">
                      <FileText className="w-3.5 h-3.5" /> Buka File
                    </a>
                    {(isVendor || isAdmin) && (
                      <>
                        <button onClick={() => openIKEdit(ik)} className="text-xs font-bold text-pln-blue border border-pln-blue/30 rounded-lg px-3 py-1.5 hover:bg-pln-lightcyan transition">
                          Edit
                        </button>
                        <button onClick={() => handleIKDelete(ik.id)} className="text-xs font-bold text-red-500 border border-red-300 rounded-lg px-3 py-1.5 hover:bg-red-500 hover:text-white transition">
                          Hapus
                        </button>
                      </>
                    )}
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
                <Row k="Tanggal Kontrak" v={fmtDate(proj.tgl_kontrak)} />
                <Row k="Nomor SPMK" v={proj.nomor_spmk || '-'} />
                <Row k="Nilai Kontrak" v={formatNilaiKontrak(proj.nilai_kontrak)} />
                <Row k="Kontraktor" v={proj.kontraktor} />
                <Row k="Penyerapan" v={`${proj.penyerapan_anggaran}%`} />
                <Row k="Tanggal Mulai Kerja (SPMK)" v={fmtDate(proj.tgl_mulai)} />
                <Row k="Target COD" v={fmtDate(proj.target_cod)} />
                <Row k="Akhir Masa Garansi" v={fmtDate(proj.tgl_selesai_garansi)} />
                <Row k="Barang Dicek" v={proj.barang_dicek ? 'Sudah melalui checking' : 'Belum'} />
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
                <Row k="Status" v={proj.status} />
              </dl>
              <div className="mt-4">
                <div className="text-xs font-bold text-slate-600 mb-1">Daftar Lokasi ({proj.lokasis?.length || 0})</div>
                {proj.lokasis && proj.lokasis.length ? (
                  <ul className="space-y-1.5">
                    {proj.lokasis.map((l) => (
                      <li key={l.id ?? l.urutan} className="text-xs bg-slate-50 rounded-lg px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-slate-700">{l.nama}</span>
                        <span className="text-slate-400 font-mono">
                          {l.latitude && l.longitude ? `${l.latitude}, ${l.longitude}` : 'Tanpa koordinat'}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-slate-400">-</p>}
              </div>
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
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="text-[11px] text-slate-500 mb-3">
                  Per termin: <b>nominal = progres fisik (%) &times; 95% &times; nilai kontrak</b>. Sisanya 5% ditahan sebagai retensi pemeliharaan hingga BAST 2 (sesuai revisi kontrak).
                </p>
                <div className="overflow-x-auto">
                {terminBayars.length === 0 ? <Empty message="Belum ada data termin bayar." /> : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-left text-xs uppercase tracking-wider text-slate-600">
                      <tr>
                        <th className="px-4 py-3">No</th>
                        <th className="px-4 py-3">Termin</th>
                        <th className="px-4 py-3 text-right">Progres Fisik (%)</th>
                        <th className="px-4 py-3 text-right">Nominal</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Terbayar (Bulan)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {terminBayars.map((t, i) => (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-800">{t.nama}</span>
                            {/retensi/i.test(t.nama) && (
                              <span className="ml-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">Retensi 5%</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">{t.progres_fisik !== null && t.progres_fisik !== undefined ? `${Number(t.progres_fisik)}%` : '-'}</td>
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
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Kendala modal */}
      {kModal && <Modal title={kEditId ? 'Edit Kendala' : 'Lapor Kendala Lapangan'} onClose={() => setKModal(false)}>
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
            <button className="px-4 py-2 text-sm font-bold bg-red-600 text-white rounded-lg">{kEditId ? 'Simpan Perubahan' : 'Laporkan'}</button>
          </div>
        </form>
      </Modal>}

      {/* Dokumentasi modal */}
      {dModal && <Modal title={dEditId ? 'Edit Dokumentasi' : 'Unggah Dokumentasi'} onClose={() => setDModal(false)}>
        <form onSubmit={submitDokumentasi} className="space-y-3">
          <Field label="Judul" required>
            <input className={inputCls} value={dForm.judul} onChange={(e) => setDForm({ ...dForm, judul: e.target.value })} />
          </Field>
          <Field label="Tahap" required>
            <select className={inputCls} value={dForm.tahap} onChange={(e) => setDForm({ ...dForm, tahap: e.target.value })}>
              {TAHAP_LIST.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="URL Foto / File PDF" hint="Tempel URL gambar atau link file PDF (mis. link Google Drive).">
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

      {/* Instruksi Kerja modal */}
      {ikModal && <Modal title={ikEditId ? 'Edit Instruksi Kerja' : 'Unggah Instruksi Kerja (Vendor)'} onClose={() => setIKModal(false)}>
        <form onSubmit={submitInstruksi} className="space-y-3">
          <Field label="Judul Instruksi" required>
            <input className={inputCls} value={ikForm.judul} onChange={(e) => setIKForm({ ...ikForm, judul: e.target.value })} placeholder="cth: SPK Pembangunan GI Serpong II" />
          </Field>
          <Field label="Nomor Instruksi / SPK">
            <input className={inputCls} value={ikForm.nomor_instruksi} onChange={(e) => setIKForm({ ...ikForm, nomor_instruksi: e.target.value })} placeholder="cth: IK/2024/UIP-JBB/001" />
          </Field>
          <Field label="Jenis">
            <select className={inputCls} value={ikForm.jenis} onChange={(e) => setIKForm({ ...ikForm, jenis: e.target.value })}>
              <option value="Instruksi Kerja">Instruksi Kerja</option>
              <option value="Surat Perintah Kerja (SPK)">Surat Perintah Kerja (SPK)</option>
              <option value="Gambar Kerja (Shop Drawing)">Gambar Kerja (Shop Drawing)</option>
              <option value="Metode Pelaksanaan">Metode Pelaksanaan</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </Field>
          <Field label="File Instruksi" hint="Unggah file (PDF/gambar), atau kosongkan untuk memakai file contoh.">
            <input type="file" accept=".pdf,image/*" className={inputCls} onChange={handleIKFile} />
            {ikForm.file && (
              <div className="mt-2 text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> File siap diunggah
              </div>
            )}
          </Field>
          <Field label="Keterangan">
            <textarea className={inputCls} rows={2} value={ikForm.keterangan} onChange={(e) => setIKForm({ ...ikForm, keterangan: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIKModal(false)} className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600">Batal</button>
            <button className="px-4 py-2 text-sm font-bold bg-pln-cyan text-white rounded-lg">Simpan</button>
          </div>
        </form>
      </Modal>}

      {/* Amandemen modal */}
      {amModal && <Modal title="Terbitkan Amandemen (Perpanjangan Durasi)" onClose={() => setAmModal(false)}>
        <form onSubmit={submitAmandemen} className="space-y-3">
          <p className="text-xs text-slate-500 bg-pln-lightcyan/50 border border-pln-lightcyan rounded-lg px-3 py-2">
            Mengesahkan perpanjangan durasi akan <b>menggeser Target COD</b> proyek dari {fmtDate(proj.target_cod)} sesuai jumlah hari tambahan.
          </p>
          <Field label="Nomor Amandemen">
            <input className={inputCls} value={amForm.nomor} onChange={(e) => setAmForm({ ...amForm, nomor: e.target.value })} placeholder="cth: AD/002/UIP-JBB/2024" />
          </Field>
          <Field label="Penambahan Durasi (hari)" required>
            <input className={inputCls} type="number" min="1" value={amForm.durasi_hari} onChange={(e) => setAmForm({ ...amForm, durasi_hari: e.target.value })} />
          </Field>
          <Field label="Keterangan / Alasan" required>
            <textarea className={inputCls} rows={3} value={amForm.keterangan} onChange={(e) => setAmForm({ ...amForm, keterangan: e.target.value })} placeholder="cth: Keterlambatan pembebasan lahan ROW di ruas Cibinong..." />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setAmModal(false)} className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600">Batal</button>
            <button type="submit" disabled={amSaving} className="px-4 py-2 text-sm font-bold bg-pln-blue text-white rounded-lg disabled:opacity-50">
              {amSaving ? 'Menerbitkan...' : 'Terbitkan Amandemen'}
            </button>
          </div>
        </form>
      </Modal>}

      {/* Agenda Rapat modal */}
      {agendaModal && <Modal title={agendaEditId ? 'Edit Agenda Rapat' : 'Tambah Agenda Rapat'} onClose={() => setAgendaModal(false)}>
        <form onSubmit={submitAgenda} className="space-y-3">
          <Field label="Pokok / Topik Rapat" required>
            <input className={inputCls} value={agendaForm.judul} onChange={(e) => setAgenda('judul', e.target.value)} placeholder="cth: Rapat Koordinasi Mingguan Progres Konstruksi" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tanggal Rapat" required>
              <input type="date" className={inputCls} value={agendaForm.tgl_rapat} onChange={(e) => setAgenda('tgl_rapat', e.target.value)} />
            </Field>
            <Field label="Jam">
              <input type="time" className={inputCls} value={agendaForm.jam_rapat} onChange={(e) => setAgenda('jam_rapat', e.target.value)} />
            </Field>
          </div>
          <Field label="Lokasi Rapat">
            <input className={inputCls} value={agendaForm.lokasi} onChange={(e) => setAgenda('lokasi', e.target.value)} placeholder="cth: Ruang Rapat UPP JBB 1 / Online" />
          </Field>
          <Field label="Link Video Conference">
            <input className={inputCls} value={agendaForm.link_video} onChange={(e) => setAgenda('link_video', e.target.value)} placeholder="https://..."
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); return; } }} />
          </Field>
          <Field label="Peserta">
            <input className={inputCls} value={agendaForm.peserta} onChange={(e) => setAgenda('peserta', e.target.value)} placeholder="cth: Dalkon, Vendor, Tim Engineering" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status Surat Undangan (AMS)" required>
              <select className={inputCls} value={agendaForm.status_surat} onChange={(e) => setAgenda('status_surat', e.target.value)}>
                {AGENDA_SURAT_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Nomor Surat">
              <input className={inputCls} value={agendaForm.nomor_surat} onChange={(e) => setAgenda('nomor_surat', e.target.value)} placeholder="cth: UND/2024/UIP-JBB1/088" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pengingat (H-berapa hari)">
              <input type="number" min="0" className={inputCls} value={agendaForm.reminder_hari} onChange={(e) => setAgenda('reminder_hari', e.target.value)} />
            </Field>
            <Field label="Status">
              <select className={inputCls} value={agendaForm.status} onChange={(e) => setAgenda('status', e.target.value)}>
                {AGENDA_STATUS_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Agenda / Substansi Bahasan">
            <textarea className={inputCls} rows={2} value={agendaForm.topik} onChange={(e) => setAgenda('topik', e.target.value)} />
          </Field>
          <Field label="Hasil / Notulen Rapat">
            <textarea className={inputCls} rows={2} value={agendaForm.hasil} onChange={(e) => setAgenda('hasil', e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setAgendaModal(false)} className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600">Batal</button>
            <button type="submit" disabled={agendaSaving} className="px-4 py-2 text-sm font-bold bg-pln-blue text-white rounded-lg disabled:opacity-50">
              {agendaSaving ? 'Menyimpan...' : agendaEditId ? 'Simpan Perubahan' : 'Simpan Agenda'}
            </button>
          </div>
        </form>
      </Modal>}

      {tab === 'BOQ Kontrak' && (
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="font-bold text-pln-navy">BOQ Kontrak</h3>
              <p className="text-xs text-slate-500 mt-0.5">Unggah file Excel BOQ (Bill of Quantities). Setiap upload tersimpan otomatis sebagai satu dokumen BOQ baru (1 proyek bisa banyak BOQ).</p>
            </div>
            <label className="text-sm font-bold bg-pln-cyan text-white rounded-lg px-4 py-2 cursor-pointer hover:bg-cyan-500 transition inline-flex items-center gap-1.5">
              <UploadIcon /> Unggah File Excel BOQ
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleBoqFile} disabled={boqBusy || boqSaving} />
            </label>
          </div>

          {boqRealPct !== null && boqsArr.length > 0 && (
            <div className="mb-4 rounded-lg border border-pln-lightcyan bg-pln-lightcyan/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-pln-blue mb-1">Selaras BOQ vs Kurva S</div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <span className="text-slate-600">Realisasi tertimbang BOQ: <b className="text-pln-navy">{boqRealPct}%</b></span>
                    <span className="text-slate-600">Realisasi fisik (Kurva S): <b className="text-pln-navy">{proj.progres_realisasi}%</b></span>
                    <span className={`text-slate-600 font-semibold ${Math.abs(boqSelisih) > 5 ? 'text-red-600' : 'text-emerald-600'}`}>
                      Selisih: {Math.abs(boqSelisih) > 5 ? 'PERLU DILURUSKAN (' : 'Selaras ('}{boqSelisih > 0 ? '+' : ''}{boqSelisih} pt)
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-slate-500 italic">Isi kolom progres per item BOQ agar realisasi fisik tertimbang mendekati Kurva S.</span>
              </div>
            </div>
          )}

          {boqBusy && (
            <div className="mb-4 rounded-lg border border-pln-lightcyan bg-pln-lightcyan/50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-pln-blue mb-2">
                <Spinner show /> Membaca file Excel & menyimpan BOQ otomatis...
              </div>
              <ProgressBar value={100} status="In Progress" />
            </div>
          )}

          {boqMsg && !boqBusy && <div className="mb-4 bg-pln-lightcyan/70 border border-pln-lightcyan text-pln-blue px-4 py-3 rounded-lg text-sm">{boqMsg}</div>}

          {projBoqGroups.length === 0 ? (
            <Empty message="Belum ada BOQ. Unggah file Excel .xlsx untuk menyimpan dokumen BOQ pertama." />
          ) : (
            <div>
              <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {projBoqGroups.map((g) => {
                  const gItems = g.items || [];
                  const gTotal = gItems.reduce((s, it) => s + (Number(it.volume) || 0) * (Number(it.harga_satuan) || 0), 0);
                  const isActive = g.id === activeBoqId;
                  return (
                    <div key={g.id}
                      className={`rounded-lg border p-3 cursor-pointer transition ${isActive ? 'border-pln-cyan bg-pln-lightcyan/40' : 'border-slate-200 hover:border-pln-lightcyan'}`}
                      onClick={() => selectBoqGroup(g.id)}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-bold text-pln-navy truncate">{g.nama}</div>
                        <button type="button" title="Hapus BOQ" onClick={(e) => { e.stopPropagation(); handleBoqDelete(g.id); }} className="text-red-400 hover:text-red-600 text-sm leading-none">&times;</button>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">{gItems.length} item · {formatNilaiKontrak(gTotal)}</div>
                      {g.tgl && <div className="text-[11px] text-slate-400">{fmtDate(g.tgl)}</div>}
                    </div>
                  );
                })}
              </div>

              {boqItems === null ? (
                <Empty message="Pilih salah satu BOQ di atas untuk melihat & mengedit daftar itemnya." />
              ) : (
              <div>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-left text-xs uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="px-3 py-3 w-10">No</th>
                      <th className="px-3 py-3">Uraian Pekerjaan</th>
                      <th className="px-3 py-3 w-24">Satuan</th>
                      <th className="px-3 py-3 w-28 text-right">Volume</th>
                      <th className="px-3 py-3 w-40 text-right">Harga Satuan</th>
                      <th className="px-3 py-3 w-40 text-right">Total</th>
                      <th className="px-3 py-3 w-32 text-right">Bobot (%)</th>
                      <th className="px-3 py-3 w-28 text-right">Progres (%)</th>
                      <th className="px-3 py-3 w-44">Tahapan / Milestone</th>
                      <th className="px-3 py-3 w-40">Foto Vendor</th>
                      <th className="px-3 py-3 w-40">Foto Dalkon</th>
                      <th className="px-3 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
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
                        <td className="px-3 py-2 text-right font-semibold text-pln-navy whitespace-nowrap">
                          {bobotOf(it).toFixed(3)}%
                        </td>
                        <td className="px-3 py-2">
                          <input className={`${inputCls} text-right`} type="number" min="0" max="100" step="any"
                            value={it.progres ?? 0}
                            disabled={!isDalkon && !isAdmin}
                            onChange={(e) => handleBoqChange(i, 'progres', e.target.value)} />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className={`${inputCls} max-w-44`}
                            value={it.milestone_id ?? ''}
                            onChange={(e) => handleBoqChange(i, 'milestone_id', e.target.value === '' ? null : Number(e.target.value))}
                          >
                            <option value="">— Pilih tahapan —</option>
                            {(proj.milestones || []).map((m) => (
                              <option key={m.id} value={m.id}>{m.nama}</option>
                            ))}
                          </select>
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
                  <button type="button" onClick={handleBoqSave} disabled={boqSaving || boqItems.length === 0} className="px-4 py-2 text-sm font-bold bg-pln-cyan text-white rounded-lg hover:bg-cyan-500 transition disabled:opacity-50">
                    {boqSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </div>
              </div>
            )}
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

function normalizeHeader(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[^\w]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchCol(header) {
  const h = normalizeHeader(header);
  if (!h) return null;
  if (/(^| )uraian(\s|$)|uraian pekerjaan|pekerjaan$|^deskripsi/.test(h)) return 'uraian';
  if (/satuan|^unit|^sat$/.test(h)) return 'satuan';
  if (/volume|^vol\b|jumlah|qty|kuantitas/.test(h)) return 'volume';
  if (/harga satuan|harga per satuan|unit price|^harga(\s|$)/.test(h)) return 'harga_satuan';
  if (/progres|realisasi|^(%)|^%/.test(h)) return 'progres';
  if (/milestone|tahapan|tahap/.test(h)) return 'milestone';
  if (/^no\b|nomor/.test(h)) return 'no';
  return null;
}

function parseBoqExcel(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const headerRow = rows.find((r) => r && r.some((c) => c !== null && c !== undefined && String(c).trim() !== '')) || [];
  const cols = headerRow.map((c, i) => ({ i, key: matchCol(c) }));
  const map = {};
  cols.forEach((c) => { if (c.key && !map[c.key]) map[c.key] = c.i; });
  if (!('uraian' in map)) return [];
  const items = [];
  for (let ri = 1; ri < rows.length; ri++) {
    const r = rows[ri];
    if (!r) continue;
    const get = (k) => (k in map ? r[map[k]] : null);
    const uraian = String(get('uraian') ?? '').trim();
    if (!uraian || /^(total|sub total|subtotal|jumlah|jml|grand total|rekap|rangkuman|no)$/i.test(uraian)) continue;
    const num = (v) => {
      if (v === null || v === undefined || v === '') return null;
      const s = String(v).trim();
      if (s === '') return null;
      const n = Number(s);
      if (!isNaN(n)) return n;
      return Number(s.replace(/[^0-9.,-]/g, '').replace(/\./g, '').replace(/,/g, '.'));
    };
    const volume = num(get('volume'));
    const harga = num(get('harga_satuan'));
    const satuan = String(get('satuan') ?? '').trim().toUpperCase() || null;
    const progresRaw = num(get('progres'));
    let progres = progresRaw === null ? 0 : Math.min(100, Math.max(0, progresRaw));
    items.push({
      uraian,
      satuan: satuan || '',
      volume,
      harga_satuan: harga,
      total: volume !== null && harga !== null ? Math.round(volume * harga * 100) / 100 : null,
      progres,
      milestone: get('milestone') !== null ? String(get('milestone')).trim() : null,
      milestone_id: null,
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