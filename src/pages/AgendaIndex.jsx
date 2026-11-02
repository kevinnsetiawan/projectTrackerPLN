import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, FileText, Briefcase, Clock, RefreshCw, ListChecks, X, MapPin, PlusCircle, PencilRuler, Trash2, UserRound, PowerOff, MessageCircle } from 'lucide-react';
import { getAgendaRekap, listAgenda, listAgendaPics, storeAgendaUmum, updateAgenda, deleteAgenda } from '../api.js';
import { setPageTitle } from '../components/Layout.jsx';
import AgendaCalendar from '../components/AgendaCalendar.jsx';
import { can, getUser, ROLE_LABELS } from '../auth.js';
import { Card, Field, inputCls, Spinner, Empty, PageHeader, StatCard, StatusBadge, Modal } from '../components/ui.jsx';
import { fmtDate, pjFromOrganisasi, isAgendaPadam, padamWaktuRange, isAgendaPic } from '../utils.js';
import { TOPIC, useLive, useLiveStatus } from '../events.js';

// Halaman agenda dibuka langsung menampilkan kalender; rekap agenda
// (statistik, ringkasan, pratinjau WA, tabel detail) berada di bawahnya.

const emptyForm = () => ({
  judul: '', tgl_rapat: new Date().toISOString().slice(0, 10), jam_rapat: '', lokasi: '',
  link_video: '', peserta: '', topik: '', hasil: '', status_surat: '', nomor_surat: '',
  reminder_hari: 1, status: '', penanggung_jawab: '', pic_user_id: '',
  status_padam: 'Bukan Padam', jenis_padam: '', penyebab_padam: '',
  padam_mulai: '', padam_selesai: '', instruksi_kerja: '', rencana_kerja: '',
});

function splitPoints(text) {
  if (!text) return [];
  let parts = String(text).split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) {
    parts = String(text).split(';').map((s) => s.trim()).filter(Boolean);
  }
  return parts.length ? parts : [String(text).trim()];
}

export default function AgendaIndex() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [rek, setRek] = useState(null);
  const [selectedAgenda, setSelectedAgenda] = useState(null);
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState(null);
  const [notice, setNotice] = useState(null);
  const [syncedAt, setSyncedAt] = useState(null);
  const [live, setLive] = useState(true);
  const [pics, setPics] = useState([]);

  const periode = params.get('periode') || 'minggu';
  const tgl = params.get('tgl') || new Date().toISOString().slice(0, 10);
  const picScope = params.get('pic') === 'me' ? 'me' : 'all';
  const canManage = can('dalkon', 'admin');
  const user = getUser();

  function refresh() {
    return Promise.all([listAgenda({ periode, tgl }), getAgendaRekap({ periode, tgl })])
      .then(([list, rekap]) => { setData(list); setRek(rekap); setSyncedAt(new Date()); });
  }

  const reload = useCallback(() => {
    if (modal) return;
    refresh().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal, periode, tgl]);

  useEffect(() => {
    setPageTitle('Agenda Rapat & Rekap');
    refresh().catch((e) => setErr(e.message));
  }, [periode, tgl]);

  // Akun untuk pilihan PIC (hanya pengelola agenda yang butuh form).
  useEffect(() => {
    if (!canManage) return;
    listAgendaPics().then((r) => setPics(r.data || [])).catch(() => {});
  }, [canManage]);

  // Realtime: agenda baru dari dalkon langsung muncul di akun lain (staff).
  useLive(live ? [TOPIC.AGENDA] : [], reload);
  const liveState = useLiveStatus();

  // Tetap sinkron saat tab/browser dikembalikan ke depan.
  useEffect(() => {
    const pull = () => {
      if (document.visibilityState !== 'visible') return;
      reload();
    };
    window.addEventListener('focus', pull);
    document.addEventListener('visibilitychange', pull);
    return () => {
      window.removeEventListener('focus', pull);
      document.removeEventListener('visibilitychange', pull);
    };
  }, [reload]);

  function setParam(key, value) {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key);
    else next.set(key, value);
    setParams(next);
  }

  function setField(k, v) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function flash(msg) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  }

  function openCreate(dateStr) {
    const defaults = {
      status_surat: (data && data.suratStatuses && data.suratStatuses[0]) || 'Belum Dibuat',
      status: (data && data.statuses && data.statuses[0]) || 'Terjadwal',
      status_padam: (data && data.padamStatuses && data.padamStatuses[0]) || 'Bukan Padam',
    };
    setEditingId(null);
    setForm({
      ...emptyForm(),
      ...defaults,
      // Default PIC = pengguna yang membuat agenda, supaya langsung muncul di
      // filter "Rapat Saya" dan notifikasinya.
      penanggung_jawab: user?.nama || '',
      pic_user_id: user?.id || '',
      ...(dateStr ? { tgl_rapat: String(dateStr).slice(0, 10) } : {}),
    });
    setFormErr(null);
    setModal(true);
  }

  function openEdit(a) {
    setEditingId(a.id);
    setForm({
      judul: a.judul || '', tgl_rapat: (a.tgl_rapat || '').slice(0, 10), jam_rapat: (a.jam_rapat || '').slice(0, 5),
      lokasi: a.lokasi || '', link_video: a.link_video || '', peserta: a.peserta || '',
      topik: a.topik || '', hasil: a.hasil || '', status_surat: a.status_surat || '',
      nomor_surat: a.nomor_surat || '', reminder_hari: a.reminder_hari ?? 1, status: a.status || '',
      penanggung_jawab: a.penanggung_jawab || pjFromOrganisasi(a.project_organisasi),
      pic_user_id: a.pic_user_id ?? '',
      status_padam: a.status_padam || 'Bukan Padam', jenis_padam: a.jenis_padam || '',
      penyebab_padam: a.penyebab_padam || '', padam_mulai: a.padam_mulai || '',
      padam_selesai: a.padam_selesai || '', instruksi_kerja: a.instruksi_kerja || '', rencana_kerja: a.rencana_kerja || '',
    });
    setFormErr(null);
    setModal(true);
  }

  async function submitForm(e) {
    e.preventDefault();
    if (!form.judul.trim()) { setFormErr('Pokok / topik rapat wajib diisi.'); return; }
    setSaving(true);
    setFormErr(null);
    try {
      if (editingId) {
        await updateAgenda(editingId, form);
        flash('Agenda rapat berhasil diperbarui.');
      } else {
        await storeAgendaUmum(form);
        flash('Agenda rapat berhasil ditambahkan.');
      }
      setModal(false);
      await refresh();
    } catch (er) {
      setFormErr(er.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(a) {
    if (!confirm(`Hapus agenda rapat ini?\n\n${(a.judul || '').slice(0, 80)}`)) return;
    try {
      await deleteAgenda(a.id);
      await refresh();
      flash('Agenda rapat dihapus.');
    } catch (er) {
      flash({ err: er.message });
    }
  }

  if (err) return <div className="text-red-600 bg-red-50 border border-red-200 p-4 rounded-lg">{err}</div>;
  if (!data || !rek) return <Spinner show />;

  const allAgendas = data.data || [];
  const myAgendas = allAgendas.filter((a) => isAgendaPic(a, user));
  const visibleAgendas = picScope === 'me' ? myAgendas : allAgendas;
  const totalRapat = visibleAgendas.length;
  const statusOpts = data.statuses || [];
  const suratOpts = data.suratStatuses || [];
  const padamOpts = data.padamStatuses || ['Bukan Padam', 'Padam'];
  const jenisPadamOpts = data.jenisPadam || [];
  const umumLabel = data.umumLabel || 'UMUM';
  const padamCount = visibleAgendas.filter(isAgendaPadam).length;
  // Saran nama PJ dari agenda yang sudah ada, supaya penulisan konsisten
  // (nama yang beda sedikit = warna yang beda di kalender).
  const pjSuggestions = [...new Set(allAgendas.map((a) => (a.penanggung_jawab || '').trim()).filter(Boolean))].sort((x, y) => x.localeCompare(y, 'id'));

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Agenda Rapat & Rekap"
        subtitle="Jadwal rapat per kontrak, status surat undangan AMS, rekap mingguan/bulanan"
        actions={canManage && (
          <button
            onClick={() => openCreate()}
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-pln-blue text-white rounded-lg px-4 py-2 hover:bg-pln-navy transition shadow-sm"
          >
            <PlusCircle className="w-4 h-4" /> Tambah Agenda Rapat
          </button>
        )}
      />

      {notice && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${notice.err
          ? 'bg-red-50 text-red-700 border border-red-200'
          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
          {notice.err || notice}
        </div>
      )}

      {/* Kalender langsung tampil saat halaman Agenda dibuka. */}
      <div className="animate-fade-in mb-6">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <div>
            <h2 className="font-extrabold text-pln-navy text-base">Kalender Agenda Rapat</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Acuan tanggal {fmtDate(tgl)} &bull; {picScope === 'me'
                ? <>rapat dengan PIC <b className="text-pln-blue">{user?.nama || 'Anda'}</b></>
                : 'seluruh rapat'} &bull; klik tanggal untuk detail
            </p>
          </div>
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-sm" role="group" aria-label="Filter PIC rapat">
            <button
              type="button"
              onClick={() => setParam('pic', '')}
              className={`px-3 py-1.5 rounded-md text-2xs font-bold transition ${picScope === 'all' ? 'bg-pln-blue text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Semua Rapat <span className={`ml-0.5 ${picScope === 'all' ? 'text-white/80' : 'text-slate-400'}`}>{allAgendas.length}</span>
            </button>
            <button
              type="button"
              onClick={() => setParam('pic', 'me')}
              className={`px-3 py-1.5 rounded-md text-2xs font-bold transition ${picScope === 'me' ? 'bg-pln-blue text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Rapat Saya <span className={`ml-0.5 ${picScope === 'me' ? 'text-white/80' : 'text-slate-400'}`}>{myAgendas.length}</span>
            </button>
          </div>
        </div>

        <AgendaCalendar
          agendas={visibleAgendas}
          anchorDate={tgl}
          canManage={canManage}
          umumLabel={umumLabel}
          onAddOnDate={openCreate}
          onOpenAgenda={setSelectedAgenda}
          onEditAgenda={openEdit}
        />
      </div>

      {/* Filter periode/tanggal acuan (dipakai kalender & rekap di bawah). */}
      <Card className="p-4 mb-5">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <Field label="Periode">
              <select className={inputCls} value={periode} onChange={(e) => setParam('periode', e.target.value)}>
                <option value="minggu">Mingguan</option>
                <option value="bulan">Bulanan</option>
              </select>
            </Field>
          </div>
          <div>
            <Field label="Tanggal Acuan">
              <input type="date" className={inputCls} style={{ textAlign: 'left' }} value={tgl} onChange={(e) => setParam('tgl', e.target.value)} />
            </Field>
          </div>
          <div className="col-span-2 md:col-span-1 flex items-end gap-2">
            <button
              onClick={() => setParam('tgl', new Date().toISOString().slice(0, 10))}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 text-xs font-bold text-pln-blue border border-pln-blue/30 rounded-lg px-4 py-2 hover:bg-pln-lightcyan transition"
            >
              <RefreshCw className="w-4 h-4" /> Hari Ini
            </button>
            <button
              onClick={() => refresh().catch((e) => setErr(e.message))}
              title="Perbarui agenda sekarang"
              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-pln-blue border border-pln-blue/30 rounded-lg px-3 py-2 hover:bg-pln-lightcyan transition"
            >
              <RefreshCw className="w-4 h-4" /> Perbarui
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-200">
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={live}
              onChange={(e) => setLive(e.target.checked)}
              className="rounded border-slate-300 text-pln-blue focus:ring-pln-cyan"
            />
            Auto-perbarui realtime
          </label>
          <span className="inline-flex items-center gap-1.5 text-2xs text-slate-500">
            <span className={`w-2 h-2 rounded-full ${liveState === 'live' ? 'bg-emerald-500' : liveState === 'connecting' ? 'bg-amber-400' : 'bg-slate-300'}`} />
            {liveState === 'live' ? 'Realtime aktif' : liveState === 'connecting' ? 'Menghubungkan...' : 'Mode cadangan aktif'}
            {syncedAt && ` • sinkron ${syncedAt.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })}`}
          </span>
        </div>
      </Card>

      {/* Rekap agenda: statistik, ringkasan periode, pratinjau WA, dan tabel detail. */}
      <div className="animate-fade-in">
        <div className="flex items-center gap-2 mb-3">
          <ListChecks className="w-5 h-5 text-pln-blue" />
          <h2 className="font-extrabold text-pln-navy text-base">Rekap Agenda</h2>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <StatCard label="Total Agenda" value={totalRapat} icon={CalendarDays} accent="text-pln-blue" />
            <StatCard label="Rapat Terjadwal / Selesai" value={totalRapat} icon={Briefcase} accent="text-pln-cyan" />
            <StatCard label="Agenda Padam" value={padamCount} icon={PowerOff} accent="text-red-500" />
          </div>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-pln-blue" />
              <h3 className="font-bold text-pln-navy">Ringkasan Periode {periode === 'bulan' ? 'Bulanan' : 'Mingguan'}</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Pada acuan tanggal <b>{fmtDate(tgl)}</b>, tercatat <b className="text-pln-blue">{totalRapat} agenda rapat</b> yang terjadwal
              {padamCount > 0 && <> dan <b className="text-red-600">{padamCount} agenda padam</b> beserta detail instruksi &amp; rencana kerjanya</>}.
              {picScope === 'me'
                ? <> Tabel di bawah hanya menampilkan rapat dengan PIC <b className="text-pln-blue">{user?.nama || 'Anda'}</b>.</>
                : <> Tabel di bawah menampilkan daftar lengkap agenda.</>} Kalender di atas menampilkan jadwal per tanggal.
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="w-5 h-5 text-pln-blue" />
              <h3 className="font-bold text-pln-navy">Pratinjau Rekap WhatsApp</h3>
              <span className="text-3xs font-bold uppercase tracking-wider text-slate-400 ml-auto">
                {periode === 'bulan' ? 'Bulanan' : 'Mingguan'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-2">
              Isi pesan rekap yang dikirim ke grup WA — status <b className="text-red-600">PADAM</b> beserta instruksi &amp;
              rencana kerjanya ikut tercantum per agenda.
            </p>
            {picScope === 'me' && (
              <p className="text-3xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">
                Pratinjau ini mencakup seluruh agenda (tidak terfilter PIC) agar isi pesan WA tetap lengkap.
              </p>
            )}
            <pre className="whitespace-pre-wrap break-words text-2xs leading-relaxed text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono max-h-64 overflow-y-auto">
              {rek.text || 'Tidak ada rekap untuk periode ini.'}
            </pre>
          </Card>

          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-pln-blue" />
                <h3 className="font-bold text-pln-navy">Semua Agenda (Detail)</h3>
              </div>
              <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-sm" role="group" aria-label="Filter daftar rapat">
                <button
                  type="button"
                  onClick={() => setParam('pic', '')}
                  className={`px-2.5 py-1 rounded-md text-2xs font-bold transition ${picScope === 'all' ? 'bg-pln-blue text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setParam('pic', 'me')}
                  className={`px-2.5 py-1 rounded-md text-2xs font-bold transition ${picScope === 'me' ? 'bg-pln-blue text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  Rapat Saya
                </button>
              </div>
            </div>
            {visibleAgendas.length === 0 ? <Empty message={picScope === 'me' ? 'Belum ada agenda dengan PIC Anda. PIC dapat diatur saat menambah atau mengedit agenda.' : 'Belum ada agenda.'} /> : (
              <>
                {/* Mobile: kartu vertikal, semua info langsung terlihat tanpa geser layar */}
                <ul className="sm:hidden space-y-3">
                  {visibleAgendas.map((a) => (
                    <li key={a.id} className="border border-slate-200 rounded-xl p-3.5 bg-slate-50">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="text-xs text-slate-600">
                          <div className="font-bold text-pln-navy">{fmtDate(a.tgl_rapat)} &bull; {a.jam_rapat || '-'}</div>
                          {a.project_id ? (
                            <Link to={`/projects/${a.project_id}`} className="font-mono text-xs font-bold text-pln-blue hover:underline">{a.project_kode}</Link>
                          ) : (
                            <span className="font-mono text-xs font-bold text-slate-500">{umumLabel}</span>
                          )}
                          <div className="text-2xs text-slate-500 mt-0.5">{a.project_id ? a.project_nama : 'Umum / lintas kontrak'}</div>
                        </div>
                        <StatusBadge status={a.status} />
                      </div>

                      {a.lokasi && (
                        <div className="inline-flex items-center gap-1 text-2xs text-slate-500 mb-2">
                          <MapPin className="w-3 h-3" /> {a.lokasi}
                        </div>
                      )}
                      {(a.pic_nama || a.penanggung_jawab) && (
                        <div className="inline-flex items-center gap-1 text-3xs text-slate-500 mb-2">
                          <UserRound className="w-3 h-3" /> {a.pic_nama ? 'PIC' : 'PJ'}: {a.pic_nama || a.penanggung_jawab}
                        </div>
                      )}

                      <div className="mb-2">
                        <span className={`text-2xs font-bold px-2 py-0.5 rounded ${a.status_surat === 'Sudah Dibuat di AMS' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{a.status_surat}</span>
                        {isAgendaPadam(a) && (
                          <span className="ml-1.5 inline-flex items-center gap-1 text-2xs font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                            <PowerOff className="w-3 h-3" /> Padam
                          </span>
                        )}
                        {a.nomor_surat && <div className="text-3xs text-slate-400 mt-0.5">{a.nomor_surat}</div>}
                        {isAgendaPadam(a) && (a.jenis_padam || padamWaktuRange(a)) && (
                          <div className="text-3xs text-red-600 font-semibold mt-0.5">
                            {[a.jenis_padam, padamWaktuRange(a)].filter(Boolean).join(' • ')}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedAgenda(a)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-pln-blue border border-pln-blue/30 rounded-lg px-2.5 py-1.5 hover:bg-pln-lightcyan transition"
                        >
                          <FileText className="w-3.5 h-3.5" /> Pokok Rapat
                        </button>
                        {canManage && (
                          <>
                            <button
                              onClick={() => openEdit(a)}
                              title="Edit agenda"
                              className="inline-flex items-center gap-1 text-2xs font-bold text-pln-blue border border-pln-blue/30 rounded-lg px-2 py-1.5 hover:bg-pln-lightcyan transition"
                            >
                              <PencilRuler className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => handleDelete(a)}
                              title="Hapus agenda"
                              className="inline-flex items-center gap-1 text-2xs font-bold text-red-600 border border-red-200 rounded-lg px-2 py-1.5 hover:bg-red-50 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Hapus
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Desktop: tabel seperti sebelumnya */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-left text-xs uppercase tracking-wider text-slate-600 font-bold">
                    <tr>
                      <th scope="col" className="px-4 py-3">Tanggal / Jam</th>
                      <th scope="col" className="px-4 py-3">Proyek / Kontrak</th>
                      <th scope="col" className="px-4 py-3">Pokok Rapat</th>
                      <th scope="col" className="px-4 py-3">Lokasi</th>
                      <th scope="col" className="px-4 py-3">Surat AMS</th>
                      <th scope="col" className="px-4 py-3">Padam</th>
                      <th scope="col" className="px-4 py-3">Status</th>
                      {canManage && <th scope="col" className="px-4 py-3 text-right">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {visibleAgendas.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">{fmtDate(a.tgl_rapat)}<br /><span className="text-2xs text-slate-400">{a.jam_rapat || '-'}</span></td>
                        <td className="px-4 py-3">
                          {a.project_id ? (
                            <>
                              <Link to={`/projects/${a.project_id}`} className="font-mono text-xs font-bold text-pln-blue hover:underline">{a.project_kode}</Link>
                              <div className="text-2xs text-slate-500 max-w-52 truncate">{a.project_nama}</div>
                            </>
                          ) : (
                            <>
                              <span className="font-mono text-xs font-bold text-slate-500">{umumLabel}</span>
                              <div className="text-2xs text-slate-400 max-w-52 truncate">Umum / lintas kontrak</div>
                            </>
                          )}
                          {(a.pic_nama || a.penanggung_jawab) && (
                            <div className="inline-flex items-center gap-1 text-3xs text-slate-500 mt-0.5">
                              <UserRound className="w-3 h-3" /> {a.pic_nama ? 'PIC' : 'PJ'}: {a.pic_nama || a.penanggung_jawab}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setSelectedAgenda(a)}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-pln-blue hover:underline"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Lihat Pokok Rapat
                          </button>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{a.lokasi || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-2xs font-bold px-2 py-0.5 rounded ${a.status_surat === 'Sudah Dibuat di AMS' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{a.status_surat}</span>
                          {a.nomor_surat && <div className="text-3xs text-slate-400 mt-0.5">{a.nomor_surat}</div>}
                        </td>
                        <td className="px-4 py-3">
                          {isAgendaPadam(a) ? (
                            <div className="min-w-0">
                              <span className="inline-flex items-center gap-1 text-2xs font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                                <PowerOff className="w-3 h-3" /> Padam
                              </span>
                              <div className="text-3xs text-red-600 font-semibold mt-0.5 max-w-44">
                                {[a.jenis_padam, padamWaktuRange(a)].filter(Boolean).join(' • ')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-2xs text-slate-400">&mdash;</span>
                          )}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                        {canManage && (
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openEdit(a)}
                                title="Edit agenda"
                                className="inline-flex items-center gap-1 text-2xs font-bold text-pln-blue border border-pln-blue/30 rounded-lg px-2 py-1 hover:bg-pln-lightcyan transition"
                              >
                                <PencilRuler className="w-3.5 h-3.5" /> Edit
                              </button>
                              <button
                                onClick={() => handleDelete(a)}
                                title="Hapus agenda"
                                className="inline-flex items-center gap-1 text-2xs font-bold text-red-600 border border-red-200 rounded-lg px-2 py-1 hover:bg-red-50 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Hapus
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      {canManage && modal && (
        <Modal
          title={editingId ? 'Edit Agenda Rapat' : 'Tambah Agenda Rapat'}
          onClose={() => setModal(false)}
          size="max-w-2xl"
        >
          <form onSubmit={submitForm} className="space-y-3">
            {formErr && (
              <div className="px-3 py-2 rounded-lg text-xs bg-red-50 text-red-700 border border-red-200">
                {formErr}
              </div>
            )}

            {!editingId && (
              <p className="text-xs text-slate-500 bg-pln-lightcyan/50 border border-pln-lightcyan rounded-lg px-3 py-2">
                Agenda disimpan sebagai agenda <b>umum (lintas kontrak)</b>. Pilih <b>PIC</b> agar agenda masuk
                filter <b>Rapat Saya</b> dan notifikasi; kolom <b>PJ</b> menentukan warna label di kalender.
                Rapat yang terikat kontrak spesifik ditambahkan dari halaman detail proyek &rarr; tab
                <b> Agenda Rapat</b>, dan warnanya otomatis mengikuti <b>Organisasi Proyek</b> kontrak tersebut.
              </p>
            )}

            <Field label="Pokok / Topik Rapat" required>
              <input className={inputCls} value={form.judul} onChange={(e) => setField('judul', e.target.value)} placeholder="cth: Rapat Koordinasi Mingguan Progres Konstruksi" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Tanggal Rapat" required>
                <input type="date" className={inputCls} value={form.tgl_rapat} onChange={(e) => setField('tgl_rapat', e.target.value)} />
              </Field>
              <Field label="Jam">
                <input type="time" className={inputCls} value={form.jam_rapat} onChange={(e) => setField('jam_rapat', e.target.value)} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Lokasi Rapat">
                <input className={inputCls} value={form.lokasi} onChange={(e) => setField('lokasi', e.target.value)} placeholder="cth: Ruang Rapat UPP JBB 1 / Online" />
              </Field>
              <Field label="Link Video Conference">
                <input className={inputCls} value={form.link_video} onChange={(e) => setField('link_video', e.target.value)} placeholder="https://..." />
              </Field>
            </div>

            <Field label="Peserta">
              <input className={inputCls} value={form.peserta} onChange={(e) => setField('peserta', e.target.value)} placeholder="cth: Dalkon, Vendor, Tim Engineering" />
            </Field>

            <Field
              label="PIC (Akun Pengguna)"
              hint="Menentukan agenda muncul di filter 'Rapat Saya' dan notifikasi. Bila PJ di bawah kosong, nama PIC dipakai sebagai label PJ."
            >
              <select
                className={inputCls}
                value={form.pic_user_id}
                onChange={(e) => {
                  const v = e.target.value;
                  const picked = pics.find((u) => String(u.id) === String(v));
                  setForm((prev) => ({
                    ...prev,
                    pic_user_id: v,
                    penanggung_jawab: picked ? picked.nama : prev.penanggung_jawab,
                  }));
                }}
              >
                <option value="">— Semua / belum ditentukan —</option>
                {pics.map((u) => (
                  <option key={u.id} value={u.id}>{u.nama} — {ROLE_LABELS[u.role] || u.role}</option>
                ))}
              </select>
            </Field>

            <Field
              label="Penanggung Jawab (label PJ)"
              hint="Dipakai sebagai warna & label rapat di kalender. Terisi otomatis dari PIC, bisa disesuaikan (cth: Budi (PM Kontraktor))."
            >
              <input
                list="pj-suggestions"
                className={inputCls}
                value={form.penanggung_jawab}
                onChange={(e) => setField('penanggung_jawab', e.target.value)}
                placeholder="cth: Budi (PM Kontraktor) / Andi (Dalkon)"
              />
              <datalist id="pj-suggestions">
                {pjSuggestions.map((p) => <option key={p} value={p} />)}
              </datalist>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Status Surat Undangan (AMS)" required>
                <select className={inputCls} value={form.status_surat} onChange={(e) => setField('status_surat', e.target.value)}>
                  {suratOpts.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Nomor Surat">
                <input className={inputCls} value={form.nomor_surat} onChange={(e) => setField('nomor_surat', e.target.value)} placeholder="cth: UND/2024/UIP-JBB1/088" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Pengingat (H-berapa hari)">
                <input type="number" min="0" className={inputCls} value={form.reminder_hari} onChange={(e) => setField('reminder_hari', e.target.value)} />
              </Field>
              <Field label="Status">
                <select className={inputCls} value={form.status} onChange={(e) => setField('status', e.target.value)}>
                  {statusOpts.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>

            <Field
              label="Status Padam"
              hint="Pilih 'Padam' bila agenda ini terkait pengamanan padam — form detail instruksi & rencana kerja akan terbuka di bawah."
            >
              <select className={inputCls} value={form.status_padam} onChange={(e) => setField('status_padam', e.target.value)}>
                {padamOpts.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>

            {form.status_padam === 'Padam' && (
              <div className="border border-red-200 bg-red-50/60 rounded-xl p-3.5 space-y-3 animate-fade-in">
                <div className="flex items-center gap-1.5">
                  <PowerOff className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-extrabold text-red-700 uppercase tracking-wider">Detail Padam</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Jenis Padam">
                    <select className={inputCls} value={form.jenis_padam} onChange={(e) => setField('jenis_padam', e.target.value)}>
                      <option value="">— pilih jenis —</option>
                      {jenisPadamOpts.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Penyebab Padam">
                    <input className={inputCls} value={form.penyebab_padam} onChange={(e) => setField('penyebab_padam', e.target.value)} placeholder="cth: Pemeliharaan berkala TR-2" />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Waktu Mulai Padam">
                    <input type="datetime-local" className={inputCls} value={form.padam_mulai} onChange={(e) => setField('padam_mulai', e.target.value)} />
                  </Field>
                  <Field label="Waktu Pulih (Selesai)">
                    <input type="datetime-local" className={inputCls} value={form.padam_selesai} onChange={(e) => setField('padam_selesai', e.target.value)} />
                  </Field>
                </div>

                <Field label="Instruksi Kerja">
                  <textarea className={inputCls} rows={2} value={form.instruksi_kerja} onChange={(e) => setField('instruksi_kerja', e.target.value)} placeholder="cth: IK No. 045/PJ/JBB/2024 — uji absence voltage sebelum bekerja" />
                </Field>
                <Field label="Rencana Kerja">
                  <textarea className={inputCls} rows={2} value={form.rencana_kerja} onChange={(e) => setField('rencana_kerja', e.target.value)} placeholder="cth: Pembersihan isolator & pemeriksaan mekanisme CB dalam satu skedul padam" />
                </Field>
              </div>
            )}

            <Field label="Agenda / Substansi Bahasan">
              <textarea className={inputCls} rows={2} value={form.topik} onChange={(e) => setField('topik', e.target.value)} />
            </Field>
            <Field label="Hasil / Notulen Rapat">
              <textarea className={inputCls} rows={2} value={form.hasil} onChange={(e) => setField('hasil', e.target.value)} />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600">Batal</button>
              <button type="submit" disabled={saving} className="btn btn-primary btn-md">
                {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Agenda'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {selectedAgenda && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedAgenda(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-200">
              <div>
                <span className="text-3xs font-bold uppercase tracking-wider text-slate-400">Rincian Pokok Pembahasan</span>
                <h3 className="font-extrabold text-pln-navy text-base leading-snug mt-0.5">{selectedAgenda.project_kode || umumLabel} &bull; {fmtDate(selectedAgenda.tgl_rapat)}</h3>
              </div>
              <button
                onClick={() => setSelectedAgenda(null)}
                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              <ul className="space-y-2.5">
                {splitPoints(selectedAgenda.judul).map((pt, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-700 leading-relaxed">
                    <span className="text-pln-blue font-bold shrink-0">&bull;</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>

              {isAgendaPadam(selectedAgenda) && (
                <div className="mt-4 border border-red-200 bg-red-50/60 rounded-xl p-3.5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <PowerOff className="w-4 h-4 text-red-600" />
                    <span className="text-3xs font-extrabold text-red-700 uppercase tracking-wider">Detail Padam</span>
                  </div>
                  <dl className="space-y-1.5 text-xs text-slate-700">
                    {selectedAgenda.jenis_padam && (
                      <div className="flex gap-2"><dt className="w-28 shrink-0 font-bold text-slate-500">Jenis</dt><dd>{selectedAgenda.jenis_padam}</dd></div>
                    )}
                    {padamWaktuRange(selectedAgenda) && (
                      <div className="flex gap-2"><dt className="w-28 shrink-0 font-bold text-slate-500">Waktu</dt><dd className="text-red-700 font-semibold">{padamWaktuRange(selectedAgenda)}</dd></div>
                    )}
                    {selectedAgenda.penyebab_padam && (
                      <div className="flex gap-2"><dt className="w-28 shrink-0 font-bold text-slate-500">Penyebab</dt><dd>{selectedAgenda.penyebab_padam}</dd></div>
                    )}
                    {selectedAgenda.instruksi_kerja && (
                      <div className="flex gap-2"><dt className="w-28 shrink-0 font-bold text-slate-500">Instruksi Kerja</dt><dd className="whitespace-pre-wrap">{selectedAgenda.instruksi_kerja}</dd></div>
                    )}
                    {selectedAgenda.rencana_kerja && (
                      <div className="flex gap-2"><dt className="w-28 shrink-0 font-bold text-slate-500">Rencana Kerja</dt><dd className="whitespace-pre-wrap">{selectedAgenda.rencana_kerja}</dd></div>
                    )}
                  </dl>
                </div>
              )}

              {canManage && (
                <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => { const a = selectedAgenda; setSelectedAgenda(null); openEdit(a); }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-pln-blue border border-pln-blue/30 rounded-lg px-3 py-2 hover:bg-pln-lightcyan transition"
                  >
                    <PencilRuler className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={async () => {
                      const a = selectedAgenda;
                      setSelectedAgenda(null);
                      await handleDelete(a);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 border border-red-200 rounded-lg px-3 py-2 hover:bg-red-50 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus Agenda
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}