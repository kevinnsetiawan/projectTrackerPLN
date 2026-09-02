import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { setPageTitle } from '../components/Layout.jsx';
import { Card, Spinner, StatusBadge } from '../components/ui.jsx';
import { inputCls } from '../components/ui.jsx';
import { fmtDate } from '../utils.js';
import 'leaflet/dist/leaflet.css';

function pinIcon(status) {
  const color = status === 'Critical' ? 'red' : status === 'COD / Energized' ? 'green' : status === 'Testing' ? 'amber' : '';
  return L.divIcon({
    className: '',
    html: `<div class="gis-pin ${color}"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function statusColor(status) {
  return status === 'Critical' ? 'red' : status === 'COD / Energized' ? 'green' : status === 'Testing' ? 'amber' : 'blue';
}

function progressBarColor(status) {
  if (status === 'Critical') return 'bg-red-500';
  if (status === 'COD / Energized') return 'bg-emerald-500';
  if (status === 'Testing') return 'bg-amber-500';
  return 'bg-cyan-500';
}

export default function GisPage() {
  const [data, setData] = useState([]);
  const [err, setErr] = useState(null);
  const [filters, setFilters] = useState({ uip: 'all', tipe: 'all', status: 'all' });
  const [meta, setMeta] = useState({ allUip: [], allTipe: [] });

  useEffect(() => {
    setPageTitle('Peta Geografis (GIS)');
    const qs = new URLSearchParams(filters).toString();
    fetch(`/api/gis/projects?${qs}`).then((r) => r.json()).then(setData).catch((e) => setErr(e.message));
  }, [filters]);

  function setFilter(k, v) { setFilters((f) => ({ ...f, [k]: v })); }

  if (err) return <div className="text-red-600 bg-red-50 p-4 rounded-lg">{err}</div>;

  return (
    <div className="animate-fade-in">
      <Card className="p-4 mb-5">
        <div className="grid md:grid-cols-4 gap-3">
          <select className={inputCls} value={filters.uip} onChange={(e) => setFilter('uip', e.target.value)}>
            <option value="all">Semua Unit Induk</option>
            {['UIP JBB (Jawa Bagian Barat)', 'UIP JBT (Jawa Bagian Tengah)', 'UIP JBTB (Jawa Bagian Timur & Bali)', 'UIP SUMBAGUT (Sumatera Bagian Utara)', 'UIP SUMBAGTENG (Sumatera Bagian Tengah)', 'UIP SUMBAGSEL (Sumatera Bagian Selatan)', 'UIP KALIMANTAN', 'UIP SULAWESI', 'UIP MALUKU PAPUA', 'UIP NUSA TENGGARA'].map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          <select className={inputCls} value={filters.tipe} onChange={(e) => setFilter('tipe', e.target.value)}>
            <option value="all">Semua Tipe</option>
            {['Gardu Induk (GI)', 'GITET (Ekstra Tinggi)', 'SUTT (Transmisi)', 'SUTET (Transmisi 500 kV)', 'SKTT (Kabel Tanah)', 'Pembangkit EBT (PLTS)'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className={inputCls} value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="all">Semua Status</option>
            {['In Progress', 'Critical', 'Testing', 'COD / Energized', 'Planning'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 justify-start md:justify-end">
            {['In Progress', 'Critical', 'Testing', 'COD / Energized'].map((s) => (
              <span key={s} className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                <span className={`w-2.5 h-2.5 rounded-full bg-${statusColor(s)}`} />{s}
              </span>
            ))}
          </div>
        </div>
      </Card>

      {!data || data.length === 0 ? <Spinner show /> : (
        <Card className="overflow-hidden">
          <MapContainer center={[-2.5489, 118.0149]} zoom={5} style={{ height: '65vh', minHeight: '420px', width: '100%' }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution='&copy; OpenStreetMap &copy; CARTO' />
            {data.map((p) => (
              <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIcon(p.status)}>
                <Popup>
                  <div className="min-w-[220px] text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-pln-blue">{p.kode}</span>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="font-semibold text-slate-800 leading-snug">{p.nama}</div>
                    <div className="text-[11px] text-slate-500 mt-1">{p.lokasi}</div>
                    <div className="text-[11px] text-slate-500">{p.uip}</div>
                    <div className="text-[11px] text-slate-500 mt-1">Target COD: {p.target_cod}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full ${progressBarColor(p.status)}`} style={{ width: `${p.progres_realisasi}%` }} />
                      </div>
                      <span className="text-[11px] font-semibold">{p.progres_realisasi}%</span>
                    </div>
                    <div className="mt-3">
                      <Link to={`/projects/${p.id}`} className="text-xs font-semibold text-pln-blue hover:underline">Buka Detail Proyek &rarr;</Link>
                    </div>
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