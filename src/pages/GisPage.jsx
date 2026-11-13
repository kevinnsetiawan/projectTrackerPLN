import React, { useCallback, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { setPageTitle } from '../components/Layout.jsx';
import { Card, Empty, Spinner, StatusBadge, inputCls } from '../components/ui.jsx';
import { canAction } from '../auth.js';
import { gisProjects } from '../api.js';
import { TOPIC, useLive } from '../events.js';
import 'leaflet/dist/leaflet.css';

function pinIcon(status) {
  const color = status === 'BAST 1' || status === 'BAST 2' ? 'green' : status === 'BASTB' ? 'amber' : 'red';
  return L.divIcon({
    className: '',
    html: `<div class="gis-pin ${color}"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function legendDotClass(status) {
  if (status === 'BAST 1' || status === 'BAST 2') return 'bg-emerald-500';
  if (status === 'BASTB') return 'bg-amber-500';
  return 'bg-cyan-500';
}

function progressBarColor(status) {
  if (status === 'BAST 1' || status === 'BAST 2') return 'bg-emerald-500';
  if (status === 'BASTB') return 'bg-amber-500';
  return 'bg-cyan-500';
}

const DEFAULT_TIPES = [
  'Gardu Induk (GI)',
  'GITET (Ekstra Tinggi)',
  'SUTT (Transmisi)',
  'SUTET (Transmisi 500 kV)',
  'SKTT (Kabel Tanah)',
  'Pembangkit EBT (PLTS)',
  'Pembangkit (PLTA/PLTU)',
  'Jaringan Distribusi (JTM/JTR)',
];

export default function GisPage() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [filters, setFilters] = useState({ uip: 'all', tipe: 'all', status: 'all' });
  const [meta, setMeta] = useState({ allUip: [], allTipe: DEFAULT_TIPES });

  const applyData = useCallback((rows, isUnfiltered) => {
    setData(rows);
    if (isUnfiltered && Array.isArray(rows)) {
      const uips = [...new Set(rows.map((r) => r.uip).filter(Boolean))].sort();
      const tipes = [...new Set([...DEFAULT_TIPES, ...rows.map((r) => r.tipe).filter(Boolean)])];
      setMeta({ allUip: uips, allTipe: tipes });
    }
  }, []);

  const reload = useCallback(() => {
    const unfiltered = filters.uip === 'all' && filters.tipe === 'all' && filters.status === 'all';
    gisProjects(filters).then((rows) => applyData(rows, unfiltered)).catch(() => {});
  }, [filters, applyData]);

  useEffect(() => {
    setPageTitle('Peta Geografis (GIS)');
    const unfiltered = filters.uip === 'all' && filters.tipe === 'all' && filters.status === 'all';
    gisProjects(filters).then((rows) => applyData(rows, unfiltered)).catch((e) => setErr(e.message));
  }, [filters, applyData]);

  // Status/lokasi proyek pada peta ikut ter-update dari akun lain.
  useLive([TOPIC.PROJECTS, TOPIC.PROGRESS], reload);

  function setFilter(k, v) { setFilters((f) => ({ ...f, [k]: v })); }

  if (err) return <div className="text-red-600 bg-red-50 p-4 rounded-lg">{err}</div>;

  return (
    <div className="animate-fade-in">
      <Card className="p-4 mb-5">
        <div className="grid md:grid-cols-4 gap-3">
          <select className={inputCls} value={filters.uip} onChange={(e) => setFilter('uip', e.target.value)}>
            <option value="all">Semua Unit Induk</option>
            {meta.allUip.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          <select className={inputCls} value={filters.tipe} onChange={(e) => setFilter('tipe', e.target.value)}>
            <option value="all">Semua Tipe</option>
            {meta.allTipe.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className={inputCls} value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="all">Semua Status</option>
            {['In Progress', 'BAST 1', 'BAST 2', 'BASTB'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 justify-start md:justify-end">
            {['In Progress', 'BASTB', 'BAST 1', 'BAST 2'].map((s) => (
              <span key={s} className="inline-flex items-center gap-1 text-2xs text-slate-600">
                <span className={`w-2.5 h-2.5 rounded-full ${legendDotClass(s)}`} />{s}
              </span>
            ))}
          </div>
        </div>
      </Card>

      {!data ? <Spinner show /> : data.length === 0 ? (
        <Card className="p-4">
          <Empty message="Tidak ada lokasi proyek berkoordinat yang cocok dengan filter." />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <MapContainer center={[-2.5489, 118.0149]} zoom={5} style={{ height: '65vh', minHeight: '420px', width: '100%' }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution='&copy; OpenStreetMap &copy; CARTO' />
            {data.map((p) => (
              <Marker key={p.markerId || `${p.id}-${p.lokasi}-${p.lng}`} position={[p.lat, p.lng]} icon={pinIcon(p.status)}>
                <Popup>
                  <div className="min-w-[220px] text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-pln-blue">{p.kode}</span>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="font-semibold text-slate-800 leading-snug">{p.nama}</div>
                    <div className="text-2xs text-slate-500 mt-1">{p.lokasi}</div>
                    <div className="text-2xs text-slate-500">{p.uip}</div>
                    <div className="text-2xs text-slate-500 mt-1">Target COD: {p.target_cod}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full ${progressBarColor(p.status)}`} style={{ width: `${p.progres_realisasi}%` }} />
                      </div>
                      <span className="text-2xs font-semibold">{p.progres_realisasi}%</span>
                    </div>
                    {canAction('projects_read') && (
                      <div className="mt-3">
                        <Link to={`/projects/${p.id}`} className="text-xs font-semibold text-pln-blue hover:underline">Buka Detail Proyek &rarr;</Link>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </Card>
      )}
    </div>
  );
}