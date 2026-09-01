/**
 * PLN Pro-Track - GIS Map Interactive Integration (Leaflet.js)
 */

class ProTrackMap {
  constructor() {
    this.map = null;
    this.markersLayer = null;
  }

  initMap(containerId = "gisMap") {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    // Centered around Java & Indonesia Archipelago
    this.map = L.map(containerId, {
      center: [-6.5, 107.5],
      zoom: 7,
      scrollWheelZoom: true
    });

    // High quality OpenStreetMap / CartoDB Voyager tiles
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19
    }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);
  }

  renderMarkers(projects, filterType = "all", filterStatus = "all") {
    if (!this.map || !this.markersLayer) return;

    this.markersLayer.clearLayers();

    const filtered = projects.filter(p => {
      const matchType = filterType === "all" || p.tipe === filterType;
      const matchStatus = filterStatus === "all" || p.status === filterStatus;
      return matchType && matchStatus && p.koordinat && p.koordinat.length === 2;
    });

    const bounds = [];

    filtered.forEach(p => {
      const latLng = [p.koordinat[0], p.koordinat[1]];
      bounds.push(latLng);

      // Status color code
      let colorClass = "marker-blue";
      let statusBadgeColor = "#00A3E0";
      if (p.status === "Critical") {
        colorClass = "marker-red";
        statusBadgeColor = "#EF4444";
      } else if (p.status === "COD / Energized") {
        colorClass = "marker-green";
        statusBadgeColor = "#10B981";
      } else if (p.status === "Testing") {
        colorClass = "marker-amber";
        statusBadgeColor = "#F59E0B";
      }

      // Custom HTML Pin Marker
      const customIcon = L.divIcon({
        className: "custom-gis-pin",
        html: `
          <div class="pin-wrapper ${colorClass}">
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

      const popupContent = `
        <div class="gis-popup-card">
          <div class="gis-popup-header">
            <span class="badge" style="background:${statusBadgeColor}; color:#fff; font-size:10px; padding:3px 8px; border-radius:12px;">${p.status}</span>
            <span class="gis-popup-code">${p.kode}</span>
          </div>
          <h4 class="gis-popup-title">${p.nama}</h4>
          <div class="gis-popup-meta">
            <div><i class="lucide-map-pin"></i> <strong>Lokasi:</strong> ${p.lokasi}</div>
            <div><i class="lucide-building"></i> <strong>UIP:</strong> ${p.uip.split("(")[0]}</div>
            <div><i class="lucide-calendar"></i> <strong>Target COD:</strong> ${p.targetCOD}</div>
          </div>
          <div class="gis-popup-progress">
            <div class="gis-prog-labels">
              <span>Progres Fisik:</span>
              <strong style="color: ${p.deviasi < 0 ? '#EF4444' : '#00A3E0'};">${p.progresRealisasi}% (Dev: ${p.deviasi > 0 ? '+' : ''}${p.deviasi}%)</strong>
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar-fill" style="width: ${p.progresRealisasi}%; background: ${p.status === 'Critical' ? '#EF4444' : '#00A3E0'};"></div>
            </div>
          </div>
          <button onclick="window.proTrackApp.viewProjectDetail('${p.id}')" class="btn-gis-detail">
            Buka Detail Proyek &rarr;
          </button>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 300 });
      this.markersLayer.addLayer(marker);
    });

    if (bounds.length > 0) {
      this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }

  invalidateSize() {
    if (this.map) {
      setTimeout(() => {
        this.map.invalidateSize();
      }, 200);
    }
  }
}

window.proTrackMap = new ProTrackMap();
