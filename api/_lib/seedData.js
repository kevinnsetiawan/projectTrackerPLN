// Seed data for PLN Pro-Track (8 projects with full relations).
// Replicated from Laravel ProjectSeeder.

const P = (o) => ({
  kode: null, nama: null, tipe: null, tegangan: '150 kV', uip: null, upp: null,
  lokasi: null, latitude: null, longitude: null, kontraktor: null, nomor_kontrak: null,
  nilai_kontrak: 0, tgl_mulai: null, target_cod: null, status: 'In Progress',
  progres_rencana: 0, progres_realisasi: 0, deviasi: 0, penyerapan_anggaran: 0,
  deskripsi: null, milestones: [], scurves: [], kendalas: [], dokumentasis: [], terminBayars: [],
  ...o,
});

export const SEED_PLACEHOLDER_PHOTO = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=60';

// Helper to build payment termins whose nominal follows the project's contract value.
const Termin = (kontrak) => (nama, bobot, status, tgl_bayar = null) => ({
  nama, bobot, status, tgl_bayar,
  nominal: Math.round((kontrak * bobot) / 100),
});

export const SEED = [
  P({
    kode: 'GI-150-SRP', nama: 'Pembangunan Gardu Induk 150 kV Serpong II (Ext 2 LB)',
    tipe: 'Gardu Induk (GI)', tegangan: '150 kV', uip: 'UIP JBB (Jawa Bagian Barat)', upp: 'UPP JBB 1',
    lokasi: 'Tangerang Selatan, Banten', latitude: -6.3025, longitude: 106.6622,
    kontraktor: 'PT Rekayasa Industri - Siemens Konsorsium', nomor_kontrak: '0142.PJ/KON.01/UIP-JBB/2023',
    nilai_kontrak: 84500000000, tgl_mulai: '2023-08-15', target_cod: '2024-11-30',
    status: 'In Progress', progres_rencana: 78.5, progres_realisasi: 82.3, deviasi: 3.8, penyerapan_anggaran: 75.0,
    deskripsi: 'Peningkatan keandalan pasokan listrik kawasan industri dan residensial Serpong & BSD.',
    milestones: [
      { nama: 'Perizinan & Pembebasan Lahan', bobot: 10, rencana: 100, realisasi: 100, status: 'Done', urutan: 1 },
      { nama: 'Pekerjaan Sipil & Pondasi Gedung Kontrol', bobot: 25, rencana: 100, realisasi: 100, status: 'Done', urutan: 2 },
      { nama: 'Pengadaan & Fabrikasi Peralatan Utama', bobot: 30, rencana: 95, realisasi: 98, status: 'In Progress', urutan: 3 },
      { nama: 'Instalasi Elektromekanikal & Switchyard', bobot: 20, rencana: 60, realisasi: 68, status: 'In Progress', urutan: 4 },
      { nama: 'Individual & Function Test', bobot: 10, rencana: 15, realisasi: 20, status: 'In Progress', urutan: 5 },
      { nama: 'Commissioning & Energize (COD)', bobot: 5, rencana: 0, realisasi: 0, status: 'Pending', urutan: 6 },
    ],
    scurves: [
      { minggu: 'M-1 (Sep 23)', rencana: 5.0, realisasi: 5.2, urutan: 1 },
      { minggu: 'M-4 (Okt 23)', rencana: 12.0, realisasi: 11.5, urutan: 2 },
      { minggu: 'M-8 (Des 23)', rencana: 24.0, realisasi: 25.0, urutan: 3 },
      { minggu: 'M-12 (Feb 24)', rencana: 38.0, realisasi: 40.2, urutan: 4 },
      { minggu: 'M-16 (Apr 24)', rencana: 52.0, realisasi: 55.0, urutan: 5 },
      { minggu: 'M-20 (Jun 24)', rencana: 65.0, realisasi: 69.4, urutan: 6 },
      { minggu: 'M-24 (Agu 24)', rencana: 78.5, realisasi: 82.3, urutan: 7 },
      { minggu: 'M-28 (Okt 24)', rencana: 92.0, realisasi: null, urutan: 8 },
      { minggu: 'M-32 (Nov 24)', rencana: 100.0, realisasi: null, urutan: 9 },
    ],
    kendalas: [
      { kode_kendala: 'K-01', kategori: 'Material', deskripsi: 'Keterlambatan pengiriman CT 150 kV dari luar negeri (2 minggu bea cukai).', dampak: 'Penundaan instalasi bay trafo 60 MVA.', tindakan_mitigasi: 'Koordinasi freight forwarder & percepatan dokumen impor.', status: 'Resolved', tgl_lapor: '2024-06-10', tgl_selesai: '2024-06-25' },
    ],
    dokumentasis: [
      { judul: 'Pondasi Gantry & Trafo Daya 60 MVA', tahap: 'Sipil & Konstruksi', foto: SEED_PLACEHOLDER_PHOTO, tgl: '2024-05-18', keterangan: 'Pengecoran pondasi gantry dan dudukan transformator.' },
      { judul: 'Erection Disconnecting Switch & Circuit Breaker', tahap: 'Elektromekanikal', foto: SEED_PLACEHOLDER_PHOTO, tgl: '2024-07-22', keterangan: 'Pemasangan DS dan CB di bay incoming.' },
    ],
    terminBayars: [
      Termin(84500000000)('Termin I (Uang Muka)', 20, 'Terbayar', '2023-10-25'),
      Termin(84500000000)('Termin II', 20, 'Terbayar', '2024-02-20'),
      Termin(84500000000)('Termin III', 25, 'Terbayar', '2024-06-15'),
      Termin(84500000000)('Termin IV', 25, 'Belum Bayar'),
      Termin(84500000000)('Retensi (Pemeliharaan)', 10, 'Belum Bayar'),
    ],
  }),

  P({
    kode: 'SUTT-150-CBN-GDL', nama: 'Pembangunan SUTT 150 kV Cibinong - Gandul Incomer',
    tipe: 'SUTT (Transmisi)', tegangan: '150 kV', uip: 'UIP JBT (Jawa Bagian Tengah)', upp: 'UPP JBT 2',
    lokasi: 'Bogor - Depok, Jawa Barat', latitude: -6.4251, longitude: 106.8524,
    kontraktor: 'PT Bukaka Teknik Utama Tbk', nomor_kontrak: '0219.PJ/KON.02/UIP-JBT/2023',
    nilai_kontrak: 112000000000, tgl_mulai: '2023-05-10', target_cod: '2024-10-15',
    status: 'Critical', progres_rencana: 86.0, progres_realisasi: 73.2, deviasi: -12.8, penyerapan_anggaran: 68.5,
    deskripsi: 'Pembangunan 42 Tapak Tower SUTT 150 kV untuk evakuasi daya Depok & Bogor Selatan.',
    milestones: [
      { nama: 'Inventarisasi & Pembebasan Lahan (42 Tapak)', bobot: 20, rencana: 100, realisasi: 90.5, status: 'In Progress', urutan: 1 },
      { nama: 'Pekerjaan Pondasi Tower (Stub & Bored Pile)', bobot: 25, rencana: 100, realisasi: 85, status: 'In Progress', urutan: 2 },
      { nama: 'Erection Tower (Rangka Baja)', bobot: 25, rencana: 85, realisasi: 65, status: 'In Progress', urutan: 3 },
      { nama: 'Stringing & Penarikan Konduktor (ACSR)', bobot: 20, rencana: 60, realisasi: 30, status: 'In Progress', urutan: 4 },
      { nama: 'ROW Clearing & Kompensasi Jalur', bobot: 5, rencana: 70, realisasi: 50, status: 'In Progress', urutan: 5 },
      { nama: 'Testing, Commissioning & Energize', bobot: 5, rencana: 0, realisasi: 0, status: 'Pending', urutan: 6 },
    ],
    scurves: [
      { minggu: 'M-1 (Jun 23)', rencana: 6.0, realisasi: 5.8, urutan: 1 },
      { minggu: 'M-6 (Agu 23)', rencana: 20.0, realisasi: 18.2, urutan: 2 },
      { minggu: 'M-12 (Nov 23)', rencana: 42.0, realisasi: 36.5, urutan: 3 },
      { minggu: 'M-18 (Feb 24)', rencana: 58.0, realisasi: 49.0, urutan: 4 },
      { minggu: 'M-24 (Mei 24)', rencana: 74.0, realisasi: 61.5, urutan: 5 },
      { minggu: 'M-30 (Agu 24)', rencana: 86.0, realisasi: 73.2, urutan: 6 },
      { minggu: 'M-34 (Okt 24)', rencana: 100.0, realisasi: null, urutan: 7 },
    ],
    kendalas: [
      { kode_kendala: 'K-02', kategori: 'Lahan / Sosial', deskripsi: 'Sengketa lahan 3 tapak tower (T.18, T.19, T.20) di kawasan Cikeas.', dampak: 'Hambatan progres stringing & erection.', tindakan_mitigasi: 'Mediasi pemilik lahan & koordinasi camat.', status: 'Open', tgl_lapor: '2024-07-05', tgl_selesai: null },
    ],
    dokumentasis: [
      { judul: 'Pekerjaan Erection Tower T.15 Rangka Baja', tahap: 'Erection Tower', foto: SEED_PLACEHOLDER_PHOTO, tgl: '2024-06-25', keterangan: 'Perakitan rangka baja tower type 150 kV.' },
    ],
    terminBayars: [
      Termin(112000000000)('Termin I (Uang Muka)', 20, 'Terbayar', '2023-06-20'),
      Termin(112000000000)('Termin II', 20, 'Terbayar', '2023-11-10'),
      Termin(112000000000)('Termin III', 25, 'Terbayar', '2024-05-05'),
      Termin(112000000000)('Termin IV', 25, 'Belum Bayar'),
      Termin(112000000000)('Retensi (Pemeliharaan)', 10, 'Belum Bayar'),
    ],
  }),

  P({
    kode: 'GITET-500-MTW', nama: 'Pembangunan GITET 500 kV Muara Tawar Extension',
    tipe: 'GITET (Ekstra Tinggi)', tegangan: '500 kV', uip: 'UIP JBB (Jawa Bagian Barat)', upp: 'UPP JBB 2',
    lokasi: 'Bekasi, Jawa Barat', latitude: -6.1118, longitude: 106.9934,
    kontraktor: 'Consortium Hyundai Engineering & PT Barata Indonesia', nomor_kontrak: '0088.PJ/KON.01/UIP-JBB/2022',
    nilai_kontrak: 265000000000, tgl_mulai: '2023-01-10', target_cod: '2024-09-30',
    status: 'Testing', progres_rencana: 98.0, progres_realisasi: 97.4, deviasi: -0.6, penyerapan_anggaran: 94.2,
    deskripsi: 'Perluasan GITET 500 kV Muara Tawar untuk mendukung keandalan Jawa-Bali.',
    milestones: [
      { nama: 'Lahan & Soil Improvement', bobot: 15, rencana: 100, realisasi: 100, status: 'Done', urutan: 1 },
      { nama: 'Sipil Switchyard 500 kV & GIS Building', bobot: 25, rencana: 100, realisasi: 100, status: 'Done', urutan: 2 },
      { nama: 'Pemasangan GIS 500 kV', bobot: 35, rencana: 100, realisasi: 100, status: 'Done', urutan: 3 },
      { nama: 'Kabel Tenaga 500 kV & Interkoneksi Busbar', bobot: 15, rencana: 100, realisasi: 98, status: 'In Progress', urutan: 4 },
      { nama: 'Testing, Commissioning & Energizing', bobot: 10, rencana: 80, realisasi: 74, status: 'In Progress', urutan: 5 },
    ],
    scurves: [
      { minggu: 'M-4 (Apr 23)', rencana: 15.0, realisasi: 15.5, urutan: 1 },
      { minggu: 'M-12 (Agu 23)', rencana: 38.0, realisasi: 39.0, urutan: 2 },
      { minggu: 'M-20 (Des 23)', rencana: 62.0, realisasi: 60.5, urutan: 3 },
      { minggu: 'M-28 (Apr 24)', rencana: 82.0, realisasi: 80.0, urutan: 4 },
      { minggu: 'M-34 (Jul 24)', rencana: 94.0, realisasi: 93.8, urutan: 5 },
      { minggu: 'M-38 (Agu 24)', rencana: 98.0, realisasi: 97.4, urutan: 6 },
      { minggu: 'M-40 (Sep 24)', rencana: 100.0, realisasi: null, urutan: 7 },
    ],
    kendalas: [],
    dokumentasis: [
      { judul: 'Pemasangan SF6 Gas Insulated Switchgear (GIS) 500 kV', tahap: 'Elektrikal GIS', foto: SEED_PLACEHOLDER_PHOTO, tgl: '2024-04-12', keterangan: 'Instalasi modul GIS di dalam building.' },
    ],
    terminBayars: [
      Termin(265000000000)('Termin I (Uang Muka)', 15, 'Terbayar', '2023-02-15'),
      Termin(265000000000)('Termin II', 20, 'Terbayar', '2023-07-10'),
      Termin(265000000000)('Termin III', 25, 'Terbayar', '2023-12-12'),
      Termin(265000000000)('Termin IV', 20, 'Terbayar', '2024-05-20'),
      Termin(265000000000)('Prestasi Akhir', 10, 'Terbayar', '2024-08-15'),
      Termin(265000000000)('Retensi (Pemeliharaan)', 10, 'Belum Bayar'),
    ],
  }),

  P({
    kode: 'PLTS-50-KRG', nama: 'Pembangunan PLTS Terapung Cirata Tahap II 50 MWp',
    tipe: 'Pembangkit EBT (PLTS)', tegangan: '20 kV / 150 kV', uip: 'UIP JBT (Jawa Bagian Tengah)', upp: 'UPP JBT 1',
    lokasi: 'Purwakarta, Jawa Barat', latitude: -6.7022, longitude: 107.3621,
    kontraktor: 'PT PLN Nusantara Power - Masdar JV', nomor_kontrak: '0331.PJ/EBT.01/UIP-JBT/2023',
    nilai_kontrak: 490000000000, tgl_mulai: '2023-11-01', target_cod: '2025-03-31',
    status: 'In Progress', progres_rencana: 45.0, progres_realisasi: 47.8, deviasi: 2.8, penyerapan_anggaran: 42.0,
    deskripsi: 'Pembangkit listrik tenaga surya terapung tahap II di Waduk Cirata.',
    milestones: [
      { nama: 'Studi Batimetri & Anchor Design', bobot: 10, rencana: 100, realisasi: 100, status: 'Done', urutan: 1 },
      { nama: 'Fabrikasi & Mooring Anchor System di Danau', bobot: 20, rencana: 100, realisasi: 100, status: 'Done', urutan: 2 },
      { nama: 'Pemasangan Floater Array & PV Modules Solar', bobot: 35, rencana: 50, realisasi: 55, status: 'In Progress', urutan: 3 },
      { nama: 'Instalasi Inverter & Underwater Cable', bobot: 20, rencana: 25, realisasi: 28, status: 'In Progress', urutan: 4 },
      { nama: 'Switchyard Interconnection & Booster Transformer', bobot: 10, rencana: 10, realisasi: 12, status: 'In Progress', urutan: 5 },
      { nama: 'Grid Integration, Test & COD', bobot: 5, rencana: 0, realisasi: 0, status: 'Pending', urutan: 6 },
    ],
    scurves: [
      { minggu: 'M-4 (Des 23)', rencana: 8.0, realisasi: 8.5, urutan: 1 },
      { minggu: 'M-12 (Feb 24)', rencana: 20.0, realisasi: 21.0, urutan: 2 },
      { minggu: 'M-20 (Apr 24)', rencana: 32.0, realisasi: 34.2, urutan: 3 },
      { minggu: 'M-28 (Jun 24)', rencana: 40.0, realisasi: 42.5, urutan: 4 },
      { minggu: 'M-34 (Agu 24)', rencana: 45.0, realisasi: 47.8, urutan: 5 },
      { minggu: 'M-44 (Des 24)', rencana: 75.0, realisasi: null, urutan: 6 },
    ],
    kendalas: [],
    dokumentasis: [
      { judul: 'Perakitan Array Floater Modul Surya', tahap: 'Floater Assembly', foto: SEED_PLACEHOLDER_PHOTO, tgl: '2024-07-10', keterangan: 'Perakitan floaters di permukaan danau.' },
    ],
    terminBayars: [
      Termin(490000000000)('Termin I (Uang Muka)', 15, 'Terbayar', '2023-12-05'),
      Termin(490000000000)('Termin II', 20, 'Terbayar', '2024-04-18'),
      Termin(490000000000)('Termin III', 20, 'Belum Bayar'),
      Termin(490000000000)('Termin IV', 25, 'Belum Bayar'),
      Termin(490000000000)('Termin V', 10, 'Belum Bayar'),
      Termin(490000000000)('Retensi (Pemeliharaan)', 10, 'Belum Bayar'),
    ],
  }),

  P({
    kode: 'SKTT-150-SNY-GBR', nama: 'Pembangunan SKTT 150 kV Senayan Baru - Gambir Lama',
    tipe: 'SKTT (Kabel Tanah)', tegangan: '150 kV', uip: 'UIP JBB (Jawa Bagian Barat)', upp: 'UPP JBB 3',
    lokasi: 'Jakarta Pusat - Jakarta Selatan, DKI Jakarta', latitude: -6.2088, longitude: 106.8186,
    kontraktor: 'PT Wijaya Karya (Persero) Tbk - Sumitomo Electric', nomor_kontrak: '0402.PJ/KON.01/UIP-JBB/2023',
    nilai_kontrak: 178000000000, tgl_mulai: '2023-09-01', target_cod: '2024-12-20',
    status: 'In Progress', progres_rencana: 71.0, progres_realisasi: 70.2, deviasi: -0.8, penyerapan_anggaran: 65.4,
    deskripsi: 'Penanaman kabel tanah tegangan tinggi di jalur perkotaan DKI Jakarta.',
    milestones: [
      { nama: 'Perizinan Jalur Utilitas DKI & Rekomtek Dishub', bobot: 15, rencana: 100, realisasi: 100, status: 'Done', urutan: 1 },
      { nama: 'Pekerjaan HDD & Manhole', bobot: 30, rencana: 90, realisasi: 90, status: 'In Progress', urutan: 2 },
      { nama: 'Penarikan Kabel SKTT 150 kV 1x1000 mm2', bobot: 30, rencana: 65, realisasi: 62, status: 'In Progress', urutan: 3 },
      { nama: 'Jointing & Termination Box Outdoor', bobot: 15, rencana: 40, realisasi: 38, status: 'In Progress', urutan: 4 },
      { nama: 'Testing & Energize', bobot: 10, rencana: 0, realisasi: 0, status: 'Pending', urutan: 5 },
    ],
    scurves: [
      { minggu: 'M-1 (Okt 23)', rencana: 6.0, realisasi: 6.0, urutan: 1 },
      { minggu: 'M-8 (Des 23)', rencana: 22.0, realisasi: 21.5, urutan: 2 },
      { minggu: 'M-16 (Mar 24)', rencana: 42.0, realisasi: 40.5, urutan: 3 },
      { minggu: 'M-24 (Mei 24)', rencana: 58.0, realisasi: 57.0, urutan: 4 },
      { minggu: 'M-32 (Agu 24)', rencana: 71.0, realisasi: 70.2, urutan: 5 },
      { minggu: 'M-40 (Des 24)', rencana: 100.0, realisasi: null, urutan: 6 },
    ],
    kendalas: [
      { kode_kendala: 'K-05', kategori: 'Teknis / Utilitas', deskripsi: 'Crossing utilitas pipa PAM & fiber optic di Gatot Subroto, pengerjaan malam hari saja.', dampak: 'Keterbatasan jam kerja HDD.', tindakan_mitigasi: 'Penjadwalan shift malam & koordinasi pemilik utilitas.', status: 'Open', tgl_lapor: '2024-07-28', tgl_selesai: null },
    ],
    dokumentasis: [
      { judul: 'Pekerjaan HDD & Pemasangan Pipa Conduit HDPE', tahap: 'Sipil HDD', foto: SEED_PLACEHOLDER_PHOTO, tgl: '2024-06-15', keterangan: 'Horizontal directional drilling crossing jalan.' },
    ],
    terminBayars: [
      Termin(178000000000)('Termin I (Uang Muka)', 20, 'Terbayar', '2023-10-10'),
      Termin(178000000000)('Termin II', 25, 'Terbayar', '2024-02-25'),
      Termin(178000000000)('Termin III', 25, 'Terbayar', '2024-06-18'),
      Termin(178000000000)('Termin IV', 20, 'Belum Bayar'),
      Termin(178000000000)('Retensi (Pemeliharaan)', 10, 'Belum Bayar'),
    ],
  }),

  P({
    kode: 'GI-150-MKS', nama: 'Pembangunan Gardu Induk 150 kV Daya Baru (Makassar)',
    tipe: 'Gardu Induk (GI)', tegangan: '150 kV', uip: 'UIP SULAWESI', upp: 'UPP Sulsel',
    lokasi: 'Makassar, Sulawesi Selatan', latitude: -5.1354, longitude: 119.4938,
    kontraktor: 'PT Pembangunan Perumahan (PP) - PT Hitachi Sakti', nomor_kontrak: '0198.PJ/KON.01/UIP-SUL/2023',
    nilai_kontrak: 92000000000, tgl_mulai: '2023-04-01', target_cod: '2024-07-31',
    status: 'COD / Energized', progres_rencana: 100.0, progres_realisasi: 100.0, deviasi: 0.0, penyerapan_anggaran: 100.0,
    deskripsi: 'Pembangunan GI 150 kV untuk suplai kawasan industri Makassar.',
    milestones: [
      { nama: 'Pembebasan Lahan & Perizinan', bobot: 10, rencana: 100, realisasi: 100, status: 'Done', urutan: 1 },
      { nama: 'Pekerjaan Sipil & Gedung Kontrol', bobot: 25, rencana: 100, realisasi: 100, status: 'Done', urutan: 2 },
      { nama: 'Pemasangan Trafo 60 MVA & Switchyard', bobot: 35, rencana: 100, realisasi: 100, status: 'Done', urutan: 3 },
      { nama: 'Panel Proteksi, SCADA & Telekomunikasi', bobot: 15, rencana: 100, realisasi: 100, status: 'Done', urutan: 4 },
      { nama: 'Testing, Commissioning & Energizing (COD)', bobot: 15, rencana: 100, realisasi: 100, status: 'Done', urutan: 5 },
    ],
    scurves: [
      { minggu: 'M-4 (Mei 23)', rencana: 18.0, realisasi: 19.0, urutan: 1 },
      { minggu: 'M-12 (Sep 23)', rencana: 45.0, realisasi: 46.2, urutan: 2 },
      { minggu: 'M-20 (Jan 24)', rencana: 70.0, realisasi: 72.0, urutan: 3 },
      { minggu: 'M-28 (Mei 24)', rencana: 90.0, realisasi: 91.5, urutan: 4 },
      { minggu: 'M-32 (Jul 24)', rencana: 100.0, realisasi: 100.0, urutan: 5 },
    ],
    kendalas: [],
    dokumentasis: [
      { judul: 'Seremonial Energize & Uji Beban Pertama GI Daya Baru', tahap: 'Energize COD', foto: SEED_PLACEHOLDER_PHOTO, tgl: '2024-07-28', keterangan: 'Peresmian penyalaan pertama.' },
    ],
    terminBayars: [
      Termin(92000000000)('Termin I (Uang Muka)', 20, 'Terbayar', '2023-05-10'),
      Termin(92000000000)('Termin II', 25, 'Terbayar', '2023-10-15'),
      Termin(92000000000)('Termin III', 25, 'Terbayar', '2024-02-28'),
      Termin(92000000000)('Termin IV', 20, 'Terbayar', '2024-06-30'),
      Termin(92000000000)('Retensi (Pemeliharaan)', 10, 'Terbayar', '2024-08-15'),
    ],
  }),

  P({
    kode: 'SUTET-500-TGT-KRP', nama: 'Pembangunan SUTET 500 kV Tanjung Jati B - Pemalang - Batang',
    tipe: 'SUTET (Transmisi 500 kV)', tegangan: '500 kV', uip: 'UIP JBT (Jawa Bagian Tengah)', upp: 'UPP JBT 3',
    lokasi: 'Batang - Jepara, Jawa Tengah', latitude: -6.9124, longitude: 110.1245,
    kontraktor: 'PT Mega Eltra - KEC International Consortium', nomor_kontrak: '0512.PJ/KON.02/UIP-JBT/2023',
    nilai_kontrak: 385000000000, tgl_mulai: '2023-06-15', target_cod: '2025-06-30',
    status: 'In Progress', progres_rencana: 54.0, progres_realisasi: 56.5, deviasi: 2.5, penyerapan_anggaran: 50.0,
    deskripsi: 'Pembangunan SUTET 500 kV Jawa Bagian Tengah untuk penguatan transmisi.',
    milestones: [
      { nama: 'Pembebasan 210 Tapak Tower & RoW', bobot: 25, rencana: 95, realisasi: 96, status: 'In Progress', urutan: 1 },
      { nama: 'Pekerjaan Pondasi Tower (Stub 500 kV)', bobot: 30, rencana: 65, realisasi: 68, status: 'In Progress', urutan: 2 },
      { nama: 'Erection Tower 4-Circuit 500 kV', bobot: 25, rencana: 40, realisasi: 44, status: 'In Progress', urutan: 3 },
      { nama: 'Stringing Conductor 4x Zebra & OPGW', bobot: 15, rencana: 15, realisasi: 18, status: 'In Progress', urutan: 4 },
      { nama: 'Testing, Commissioning & Energize', bobot: 5, rencana: 0, realisasi: 0, status: 'Pending', urutan: 5 },
    ],
    scurves: [
      { minggu: 'M-6 (Okt 23)', rencana: 10.0, realisasi: 11.0, urutan: 1 },
      { minggu: 'M-14 (Feb 24)', rencana: 26.0, realisasi: 28.0, urutan: 2 },
      { minggu: 'M-22 (Jun 24)', rencana: 42.0, realisasi: 44.5, urutan: 3 },
      { minggu: 'M-28 (Agu 24)', rencana: 54.0, realisasi: 56.5, urutan: 4 },
    ],
    kendalas: [],
    dokumentasis: [
      { judul: 'Pekerjaan Erection Tower Tension 500 kV', tahap: 'Erection Tower', foto: SEED_PLACEHOLDER_PHOTO, tgl: '2024-07-30', keterangan: 'Perakitan tower tension tipe 500 kV.' },
    ],
    terminBayars: [
      Termin(385000000000)('Termin I (Uang Muka)', 15, 'Terbayar', '2023-07-20'),
      Termin(385000000000)('Termin II', 20, 'Terbayar', '2024-01-15'),
      Termin(385000000000)('Termin III', 15, 'Terbayar', '2024-06-10'),
      Termin(385000000000)('Termin IV', 30, 'Belum Bayar'),
      Termin(385000000000)('Termin V', 15, 'Belum Bayar'),
      Termin(385000000000)('Retensi (Pemeliharaan)', 5, 'Belum Bayar'),
    ],
  }),

  P({
    kode: 'GI-150-MED', nama: 'Pembangunan Gardu Induk 150 kV Medan Industrial Park',
    tipe: 'Gardu Induk (GI)', tegangan: '150 kV', uip: 'UIP SUMBAGUT (Sumatera Bagian Utara)', upp: 'UPP Sumbagut 1',
    lokasi: 'Medan, Sumatera Utara', latitude: 3.6667, longitude: 98.6833,
    kontraktor: 'PT Medco Energi Konstruksi - Alstom', nomor_kontrak: '0621.PJ/KON.01/UIP-SBU/2023',
    nilai_kontrak: 79000000000, tgl_mulai: '2023-10-01', target_cod: '2024-11-15',
    status: 'Critical', progres_rencana: 82.0, progres_realisasi: 69.5, deviasi: -12.5, penyerapan_anggaran: 62.0,
    deskripsi: 'Suplai daya untuk kawasan Medan Industrial Park.',
    milestones: [
      { nama: 'Lahan & Soil Improvement', bobot: 15, rencana: 100, realisasi: 100, status: 'Done', urutan: 1 },
      { nama: 'Sipil & Pondasi Trafo', bobot: 25, rencana: 100, realisasi: 85, status: 'In Progress', urutan: 2 },
      { nama: 'Pemasangan Transformator Daya & Switchyard', bobot: 35, rencana: 80, realisasi: 60, status: 'In Progress', urutan: 3 },
      { nama: 'Wiring & Control Panel Protection', bobot: 15, rencana: 50, realisasi: 35, status: 'In Progress', urutan: 4 },
      { nama: 'Testing & COD', bobot: 10, rencana: 0, realisasi: 0, status: 'Pending', urutan: 5 },
    ],
    scurves: [
      { minggu: 'M-4 (Des 23)', rencana: 12.0, realisasi: 11.5, urutan: 1 },
      { minggu: 'M-12 (Mar 24)', rencana: 35.0, realisasi: 30.0, urutan: 2 },
      { minggu: 'M-20 (Mei 24)', rencana: 58.0, realisasi: 48.0, urutan: 3 },
      { minggu: 'M-28 (Agu 24)', rencana: 82.0, realisasi: 69.5, urutan: 4 },
    ],
    kendalas: [
      { kode_kendala: 'K-08', kategori: 'Vendor / Manpower', deskripsi: 'Kekurangan tenaga kerja tersertifikasi tegangan tinggi.', dampak: 'Lambatnya instalasi switchyard.', tindakan_mitigasi: 'Rekrutmen dan surat peringatan SP-1 ke vendor.', status: 'Open', tgl_lapor: '2024-08-02', tgl_selesai: null },
    ],
    dokumentasis: [
      { judul: 'Pemasangan Trafo Daya 60 MVA di Dudukan Pondasi', tahap: 'Elektromekanikal', foto: SEED_PLACEHOLDER_PHOTO, tgl: '2024-06-20', keterangan: 'Instalasi transformator daya pada pondasi.' },
    ],
    terminBayars: [
      Termin(79000000000)('Termin I (Uang Muka)', 20, 'Terbayar', '2023-11-10'),
      Termin(79000000000)('Termin II', 20, 'Terbayar', '2024-04-15'),
      Termin(79000000000)('Termin III', 25, 'Terbayar', '2024-07-20'),
      Termin(79000000000)('Termin IV', 15, 'Belum Bayar'),
      Termin(79000000000)('Retensi (Pemeliharaan)', 20, 'Belum Bayar'),
    ],
  }),
];