@extends('layouts.app')

@section('title', 'Peta GIS')
@section('page-title', 'Peta Geografis (GIS) Proyek Konstruksi')

@section('content')
<div class="space-y-5">

    <!-- Filters & Legend Toolbar -->
    <div class="bg-white p-4 sm:p-5 rounded-xl border border-pln-surface-strong shadow-pln flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
            <div>
                <select id="gisFilterUip" class="w-full px-3.5 py-3 border rounded-xl text-sm bg-white font-medium text-slate-700 cursor-pointer">
                    <option value="all">Semua Unit Induk (UIP)</option>
                    @foreach($allUip as $uip)
                        <option value="{{ $uip }}">{{ $uip }}</option>
                    @endforeach
                </select>
            </div>
            <div>
                <select id="gisFilterTipe" class="w-full px-3.5 py-3 border rounded-xl text-sm bg-white font-medium text-slate-700 cursor-pointer">
                    <option value="all">Semua Tipe Konstruksi</option>
                    @foreach($allTipe as $tipe)
                        <option value="{{ $tipe }}">{{ $tipe }}</option>
                    @endforeach
                </select>
            </div>
            <div>
                <select id="gisFilterStatus" class="w-full px-3.5 py-3 border rounded-xl text-sm bg-white font-medium text-slate-700 cursor-pointer">
                    <option value="all">Semua Status Proyek</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Critical">Kritis / Delay</option>
                    <option value="Testing">Testing & Commissioning</option>
                    <option value="COD / Energized">COD / Energized</option>
                </select>
            </div>
        </div>

        <!-- Legend Pins -->
        <div class="flex items-center gap-4 text-xs font-bold flex-wrap pt-2 lg:pt-0 border-t lg:border-t-0 border-pln-surface-strong">
            <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-pln-cyan"></span>
                <span class="text-slate-600">In Progress</span>
            </div>
            <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <span class="text-slate-600">Kritis / Delay</span>
            </div>
            <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span class="text-slate-600">Testing</span>
            </div>
            <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span class="text-slate-600">Energized</span>
            </div>
        </div>
    </div>

    <!-- Interactive Map Card -->
    <div class="bg-white rounded-xl border border-pln-surface-strong shadow-pln overflow-hidden relative">
        <div id="gisMap" class="w-full h-[540px] sm:h-[620px] lg:h-[680px] z-10"></div>
    </div>

</div>
@endsection

@push('styles')
<style>
    .leaflet-popup-content-wrapper {
        border-radius: 18px;
        padding: 4px;
        box-shadow: 0 15px 30px -5px rgba(0, 43, 73, 0.25);
    }
    .gis-popup {
        font-family: 'Plus Jakarta Sans', sans-serif;
        padding: 8px;
        min-width: 250px;
    }
</style>
@endpush

@push('scripts')
<script>
    document.addEventListener("DOMContentLoaded", function () {
        const map = L.map('gisMap', {
            zoomControl: true,
            scrollWheelZoom: true
        }).setView([-2.5489, 118.0149], 5);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
            maxZoom: 19
        }).addTo(map);

        const markersLayer = L.layerGroup().addTo(map);

        function loadMapMarkers() {
            const uip = document.getElementById('gisFilterUip').value;
            const tipe = document.getElementById('gisFilterTipe').value;
            const status = document.getElementById('gisFilterStatus').value;

            const url = `{{ route('api.gis.projects') }}?uip=${encodeURIComponent(uip)}&tipe=${encodeURIComponent(tipe)}&status=${encodeURIComponent(status)}`;

            fetch(url)
                .then(res => res.json())
                .then(projects => {
                    markersLayer.clearLayers();
                    const bounds = [];

                    projects.forEach(p => {
                        if (p.lat && p.lng) {
                            const latLng = [p.lat, p.lng];
                            bounds.push(latLng);

                            let markerClass = "marker-blue";
                            let statusBg = "#00A3E0";
                            if (p.status === "Critical") {
                                markerClass = "marker-red";
                                statusBg = "#EF4444";
                            } else if (p.status === "COD / Energized") {
                                markerClass = "marker-green";
                                statusBg = "#10B981";
                            } else if (p.status === "Testing") {
                                markerClass = "marker-amber";
                                statusBg = "#F59E0B";
                            }

                            const customIcon = L.divIcon({
                                className: 'custom-gis-pin',
                                html: `
                                    <div class="pin-wrapper ${markerClass}">
                                        <div class="pin-pulse"></div>
                                        <div class="pin-core">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                                            </svg>
                                        </div>
                                    </div>
                                `,
                                iconSize: [32, 32],
                                iconAnchor: [16, 30],
                                popupAnchor: [0, -28]
                            });

                            const marker = L.marker(latLng, { icon: customIcon });

                            const popupHtml = `
                                <div class="gis-popup">
                                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                                        <span style="font-size:10px; font-weight:800; font-family:monospace; color:#002B49; background:#e2e8f0; padding:2px 6px; border-radius:6px;">${p.kode}</span>
                                        <span style="font-size:10px; font-weight:700; color:#fff; background:${statusBg}; padding:2px 8px; border-radius:12px;">${p.status}</span>
                                    </div>
                                    <h4 style="font-size:13px; font-weight:800; color:#002B49; margin:4px 0 8px 0; line-height:1.3;">${p.nama}</h4>
                                    <div style="font-size:11px; color:#64748b; margin-bottom:10px; line-height:1.5;">
                                        <div><strong>Lokasi:</strong> ${p.lokasi}</div>
                                        <div><strong>UIP:</strong> ${p.uip.split('(')[0]}</div>
                                        <div><strong>Target COD:</strong> ${p.target_cod}</div>
                                    </div>
                                    <div style="margin-bottom:12px;">
                                        <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:700; margin-bottom:4px;">
                                            <span>Progres Fisik:</span>
                                            <span style="color:${p.deviasi < 0 ? '#ef4444' : '#00A3E0'};">${p.progres_realisasi}% (${p.deviasi > 0 ? '+' : ''}${p.deviasi}%)</span>
                                        </div>
                                        <div style="background:#e2e8f0; height:6px; border-radius:4px; overflow:hidden;">
                                            <div style="width:${p.progres_realisasi}%; height:100%; background:${statusBg};"></div>
                                        </div>
                                    </div>
                                    <a href="${p.url}" style="display:block; text-align:center; background:#002B49; color:#fff; font-size:11px; font-weight:700; padding:8px 12px; border-radius:10px; text-decoration:none;">
                                        Buka Detail Proyek &rarr;
                                    </a>
                                </div>
                            `;

                            marker.bindPopup(popupHtml, { maxWidth: 300 });
                            markersLayer.addLayer(marker);
                        }
                    });

                    if (bounds.length > 0) {
                        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
                    }
                });
        }

        document.getElementById('gisFilterUip').addEventListener('change', loadMapMarkers);
        document.getElementById('gisFilterTipe').addEventListener('change', loadMapMarkers);
        document.getElementById('gisFilterStatus').addEventListener('change', loadMapMarkers);

        loadMapMarkers();
    });
</script>
@endpush
