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
  'In Progress': 'bg-cyan-100 text-cyan-800 border-cyan-300',
  'BAST 1': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'BAST 2': 'bg-teal-100 text-teal-800 border-teal-300',
  BASTB: 'bg-amber-100 text-amber-800 border-amber-300',
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

// Kategori pekerjaan, auto-derived from progress & handover info:
//   - BAST 1  : berita acara serah terima I, pekerjaan selesai 100%
//   - BAST 2  : 100% + masa garansi (tgl_selesai_garansi) telah terlampaui
//   - BASTB   : berita acara serah terima barang, barang sudah melalui checking
//   - else    : In Progress
export function deriveStatus(progres, { tgl_selesai_garansi = null, barang_dicek = false } = {}) {
  progres = Number(progres) || 0;
  if (progres >= 100) {
    if (tgl_selesai_garansi && new Date(tgl_selesai_garansi) <= new Date()) return 'BAST 2';
    return 'BAST 1';
  }
  return barang_dicek ? 'BASTB' : 'In Progress';
}

export function deviasiOf(rencana, realisasi) {
  return Math.round((Number(realisasi) - Number(rencana)) * 10) / 10;
}

function coordOrNull(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

// Validates the multi-site (lokasis) array from the request body.
export function normalizeLokasis(raw) {
  if (!Array.isArray(raw)) return null;
  return raw
    .map((s, i) => ({
      nama: String((s && s.nama) || '').trim(),
      latitude: coordOrNull(s && s.latitude),
      longitude: coordOrNull(s && s.longitude),
      urutan: i + 1,
    }))
    .filter((s) => s.nama);
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

// Default S-Curve points for a newly created project (timeline bulanan).
// Rencana (plan) lazim dibuat Vendor; realisasi diisi Dalkon tiap bulan.
export function defaultSCurvePoints(rencana, realisasi) {
  rencana = Number(rencana) || 0;
  realisasi = Number(realisasi) || 0;
  const n = 12;
  const now = new Date();
  const curve = (i) => Math.round(100 * (0.5 + 0.5 * Math.tanh((i - 5) / 2.5)) * 10) / 10;
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const isNow = i === 5;
    return {
      minggu: `B-${i + 1} (${d.toLocaleString('id-ID', { month: 'short', year: '2-digit' })})`,
      rencana: isNow ? rencana : curve(i),
      realisasi: isNow ? realisasi : null,
      pembuat: isNow ? 'dalkon' : 'vendor',
      urutan: i + 1,
    };
  });
}

// Payment term value model (revisi client):
//   Bobot/pembayaran termin = progres_fisik(%) × 95% × nilai kontrak (+PPN bila belum termasuk).
//   5% sisanya ditahan sebagai retensi pemeliharaan hingga masa garansi (BAST 2).
export function terminNominal(progresFisik, nilaiKontrak) {
  const p = Number(progresFisik) || 0;
  return Math.round(((Number(nilaiKontrak) || 0) * 0.95 * p) / 100);
}

// Default payment terms: berjalan sesuai progres fisik (uang muka dihapus).
export function defaultTermins(nilaiKontrak) {
  nilaiKontrak = Number(nilaiKontrak) || 0;
  const rows = ['Termin I', 'Termin II', 'Termin III', 'Termin IV'].map((nama, i) => ({
    nama,
    bobot: 0,
    progres_fisik: 0,
    nominal: 0,
    status: 'Belum Bayar',
    tgl_bayar: null,
    urutan: i + 1,
  }));
  rows.push({
    nama: 'Retensi (Pemeliharaan 5%)',
    bobot: 5,
    progres_fisik: null,
    nominal: Math.round(nilaiKontrak * 0.05),
    status: 'Belum Bayar',
    tgl_bayar: null,
    urutan: rows.length + 1,
  });
  return rows;
}

// Shift an ISO date by N days (amandemen perpanjangan durasi).
export function shiftIsoDate(iso, days) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + Number(days) || 0);
  return d.toISOString().slice(0, 10);
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