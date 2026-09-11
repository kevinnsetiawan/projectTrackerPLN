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

export const AGENDA_STATUS = ['Terjadwal', 'Selesai', 'Dibatalkan'];
export const AGENDA_SURAT_STATUS = ['Sudah Dibuat di AMS', 'Belum Dibuat']; // status surat undangan rapat di AMS

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
// Baseline dibangkitkan dari tanggal mulai → target COD sehingga kurva rencana
// naik monoton dan mencapai 100% tepat di COD (tidak menukik di tengah).
// Rencana (plan) lazim dibuat Vendor; realisasi diisi Dalkon tiap bulan.
function monthsBetween(startIso, endIso) {
  if (!startIso || !endIso) return null;
  const a = new Date(`${startIso}T00:00:00`);
  const b = new Date(`${endIso}T00:00:00`);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
  return Math.max(1, Math.round((b - a) / (30 * 24 * 3600 * 1000)));
}

function smoothstep(f) {
  const x = Math.min(1, Math.max(0, f));
  return x * x * (3 - 2 * x);
}

export function defaultSCurvePoints(rencana, realisasi, opts = {}) {
  rencana = Math.min(100, Math.max(0, Number(rencana) || 0));
  realisasi = Math.min(100, Math.max(0, Number(realisasi) || 0));
  const { tgl_mulai, target_cod } = opts;
  const now = new Date();

  const n = monthsBetween(tgl_mulai, target_cod) || 12;
  const anchor = tgl_mulai ? new Date(`${tgl_mulai}T00:00:00`) : now;

  // Indeks bulan "sekarang" pada kurva (dihitung dari tgl_mulai bila ada).
  let cur = tgl_mulai ? Math.round((now - anchor) / (30 * 24 * 3600 * 1000)) : 5;
  cur = Math.min(n - 1, Math.max(0, cur));

  // Bentuk dasar S (tanh) naik monoton dari 0 → ~100%.
  const base = (i) => n > 1
    ? Math.round(100 * (0.5 + 0.5 * Math.tanh(((i / (n - 1)) * 2 - 1) * 2.5)) * 10) / 10
    : 0;

  const values = Array.from({ length: n }, (_, i) => {
    if (i === cur) return rencana;
    if (i < cur) return Math.min(base(i), rencana);
    const f = (i - cur) / Math.max(1, n - 1 - cur);
    return Math.round((rencana + (100 - rencana) * smoothstep(f)) * 10) / 10;
  });

  // Jamin monoton naik (pembulatan bisa membuat turun 0,1).
  for (let i = 1; i < n; i++) {
    if (values[i] < values[i - 1]) values[i] = values[i - 1];
  }

  return values.map((v, i) => {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() + i, 1);
    const isNow = i === cur;
    return {
      minggu: `B-${i + 1} (${d.toLocaleString('id-ID', { month: 'short', year: '2-digit' })})`,
      rencana: v,
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

// Normalize termin schedule/payment rows from the client form.
// - Untuk proyek baru (default create): hanya "rencana pembayaran" (status Belum Bayar).
// - Untuk update (opts.preserve): mempertahankan status/tgl_bayar/nominal yang sudah dibayar.
// Nominal mengikuti model revisi client: progres_fisik (%) x 95% x nilai kontrak.
export function normalizeTermins(raw, nilaiKontrak, opts = {}) {
  nilaiKontrak = Number(nilaiKontrak) || 0;
  if (!Array.isArray(raw)) return [];
  const preserve = Boolean(opts && opts.preserve);
  const out = [];
  for (const [i, t] of raw.entries()) {
    if (!t || typeof t !== 'object') continue;
    const nama = String(t.nama || '').trim() || `Termin ${i + 1}`;
    const isRetensi = /retensi/i.test(nama);
    let fisik = null;
    if (t.progres_fisik !== null && t.progres_fisik !== undefined && t.progres_fisik !== '') {
      const n = Number(t.progres_fisik);
      if (!isNaN(n)) fisik = Math.min(100, Math.max(0, n));
    }
    const nominal = preserve && (t.nominal !== null && t.nominal !== undefined && t.nominal !== '')
      ? Number(t.nominal) || 0
      : (isRetensi ? Math.round(nilaiKontrak * 0.05) : terminNominal(fisik, nilaiKontrak));
    out.push({
      nama,
      nominal,
      bobot: isRetensi ? 5 : (fisik ?? 0),
      progres_fisik: fisik,
      status: preserve ? (t.status || 'Belum Bayar') : 'Belum Bayar',
      tgl_bayar: preserve ? (t.tgl_bayar || null) : null,
      urutan: i + 1,
    });
  }
  return out;
}

// Return an error message when payment progress violates the rule
// "progres bayar ≤ progres fisik"; otherwise null.
export function validateTerminPayments(termins, progresFisikProyek, nilaiKontrak) {
  progresFisikProyek = Number(progresFisikProyek) || 0;
  nilaiKontrak = Number(nilaiKontrak) || 0;
  const paid = termins.filter((t) => t.status === 'Terbayar');
  for (const t of paid) {
    if (t.progres_fisik !== null && Number(t.progres_fisik) > progresFisikProyek
      && Number(t.progres_fisik) - progresFisikProyek > 0.01) {
      return `Termin "${t.nama}" (min. progres fisik ${t.progres_fisik}%) tidak boleh terbayar karena progres fisik proyek baru ${progresFisikProyek}%.`;
    }
  }
  const paidNominal = paid.reduce((s, t) => s + Number(t.nominal || 0), 0);
  const paidPct = nilaiKontrak ? (paidNominal / nilaiKontrak) * 100 : 0;
  if (paidPct - progresFisikProyek > 0.1) {
    return `Akumulasi progres bayar (${Math.round(paidPct * 10) / 10}%) tidak boleh melebihi progres fisik proyek (${progresFisikProyek}%).`;
  }
  return null;
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

// Group agendas into weekly or monthly buckets. Returns a flat, ordered list of
// bucket objects: { key, label, items: [...], total, suratDone, suratPending }.
function isoOf(v) {
  if (!v) return null;
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null;
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`;
  }
  return String(v).slice(0, 10);
}

export function groupAgendasByPeriod(rows, periode, anchor) {
  const keyOf = (tgl) => {
    const iso = isoOf(tgl);
    if (!iso) return null;
    const d = new Date(`${iso}T00:00:00`);
    if (isNaN(d.getTime())) return null;
    if (periode === 'bulan') return iso.slice(0, 7);
    // minggu: ISO week of the week containing the anchor date (Senin = start).
    const a = new Date(anchor + 'T00:00:00');
    const start = new Date(a.getFullYear(), a.getMonth(), (a.getDate() - ((a.getDay() + 6) % 7)));
    const diff = Math.floor((start - d) / (24 * 3600 * 1000));
    const weekOffset = Math.ceil(diff / 7);
    const ms = new Date(start.getTime() - weekOffset * 7 * 24 * 3600 * 1000);
    return `${ms.getFullYear()}-${String(ms.getMonth() + 1).padStart(2, '0')}-${String(ms.getDate()).padStart(2, '0')}`;
  };

  const buckets = new Map();
  const order = [];
  for (const r of rows) {
    const key = keyOf(r.tgl_rapat);
    if (key === null) continue;
    if (!buckets.has(key)) {
      buckets.set(key, { key, label: null, items: [], total: 0, suratDone: 0, suratPending: 0 });
      order.push(key);
    }
    const b = buckets.get(key);
    b.items.push(r);
    b.total += 1;
    if (r.status_surat === 'Sudah Dibuat di AMS') b.suratDone += 1;
    else b.suratPending += 1;
  }
  buckets.forEach((b) => {
    if (periode === 'bulan') {
      const d = new Date(`${b.key}-01T00:00:00`);
      b.label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    } else {
      const start = new Date(`${b.key}T00:00:00`);
      const end = new Date(start.getTime() + 6 * 24 * 3600 * 1000);
      const fmt = (x) => x.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      b.label = `${fmt(start)} – ${fmt(end)}`;
    }
  });
  order.sort();
  return order.map((k) => buckets.get(k));
}

// Build a plain-text summary of the rekap suitable for a WhatsApp message.
export function buildAgendaRekapText(periode, tgl, groups, projekMap) {
  const lines = [];
  lines.push(`*REKAP AGENDA RAPAT KONSTRUKSI*`);
  lines.push(`Periode: ${periode === 'bulan' ? 'Bulanan' : 'Mingguan'}`);
  lines.push(`Referensi: ${String(tgl).slice(0, 10)}`);
  lines.push('');
  for (const g of groups) {
    lines.push(`*${g.label}*`);
    lines.push(`_Total ${g.total} rapat | Surat AMS: ${g.suratDone} siap, ${g.suratPending} belum_`);
    for (const it of g.items) {
      const proj = projekMap[it.project_id] || {};
      lines.push(
        `• ${isoOf(it.tgl_rapat)} ${it.jam_rapat || ''} — ${proj.kode || ''} ${proj.nama || ''}` +
        (it.status_surat === 'Sudah Dibuat di AMS' ? ' [AMS ✓]' : ' [AMS ✗]')
      );
    }
    lines.push('');
  }
  return lines.join('\n');
}

// CSV column headers (18 columns).
export const CSV_HEADERS = [
  'ID Proyek', 'Kode', 'Nama Proyek', 'Tipe', 'Tegangan', 'UIP', 'UPP', 'Lokasi',
  'Kontraktor', 'Nomor Kontrak', 'Nilai Kontrak (Rp)', 'Tgl Mulai', 'Target COD',
  'Status', 'Progres Rencana (%)', 'Progres Realisasi (%)', 'Deviasi (%)', 'Penyerapan Anggaran (%)',
];