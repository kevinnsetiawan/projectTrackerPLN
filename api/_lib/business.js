// Constants & business rules replicated from Laravel Project model.

export const ALL_TIPE = [
  'Gardu Induk (GI)',
  'GITET (Ekstra Tinggi)',
  'SUTT (Transmisi)',
  'SUTET (Transmisi 500 kV)',
  'SKTT (Kabel Tanah)',
  'Pembangkit EBT (PLTS)',
  'Pembangkit (PLTA/PLTU)',
  'Jaringan Distribusi (JTM/JTR)',
];

export const ALL_UIP = [
  'UIP JBB (Jawa Bagian Barat)',
  'UIP JBT (Jawa Bagian Tengah)',
  'UIP JBTB (Jawa Bagian Timur & Bali)',
  'UIP SUMBAGUT (Sumatera Bagian Utara)',
  'UIP SUMBAGTENG (Sumatera Bagian Tengah)',
  'UIP SUMBAGSEL (Sumatera Bagian Selatan)',
  'UIP KALIMANTAN',
  'UIP SULAWESI',
  'UIP MALUKU PAPUA',
  'UIP NUSA TENGGARA',
];

export const KATEGORI_KENDALA = [
  'Lahan / Sosial',
  'Cuaca & Geoteknik',
  'Material',
  'Vendor / Manpower',
  'Teknis / Utilitas',
  'Regulasi / Perizinan',
];

export const STATUS_BADGE = {
  'COD / Energized': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  Testing: 'bg-amber-100 text-amber-800 border-amber-300',
  Critical: 'bg-red-100 text-red-800 border-red-300',
  Planning: 'bg-slate-100 text-slate-800 border-slate-300',
  'In Progress': 'bg-cyan-100 text-cyan-800 border-cyan-300',
};

export function formatNilaiKontrak(v) {
  return 'Rp ' + Number(v || 0).toLocaleString('id-ID');
}

export function nilaiMilyar(v) {
  return 'Rp ' + Number(v || 0).toLocaleString('id-ID', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }) + ' M';
}

export function fmtDate(d) {
  if (!d) return '-';
  const date = new Date(d);
  if (isNaN(date)) return '-';
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function isoDate(d) {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date)) return null;
  return date.toISOString().slice(0, 10);
}

// Status auto-derivation, copied from Laravel Project::deriveStatus.
export function deriveStatus(rencana, realisasi, currentStatus = null) {
  rencana = Number(rencana) || 0;
  realisasi = Number(realisasi) || 0;
  const deviasi = Math.round((realisasi - rencana) * 10) / 10;
  let base = currentStatus || 'In Progress';

  if (realisasi >= 100) return 'COD / Energized';
  if (deviasi < -5.0) {
    if ((realisasi > 0 && base !== 'Planning') || base === 'Critical') return 'Critical';
    return base;
  }
  if (base === 'Critical') return 'In Progress';
  if (base === 'In Progress' && realisasi >= 95) return 'Testing';
  return base;
}

export function deviasiOf(rencana, realisasi) {
  return Math.round((Number(realisasi) - Number(rencana)) * 10) / 10;
}

// Default milestones for a newly created project.
export function defaultMilestones(realisasi) {
  realisasi = Number(realisasi) || 0;
  const rows = [
    { nama: 'Perizinan, Amdal & Pembebasan Lahan / ROW', bobot: 15, rencana: 100, realForm: () => (realisasi > 20 ? 100 : realisasi * 4), doneAt: 25 },
    { nama: 'Pekerjaan Sipil, Pondasi & Struktur', bobot: 30, rencana: 80, realForm: () => (realisasi > 50 ? 100 : realisasi * 1.5), doneAt: 60 },
    { nama: 'Pengadaan, Erection & Instalasi Peralatan', bobot: 35, rencana: 60, realForm: () => (realisasi > 80 ? 100 : realisasi), doneAt: 90 },
    { nama: 'Testing, Individual Test & Commissioning', bobot: 15, rencana: 20, realForm: () => (realisasi >= 95 ? 80 : 0), doneAt: 98 },
    { nama: 'Energize & Commercial Operation Date (COD)', bobot: 5, rencana: 0, realForm: () => (realisasi >= 100 ? 100 : 0), doneAt: 100 },
  ];
  return rows.map((r, i) => {
    const real = Math.min(100, Math.round(r.realForm() * 10) / 10);
    let status = 'Pending';
    if (real >= r.doneAt) status = 'Done';
    else if (real > 0) status = 'In Progress';
    return {
      nama: r.nama,
      bobot: r.bobot,
      rencana: r.rencana,
      realisasi: real,
      status,
      urutan: i + 1,
    };
  });
}

// Default S-Curve points for a newly created project.
export function defaultSCurvePoints(rencana, realisasi) {
  rencana = Number(rencana) || 0;
  realisasi = Number(realisasi) || 0;
  return [
    { minggu: 'M-1', rencana: 15.0, realisasi: Math.min(15.0, realisasi), urutan: 1 },
    { minggu: 'M-3', rencana: 40.0, realisasi: Math.min(40.0, realisasi), urutan: 2 },
    { minggu: 'M-6 (Saat Ini)', rencana, realisasi, urutan: 3 },
    { minggu: 'Target COD', rencana: 100.0, realisasi: null, urutan: 4 },
  ];
}

// Kendala code: 'K-' + zero-padded next sequence.
export function nextKendalaCode(count) {
  return 'K-' + String(count + 1).padStart(2, '0');
}

// CSV column headers (18 columns).
export const CSV_HEADERS = [
  'ID Proyek', 'Kode', 'Nama Proyek', 'Tipe', 'Tegangan', 'UIP', 'UPP', 'Lokasi',
  'Kontraktor', 'Nomor Kontrak', 'Nilai Kontrak (Rp)', 'Tgl Mulai', 'Target COD',
  'Status', 'Progres Rencana (%)', 'Progres Realisasi (%)', 'Deviasi (%)', 'Penyerapan Anggaran (%)',
];