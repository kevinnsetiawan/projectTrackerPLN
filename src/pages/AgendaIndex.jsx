import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, Send, FileText, Briefcase, Clock, Users, MapPin, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { getAgendaRekap, listAgenda, kirimAgendaWa } from '../api.js';
import { setPageTitle } from '../components/Layout.jsx';
import { Card, Field, inputCls, Spinner, Empty, PageHeader, StatCard, StatusBadge } from '../components/ui.jsx';
import { fmtDate, uipShort } from '../utils.js';

export default function AgendaIndex() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [rek, setRek] = useState(null);
  const [busy, setBusy] = useState(false);
  const [waMsg, setWaMsg] = useState(null);

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

  if (err) return <div className="text-red-600 bg-red-50 p-4 rounded-lg">{err}</div>;
  if (!data || !rek) return <Spinner show />;

  const periods = rek.groups || [];
  const totalRapat = periods.reduce((s, g) => s + g.total, 0);
  const totalSuratPending = periods.reduce((s, g) => s + g.suratPending, 0);
  const totalSuratDone = periods.reduce((s, g) => s + g.suratDone, 0);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Agenda Rapat & Rekap"
        subtitle="Jadwal rapat per kontrak, status surat undangan AMS, rekap mingguan/bulanan"
        actions={
          <button
            onClick={handleKirimWa}
            disabled={busy || !rek.fonnteConfigured}
            className={`inline-flex items-center gap-1.5 text-xs font-bold rounded-lg px-4 py-2 transition shadow-sm ${
              rek.fonnteConfigured ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
            title={rek.fonnteConfigured ? 'Kirim rekap ke grup WhatsApp' : 'Konfigurasi FONNTE_TOKEN & FONNTE_TARGET di .env terlebih dahulu'}
          >
            <Send className="w-4 h-4" /> {busy ? 'Mengirim...' : 'Kirim ke WA Grup'}
          </button>
        }
      />

      <Card className="p-4 mb-5">
        <div className="grid md:grid-cols-3 gap-3">
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
              <input type="date" className={inputCls} value={tgl} onChange={(e) => setParam('tgl', e.target.value)} />
            </Field>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setParam('tgl', new Date().toISOString().slice(0, 10))}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-pln-blue border border-pln-blue/30 rounded-lg px-4 py-2 hover:bg-pln-lightcyan transition"
            >
              <RefreshCw className="w-4 h-4" /> Gunakan Hari Ini
            </button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-5">
        <StatCard label="Total Agenda" value={totalRapat} icon={CalendarDays} accent="text-pln-blue" />
        <StatCard label="Rapat Terjadwal / Selesai" value={totalRapat} icon={Briefcase} accent="text-pln-cyan" />
        <StatCard label="Surat AMS Siap" value={totalSuratDone} icon={CheckCircle2} accent="text-emerald-600" />
        <StatCard label="Surat AMS Belum" value={totalSuratPending} icon={XCircle} accent="text-red-600" />
      </div>

      {waMsg && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${waMsg.err ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
          {waMsg.err || waMsg}
        </div>
      )}

      {!rek.fonnteConfigured && (
        <div className="mb-4 px-4 py-3 rounded-lg text-xs bg-amber-50 text-amber-700 border border-amber-200">
          Koneksi WhatsApp belum diatur. Isi <b>FONNTE_TOKEN</b> dan <b>FONNTE_TARGET</b> di file <code>.env</code> untuk mengaktifkan tombol kirim rekap.
        </div>
      )}

      <Card className="p-5 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="font-bold text-pln-navy">Rekap {periode === 'bulan' ? 'Bulanan' : 'Mingguan'}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Acuan tanggal {fmtDate(tgl)}</p>
          </div>
          <span className="text-xs text-slate-400">{periods.length} kelompok periode</span>
        </div>

        {periods.length === 0 ? (
          <Empty message="Belum ada agenda pada periode ini." />
        ) : (
          <div className="space-y-4">
            {periods.map((g) => (
              <div key={g.key} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-pln-lightcyan/50 px-4 py-2.5">
                  <span className="font-bold text-sm text-pln-navy">{g.label}</span>
                  <span className="text-[11px] text-slate-500">
                    {g.total} rapat &middot; <b className="text-emerald-600">{g.suratDone}</b> AMS siap &middot; <b className="text-red-600">{g.suratPending}</b> belum
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {g.items.map((a) => (
                    <Link key={a.id} to={`/projects/${a.project_id}`} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 hover:bg-slate-50 transition">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] text-slate-400">{fmtDate(a.tgl_rapat)} {a.jam_rapat || ''}</span>
                          <StatusBadge status={a.status} />
                        </div>
                        <div className="font-semibold text-sm text-slate-800 mt-0.5">{a.judul}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          <span className="font-mono font-bold text-pln-blue">{a.project_kode}</span> &middot; {a.project_nama} &middot; {uipShort(a.project_uip)}
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded ${
                        a.status_surat === 'Sudah Dibuat di AMS' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {a.status_surat === 'Sudah Dibuat di AMS' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {a.status_surat}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-pln-blue" />
          <h3 className="font-bold text-pln-navy">Pratinjau Pesan WhatsApp</h3>
        </div>
        <pre className="whitespace-pre-wrap text-xs leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700">{rek.text}</pre>
      </Card>

      <Card className="p-5 mt-5">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-5 h-5 text-pln-blue" />
          <h3 className="font-bold text-pln-navy">Semua Agenda (Detail)</h3>
        </div>
        {data.data.length === 0 ? <Empty message="Belum ada agenda." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Tanggal / Jam</th>
                  <th className="px-4 py-3">Proyek / Kontrak</th>
                  <th className="px-4 py-3">Pokok Rapat</th>
                  <th className="px-4 py-3">Lokasi</th>
                  <th className="px-4 py-3">Surat AMS</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.data.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">{fmtDate(a.tgl_rapat)}<br /><span className="text-[11px] text-slate-400">{a.jam_rapat || '-'}</span></td>
                    <td className="px-4 py-3">
                      <Link to={`/projects/${a.project_id}`} className="font-mono text-xs font-bold text-pln-blue hover:underline">{a.project_kode}</Link>
                      <div className="text-[11px] text-slate-500 max-w-52 truncate">{a.project_nama}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{a.judul}</td>
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
    </div>
  );
}
