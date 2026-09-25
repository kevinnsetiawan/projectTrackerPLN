import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, Send, FileText, Briefcase, Clock, CheckCircle2, XCircle, RefreshCw, LayoutGrid, ListChecks, MessageCircle, X, MapPin } from 'lucide-react';
import { getAgendaRekap, listAgenda, kirimAgendaWa } from '../api.js';
import { setPageTitle } from '../components/Layout.jsx';
import { can } from '../auth.js';
import { Card, Field, inputCls, Spinner, Empty, PageHeader, StatCard, StatusBadge } from '../components/ui.jsx';
import { fmtDate, uipShort } from '../utils.js';

const TABS = [
  { key: 'ringkasan', label: 'Ringkasan', icon: LayoutGrid },
  { key: 'periode', label: 'Per Periode', icon: CalendarDays },
  { key: 'semua', label: 'Semua Agenda', icon: ListChecks },
  { key: 'wa', label: 'Kirim WA', icon: MessageCircle },
];

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
  const [busy, setBusy] = useState(false);
  const [waMsg, setWaMsg] = useState(null);
  const [tab, setTab] = useState('ringkasan');
  const [selectedAgenda, setSelectedAgenda] = useState(null);

  const periode = params.get('periode') || 'minggu';
  const tgl = params.get('tgl') || new Date().toISOString().slice(0, 10);

  useEffect(() => {
    setPageTitle('Agenda Rapat & Rekap');
    Promise.all([listAgenda({ periode, tgl }), getAgendaRekap({ periode, tgl })])
      .then(([list, rekap]) => { setData(list); setRek(rekap); })
      .catch((e) => setErr(e.message));
  }, [periode, tgl]);

  function setParam(key, value) {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key);
    else next.set(key, value);
    setParams(next);
  }

  async function handleKirimWa() {
    setBusy(true);
    setWaMsg(null);
    try {
      const r = await kirimAgendaWa({ periode, tgl });
      setWaMsg(`Rekap berhasil dikirim ke grup WhatsApp.${r.fonnteId ? ' ID: ' + r.fonnteId : ''}`);
    } catch (e) {
      setWaMsg({ err: e.message });
    } finally {
      setBusy(false);
    }
  }

  if (err) return <div className="text-red-600 bg-red-50 border border-red-200 p-4 rounded-lg">{err}</div>;
  if (!data || !rek) return <Spinner show />;

  const periods = rek.groups || [];
  const totalRapat = periods.reduce((s, g) => s + g.total, 0);
  const totalSuratPending = periods.reduce((s, g) => s + g.suratPending, 0);
  const totalSuratDone = periods.reduce((s, g) => s + g.suratDone, 0);
  const canKirimWa = can('dalkon', 'admin');

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Agenda Rapat & Rekap"
        subtitle="Jadwal rapat per kontrak, status surat undangan AMS, rekap mingguan/bulanan"
      />

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
          <div className="col-span-2 md:col-span-1 flex items-end">
            <button
              onClick={() => setParam('tgl', new Date().toISOString().slice(0, 10))}
              className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 text-xs font-bold text-pln-blue border border-pln-blue/30 rounded-lg px-4 py-2 hover:bg-pln-lightcyan transition"
            >
              <RefreshCw className="w-4 h-4" /> Gunakan Hari Ini
            </button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 sm:inline-flex sm:flex-wrap gap-1.5 mb-5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-full sm:w-fit">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center justify-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-lg transition-all ${active
                ? 'bg-white text-pln-navy shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'ringkasan' && (
        <div className="space-y-5 animate-fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <StatCard label="Total Agenda" value={totalRapat} icon={CalendarDays} accent="text-pln-blue" />
            <StatCard label="Rapat Terjadwal / Selesai" value={totalRapat} icon={Briefcase} accent="text-pln-cyan" />
            <StatCard label="Surat AMS Siap" value={totalSuratDone} icon={CheckCircle2} accent="text-emerald-600" />
            <StatCard label="Surat AMS Belum" value={totalSuratPending} icon={XCircle} accent="text-red-600" />
          </div>

          {!rek.fonnteConfigured && (
            <div className="px-4 py-3 rounded-lg text-xs bg-amber-50 text-amber-700 border border-amber-200">
              Koneksi WhatsApp belum diatur. Isi <b>FONNTE_TOKEN</b> dan <b>FONNTE_TARGET</b> di file <code>.env</code> untuk mengaktifkan pengiriman rekap.
            </div>
          )}

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-pln-blue" />
              <h3 className="font-bold text-pln-navy">Ringkasan Periode {periode === 'bulan' ? 'Bulanan' : 'Mingguan'}</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Pada acuan tanggal <b>{fmtDate(tgl)}</b>, tercatat <b className="text-pln-blue">{totalRapat} agenda rapat</b> yang terjadwal.
              Dari jumlah tersebut, <b className="text-emerald-600">{totalSuratDone} surat AMS</b> sudah siap dan{' '}
              <b className="text-red-600">{totalSuratPending} surat</b> masih perlu ditindaklanjuti.
              Lihat tab <b>Per Periode</b> untuk rincian per kelompok, atau <b>Semua Agenda</b> untuk daftar lengkap.
            </p>
          </Card>
        </div>
      )}

      {tab === 'periode' && (
        <div className="animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="font-bold text-pln-navy">Rekap {periode === 'bulan' ? 'Bulanan' : 'Mingguan'}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Acuan tanggal {fmtDate(tgl)} &bull; geser ke samping untuk lihat kolom lain</p>
            </div>
            <span className="text-xs text-slate-400">{periods.length} kolom periode</span>
          </div>

          {periods.length === 0 ? (
            <Card className="p-5"><Empty message="Belum ada agenda pada periode ini." /></Card>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1">
              {periods.map((g) => (
                <div
                  key={g.key}
                  className="shrink-0 w-72 bg-slate-100 rounded-xl border border-slate-200 flex flex-col max-h-[70vh]"
                >
                  <div className="p-3 border-b border-slate-200">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-pln-navy">{g.label}</span>
                      <span className="text-[11px] font-bold text-slate-500 bg-white rounded-full px-2 py-0.5 border border-slate-200">
                        {g.total}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px]">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> {g.suratDone} siap
                      </span>
                      <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                        <XCircle className="w-3 h-3" /> {g.suratPending} belum
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                    {g.items.length === 0 ? (
                      <div className="text-center text-[11px] text-slate-400 py-6">Tidak ada agenda</div>
                    ) : (
                      g.items.map((a) => {
                        const topColor =
                          a.status === 'BAST 1' || a.status === 'BAST 2' ? 'bg-emerald-400' :
                            a.status === 'BASTB' ? 'bg-amber-400' : 'bg-cyan-400';
                        const amsDone = a.status_surat === 'Sudah Dibuat di AMS';
                        return (
                          <Link
                            key={a.id}
                            to={`/projects/${a.project_id}`}
                            className="block bg-white rounded-lg shadow-sm hover:shadow-md border border-slate-200 overflow-hidden transition-all hover:-translate-y-0.5"
                          >
                            <div className={`h-1.5 ${topColor}`} />
                            <div className="p-3">
                              <div className="font-semibold text-xs text-slate-800 leading-snug mb-1.5">
                                {a.judul}
                              </div>
                              <div className="text-[10px] text-slate-500 mb-2">
                                <span className="font-mono font-bold text-pln-blue">{a.project_kode}</span>
                                {' '}&middot; {uipShort(a.project_uip)}
                              </div>
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                                  <Clock className="w-3 h-3" /> {fmtDate(a.tgl_rapat)} {a.jam_rapat || ''}
                                </span>
                                <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${amsDone
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-red-100 text-red-700'
                                  }`}>
                                  {amsDone ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                                  AMS
                                </span>
                              </div>
                            </div>
                          </Link>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'semua' && (
        <Card className="p-5 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <ListChecks className="w-5 h-5 text-pln-blue" />
            <h3 className="font-bold text-pln-navy">Semua Agenda (Detail)</h3>
          </div>
          {data.data.length === 0 ? <Empty message="Belum ada agenda." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-left text-xs uppercase tracking-wider text-slate-600 font-bold">
                  <tr>
                    <th className="px-4 py-3">Tanggal / Jam</th>
                    <th className="px-4 py-3">Proyek / Kontrak</th>
                    <th className="px-4 py-3">Pokok Rapat</th>
                    <th className="px-4 py-3">Lokasi</th>
                    <th className="px-4 py-3">Surat AMS</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.data.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{fmtDate(a.tgl_rapat)}<br /><span className="text-[11px] text-slate-400">{a.jam_rapat || '-'}</span></td>
                      <td className="px-4 py-3">
                        <Link to={`/projects/${a.project_id}`} className="font-mono text-xs font-bold text-pln-blue hover:underline">{a.project_kode}</Link>
                        <div className="text-[11px] text-slate-500 max-w-52 truncate">{a.project_nama}</div>
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
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${a.status_surat === 'Sudah Dibuat di AMS' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{a.status_surat}</span>
                        {a.nomor_surat && <div className="text-[10px] text-slate-400 mt-0.5">{a.nomor_surat}</div>}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'wa' && (
        <div className="space-y-5 animate-fade-in">
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-pln-blue" />
                <h3 className="font-bold text-pln-navy">Pratinjau Pesan WhatsApp</h3>
              </div>
              {canKirimWa && (
                <button
                  onClick={handleKirimWa}
                  disabled={busy || !rek.fonnteConfigured}
                  className={`inline-flex items-center gap-1.5 text-xs font-bold rounded-lg px-4 py-2 transition shadow-sm ${rek.fonnteConfigured
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  title={rek.fonnteConfigured ? 'Kirim rekap ke grup WhatsApp' : 'Konfigurasi FONNTE_TOKEN & FONNTE_TARGET di .env terlebih dahulu'}
                >
                  <Send className="w-4 h-4" /> {busy ? 'Mengirim...' : 'Kirim ke WA Grup'}
                </button>
              )}
            </div>

            {waMsg && (
              <div className={`mb-3 px-4 py-3 rounded-lg text-sm ${waMsg.err
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                {waMsg.err || waMsg}
              </div>
            )}

            {!rek.fonnteConfigured && (
              <div className="mb-3 px-4 py-3 rounded-lg text-xs bg-amber-50 text-amber-700 border border-amber-200">
                Koneksi WhatsApp belum diatur. Isi <b>FONNTE_TOKEN</b> dan <b>FONNTE_TARGET</b> di file <code>.env</code> untuk mengaktifkan tombol kirim rekap.
              </div>
            )}

            <div className="bg-[#e5ddd5] rounded-lg p-4 sm:p-6">
              <div className="max-w-md ml-auto bg-[#dcf8c6] rounded-lg rounded-tr-none px-4 py-3 shadow-sm">
                <pre className="whitespace-pre-wrap text-xs leading-relaxed text-slate-800 font-sans">{rek.text}</pre>
                <div className="text-right text-[10px] text-slate-500 mt-1">Pratinjau &bull; belum terkirim</div>
              </div>
            </div>
          </Card>
        </div>
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
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rincian Pokok Pembahasan</span>
                <h3 className="font-extrabold text-pln-navy text-base leading-snug mt-0.5">{selectedAgenda.project_kode} &bull; {fmtDate(selectedAgenda.tgl_rapat)}</h3>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}