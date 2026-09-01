/**
 * PLN Pro-Track - Initial Project Dataset
 * Realistic Indonesian PLN Construction Projects
 */

const INITIAL_PROJECTS = [
  {
    id: "PRJ-2024-001",
    kode: "GI-150-SRP",
    nama: "Pembangunan Gardu Induk 150 kV Serpong II (Ext 2 LB)",
    tipe: "Gardu Induk (GI)",
    tegangan: "150 kV",
    uip: "UIP JBB (Jawa Bagian Barat)",
    upp: "UPP JBB 1",
    lokasi: "Tangerang Selatan, Banten",
    koordinat: [-6.3025, 106.6622],
    kontraktor: "PT Rekayasa Industri - Siemens Konsorsium",
    nomorKontrak: "0142.PJ/KON.01/UIP-JBB/2023",
    nilaiKontrak: 84500000000, // Rp 84.5 M
    tglMulai: "2023-08-15",
    targetCOD: "2024-11-30",
    status: "In Progress", // "Planning", "In Progress", "Critical", "Testing", "COD / Energized"
    progresRencana: 78.5,
    progresRealisasi: 82.3,
    deviasi: 3.8, // +3.8% (Ahead)
    penyerapanAnggaran: 75.0,
    deskripsi: "Peningkatan keandalan pasokan listrik kawasan industri dan residensial Serpong & BSD dengan penambahan 2 Line Bay 150 kV dan Trafo Daya 60 MVA.",
    milestones: [
      { id: "m1", nama: "Perizinan & Pembebasan Lahan", bobot: 10, rencana: 100, realisasi: 100, status: "Done" },
      { id: "m2", nama: "Pekerjaan Sipil & Pondasi Gedung Kontrol", bobot: 25, rencana: 100, realisasi: 100, status: "Done" },
      { id: "m3", nama: "Pengadaan & Fabrikasi Peralatan Utama", bobot: 30, rencana: 95, realisasi: 98, status: "In Progress" },
      { id: "m4", nama: "Instalasi Elektromekanikal & Switchyard", bobot: 20, rencana: 60, realisasi: 68, status: "In Progress" },
      { id: "m5", nama: "Individual & Function Test", bobot: 10, rencana: 15, realisasi: 20, status: "In Progress" },
      { id: "m6", nama: "Commissioning & Energize (COD)", bobot: 5, rencana: 0, realisasi: 0, status: "Pending" }
    ],
    kurvaS: [
      { minggu: "M-1 (Sep '23)", rencana: 5.0, realisasi: 5.2 },
      { minggu: "M-4 (Okt '23)", rencana: 12.0, realisasi: 11.5 },
      { minggu: "M-8 (Des '23)", rencana: 24.0, realisasi: 25.0 },
      { minggu: "M-12 (Feb '24)", rencana: 38.0, realisasi: 40.2 },
      { minggu: "M-16 (Apr '24)", rencana: 52.0, realisasi: 55.0 },
      { minggu: "M-20 (Jun '24)", rencana: 65.0, realisasi: 69.4 },
      { minggu: "M-24 (Agu '24)", rencana: 78.5, realisasi: 82.3 },
      { minggu: "M-28 (Okt '24)", rencana: 92.0, realisasi: null },
      { minggu: "M-32 (Nov '24)", rencana: 100.0, realisasi: null }
    ],
    kendala: [
      {
        id: "K-01",
        kategori: "Material",
        deskripsi: "Kedatangan Current Transformer (CT) 150 kV dari pabrikan impor sempat tertunda 2 minggu karena clearance bea cukai.",
        dampak: "Jadwal instalasi switchyard bay 2 sempat mundur.",
        tindakanMitigasi: "Akselerasi tim vendor untuk lembur instalasi begitu material tiba di site.",
        status: "Resolved",
        tglLapor: "2024-06-10"
      }
    ],
    dokumentasi: [
      {
        id: "doc-1",
        judul: "Pondasi Gantry & Trafo Daya 60 MVA",
        tgl: "2024-05-18",
        tahap: "Sipil & Konstruksi",
        foto: "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80"
      },
      {
        id: "doc-2",
        judul: "Erection Disconnecting Switch (DS) & Circuit Breaker (CB)",
        tgl: "2024-07-22",
        tahap: "Elektromekanikal",
        foto: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80"
      }
    ]
  },
  {
    id: "PRJ-2024-002",
    kode: "SUTT-150-CBN-GDL",
    nama: "Pembangunan SUTT 150 kV Cibinong - Gandul Incomer",
    tipe: "SUTT (Transmisi)",
    tegangan: "150 kV",
    uip: "UIP JBT (Jawa Bagian Tengah)",
    upp: "UPP JBT 2",
    lokasi: "Bogor - Depok, Jawa Barat",
    koordinat: [-6.4251, 106.8524],
    kontraktor: "PT Bukaka Teknik Utama Tbk",
    nomorKontrak: "0219.PJ/KON.02/UIP-JBT/2023",
    nilaiKontrak: 112000000000, // Rp 112 M
    tglMulai: "2023-05-10",
    targetCOD: "2024-10-15",
    status: "Critical", // Terlambat/Kritis
    progresRencana: 86.0,
    progresRealisasi: 73.2,
    deviasi: -12.8, // -12.8% (Delay)
    penyerapanAnggaran: 68.5,
    deskripsi: "Pembangunan 42 Tapak Tower SUTT 150 kV untuk evakuasi daya memperkuat subsistem kelistrikan Depok & Bogor Selatan.",
    milestones: [
      { id: "m1", nama: "Inventarisasi & Pembebasan Lahan (42 Tapak)", bobot: 20, rencana: 100, realisasi: 90.5, status: "In Progress" },
      { id: "m2", nama: "Pekerjaan Pondasi Tower (Stub & Bored Pile)", bobot: 25, rencana: 100, realisasi: 85.0, status: "In Progress" },
      { id: "m3", nama: "Erection Tower (Rangka Baja)", bobot: 25, rencana: 85, realisasi: 65.0, status: "In Progress" },
      { id: "m4", nama: "Stringing & Penarikan Konduktor (ACSR)", bobot: 20, rencana: 60, realisasi: 30.0, status: "In Progress" },
      { id: "m5", nama: "ROW Clearing & Right of Way Compensation", bobot: 5, rencana: 70, realisasi: 50.0, status: "In Progress" },
      { id: "m6", nama: "Testing, Commissioning & Energize", bobot: 5, rencana: 0, realisasi: 0, status: "Pending" }
    ],
    kurvaS: [
      { minggu: "M-1 (Jun '23)", rencana: 6.0, realisasi: 5.8 },
      { minggu: "M-6 (Agu '23)", rencana: 20.0, realisasi: 18.2 },
      { minggu: "M-12 (Nov '23)", rencana: 42.0, realisasi: 36.5 },
      { minggu: "M-18 (Feb '24)", rencana: 58.0, realisasi: 49.0 },
      { minggu: "M-24 (Mei '24)", rencana: 74.0, realisasi: 61.5 },
      { minggu: "M-30 (Agu '24)", rencana: 86.0, realisasi: 73.2 },
      { minggu: "M-34 (Okt '24)", rencana: 100.0, realisasi: null }
    ],
    kendala: [
      {
        id: "K-02",
        kategori: "Lahan / Sosial",
        deskripsi: "Terdapat 3 tapak tower (T.18, T.19, T.20) di area Cikeas yang terkendala sengketa kepemilikan tanah warga.",
        dampak: "Pekerjaan pondasi dan erection tower terhenti selama 6 minggu.",
        tindakanMitigasi: "Konsinyasi ke Pengadilan Negeri Cibinong dan mediasi intensif bersama Forkopimda & Kejaksaan (Jamdatun).",
        status: "Open",
        tglLapor: "2024-07-05"
      },
      {
        id: "K-03",
        kategori: "Cuaca & Geoteknik",
        deskripsi: "Struktur tanah labil pada T.12 membutuhkan penambahan bore pile sedalam 18 meter.",
        dampak: "Tambahan waktu pengerjaan pondasi 14 hari.",
        tindakanMitigasi: "Mobilisasi mesin bore pile tambahan dari kontraktor.",
        status: "Resolved",
        tglLapor: "2024-06-18"
      }
    ],
    dokumentasi: [
      {
        id: "doc-3",
        judul: "Pekerjaan Erection Tower T.15 Rangka Kisi Baja",
        tgl: "2024-06-25",
        tahap: "Erection Tower",
        foto: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80"
      }
    ]
  },
  {
    id: "PRJ-2024-003",
    kode: "GITET-500-MTW",
    nama: "Pembangunan GITET 500 kV Muara Tawar Extension",
    tipe: "GITET (Ekstra Tinggi)",
    tegangan: "500 kV",
    uip: "UIP JBB (Jawa Bagian Barat)",
    upp: "UPP JBB 2",
    lokasi: "Bekasi, Jawa Barat",
    koordinat: [-6.1118, 106.9934],
    kontraktor: "Consortium Hyundai Engineering & PT Barata Indonesia",
    nomorKontrak: "0088.PJ/KON.01/UIP-JBB/2022",
    nilaiKontrak: 265000000000, // Rp 265 M
    tglMulai: "2023-01-10",
    targetCOD: "2024-09-30",
    status: "Testing", // Testing & Commissioning
    progresRencana: 98.0,
    progresRealisasi: 97.4,
    deviasi: -0.6,
    penyerapanAnggaran: 94.2,
    deskripsi: "Penyaluran pasokan daya 500 kV dari Blok Gas PLTGU Muara Tawar ke sistem interkoneksi 500 kV Jawa-Bali (Looped Grids).",
    milestones: [
      { id: "m1", nama: "Lahan & Soil Improvement (PVD & Preloading)", bobot: 15, rencana: 100, realisasi: 100, status: "Done" },
      { id: "m2", nama: "Sipil Switchyard 500 kV & GIS Building", bobot: 25, rencana: 100, realisasi: 100, status: "Done" },
      { id: "m3", nama: "Pemasangan GIS 500 kV (Gas Insulated Switchgear)", bobot: 35, rencana: 100, realisasi: 100, status: "Done" },
      { id: "m4", nama: "Kabel Tenaga 500 kV & Interkoneksi Busbar", bobot: 15, rencana: 100, realisasi: 98.0, status: "In Progress" },
      { id: "m5", nama: "Testing, Commissioning & Energizing", bobot: 10, rencana: 80, realisasi: 74.0, status: "In Progress" }
    ],
    kurvaS: [
      { minggu: "M-4 (Apr '23)", rencana: 15.0, realisasi: 15.5 },
      { minggu: "M-12 (Agu '23)", rencana: 38.0, realisasi: 39.0 },
      { minggu: "M-20 (Des '23)", rencana: 62.0, realisasi: 60.5 },
      { minggu: "M-28 (Apr '24)", rencana: 82.0, realisasi: 80.0 },
      { minggu: "M-34 (Jul '24)", rencana: 94.0, realisasi: 93.8 },
      { minggu: "M-38 (Agu '24)", rencana: 98.0, realisasi: 97.4 },
      { minggu: "M-40 (Sep '24)", rencana: 100.0, realisasi: null }
    ],
    kendala: [],
    dokumentasi: [
      {
        id: "doc-4",
        judul: "Pemasangan SF6 Gas Insulated Switchgear (GIS) 500 kV",
        tgl: "2024-04-12",
        tahap: "Elektrikal GIS",
        foto: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80"
      },
      {
        id: "doc-5",
        judul: "High Voltage AC Withstand Voltage Test Busbar 500 kV",
        tgl: "2024-08-05",
        tahap: "Testing & Commissioning",
        foto: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80"
      }
    ]
  },
  {
    id: "PRJ-2024-004",
    kode: "PLTS-50-KRG",
    nama: "Pembangunan PLTS Terapung Cirata Tahap II 50 MWp",
    tipe: "Pembangkit EBT (PLTS)",
    tegangan: "20 kV / 150 kV",
    uip: "UIP JBT (Jawa Bagian Tengah)",
    upp: "UPP JBT 1",
    lokasi: "Purwakarta, Jawa Barat",
    koordinat: [-6.7022, 107.3621],
    kontraktor: "PT PLN Nusantara Power - Masdar JV",
    nomorKontrak: "0331.PJ/EBT.01/UIP-JBT/2023",
    nilaiKontrak: 490000000000, // Rp 490 M
    tglMulai: "2023-11-01",
    targetCOD: "2025-03-31",
    status: "In Progress",
    progresRencana: 45.0,
    progresRealisasi: 47.8,
    deviasi: 2.8,
    penyerapanAnggaran: 42.0,
    deskripsi: "Ekspansi kapasitas Pembangkit Listrik Tenaga Surya Terapung Cirata sebesar 50 MWp untuk mendukung transisi energi hijau Net Zero Emission 2060.",
    milestones: [
      { id: "m1", nama: "Studi Batimetri, Bathymetric & Anchor Design", bobot: 10, rencana: 100, realisasi: 100, status: "Done" },
      { id: "m2", nama: "Fabrikasi & Mooring Anchor System di Danau", bobot: 20, rencana: 100, realisasi: 100, status: "Done" },
      { id: "m3", nama: "Pemasangan Floater Array & PV Modules Solar", bobot: 35, rencana: 50, realisasi: 55.0, status: "In Progress" },
      { id: "m4", nama: "Instalasi Inverter & Underwater Interconnecting Cable", bobot: 20, rencana: 25, realisasi: 28.0, status: "In Progress" },
      { id: "m5", nama: "Switchyard Interconnection & Booster Transformer", bobot: 10, rencana: 10, realisasi: 12.0, status: "In Progress" },
      { id: "m6", nama: "Grid Integration, Test & COD", bobot: 5, rencana: 0, realisasi: 0, status: "Pending" }
    ],
    kurvaS: [
      { minggu: "M-4 (Des '23)", rencana: 8.0, realisasi: 8.5 },
      { minggu: "M-12 (Feb '24)", rencana: 20.0, realisasi: 21.0 },
      { minggu: "M-20 (Apr '24)", rencana: 32.0, realisasi: 34.2 },
      { minggu: "M-28 (Jun '24)", rencana: 40.0, realisasi: 42.5 },
      { minggu: "M-34 (Agu '24)", rencana: 45.0, realisasi: 47.8 },
      { minggu: "M-44 (Des '24)", rencana: 75.0, realisasi: null },
      { minggu: "M-56 (Mar '25)", rencana: 100.0, realisasi: null }
    ],
    kendala: [
      {
        id: "K-04",
        kategori: "Lingkungan / Cuaca",
        deskripsi: "Fluktuasi debit air waduk pada musim hujan sempat menghambat pemasangan tali tambat (mooring lines).",
        dampak: "Penyesuaian titik jangkar bawah air.",
        tindakanMitigasi: "Penggunaan tim diver profesional berstandar internasional dan sensor GPS bawah air.",
        status: "Resolved",
        tglLapor: "2024-03-14"
      }
    ],
    dokumentasi: [
      {
        id: "doc-6",
        judul: "Perakitan Array Floater Modul Surya di Area Assembling Danau",
        tgl: "2024-07-10",
        tahap: "Floater Assembly",
        foto: "https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80"
      }
    ]
  },
  {
    id: "PRJ-2024-005",
    kode: "SKTT-150-SNY-GBR",
    nama: "Pembangunan SKTT 150 kV Senayan Baru - Gambir Lama",
    tipe: "SKTT (Kabel Tanah)",
    tegangan: "150 kV",
    uip: "UIP JBB (Jawa Bagian Barat)",
    upp: "UPP JBB 3",
    lokasi: "Jakarta Pusat - Jakarta Selatan, DKI Jakarta",
    koordinat: [-6.2088, 106.8186],
    kontraktor: "PT Wijaya Karya (Persero) Tbk - Sumitomo Electric",
    nomorKontrak: "0402.PJ/KON.01/UIP-JBB/2023",
    nilaiKontrak: 178000000000, // Rp 178 M
    tglMulai: "2023-09-01",
    targetCOD: "2024-12-20",
    status: "In Progress",
    progresRencana: 71.0,
    progresRealisasi: 70.2,
    deviasi: -0.8,
    penyerapanAnggaran: 65.4,
    deskripsi: "Penguatan backbone kelistrikan ring 1 pusat pemerintahan dan kawasan bisnis Sudirman-Thamrin dengan kabel tanah tegangan tinggi (Underground Cable XLPE 150 kV).",
    milestones: [
      { id: "m1", nama: "Perizinan Jalur Utilitas DKI & Rekomtek Dishub", bobot: 15, rencana: 100, realisasi: 100, status: "Done" },
      { id: "m2", nama: "Pekerjaan HDD (Horizontal Directional Drilling) & Manhole", bobot: 30, rencana: 90, realisasi: 90.0, status: "In Progress" },
      { id: "m3", nama: "Penarikan Kabel SKTT 150 kV 1x1000 mm²", bobot: 30, rencana: 65, realisasi: 62.0, status: "In Progress" },
      { id: "m4", nama: "Jointing & Termination Box Outdoor", bobot: 15, rencana: 40, realisasi: 38.0, status: "In Progress" },
      { id: "m5", nama: "Testing & Energize", bobot: 10, rencana: 0, realisasi: 0, status: "Pending" }
    ],
    kurvaS: [
      { minggu: "M-1 (Okt '23)", rencana: 6.0, realisasi: 6.0 },
      { minggu: "M-8 (Des '23)", rencana: 22.0, realisasi: 21.5 },
      { minggu: "M-16 (Mar '24)", rencana: 42.0, realisasi: 40.5 },
      { minggu: "M-24 (Mei '24)", rencana: 58.0, realisasi: 57.0 },
      { minggu: "M-32 (Agu '24)", rencana: 71.0, realisasi: 70.2 },
      { minggu: "M-40 (Des '24)", rencana: 100.0, realisasi: null }
    ],
    kendala: [
      {
        id: "K-05",
        kategori: "Teknis / Utilitas",
        deskripsi: "Persilangan utilitas pipa PAM dan kabel fiber optic eksisting pada ruas jalan Gatot Subroto membutuhkan izin khusus penggalian malam hari.",
        dampak: "Waktu kerja lapangan terbatas pukul 22:00 - 05:00 WIB.",
        tindakanMitigasi: "Menambah shift tenaga ahli jointing dan metode microtunneling.",
        status: "Open",
        tglLapor: "2024-07-28"
      }
    ],
    dokumentasi: [
      {
        id: "doc-7",
        judul: "Pekerjaan HDD & Pemasangan Pipa Conduit HDPE di Bawah Jalur Protokol",
        tgl: "2024-06-15",
        tahap: "Sipil HDD",
        foto: "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80"
      }
    ]
  },
  {
    id: "PRJ-2024-006",
    kode: "GI-150-MKS",
    nama: "Pembangunan Gardu Induk 150 kV Daya Baru (Makassar)",
    tipe: "Gardu Induk (GI)",
    tegangan: "150 kV",
    uip: "UIP SULAWESI",
    upp: "UPP Sulsel",
    lokasi: "Makassar, Sulawesi Selatan",
    koordinat: [-5.1354, 119.4938],
    kontraktor: "PT Pembangunan Perumahan (PP) - PT Hitachi Sakti",
    nomorKontrak: "0198.PJ/KON.01/UIP-SUL/2023",
    nilaiKontrak: 92000000000, // Rp 92 M
    tglMulai: "2023-04-01",
    targetCOD: "2024-07-31",
    status: "COD / Energized", // Selesai Energize
    progresRencana: 100.0,
    progresRealisasi: 100.0,
    deviasi: 0.0,
    penyerapanAnggaran: 100.0,
    deskripsi: "Penyelesaian GI 150 kV 60 MVA untuk memasok kawasan Industri KIMA dan pusat bisnis Kota Makassar.",
    milestones: [
      { id: "m1", nama: "Pembebasan Lahan & Perizinan", bobot: 10, rencana: 100, realisasi: 100, status: "Done" },
      { id: "m2", nama: "Pekerjaan Sipil & Gedung Kontrol", bobot: 25, rencana: 100, realisasi: 100, status: "Done" },
      { id: "m3", nama: "Pemasangan Trafo 60 MVA & Switchyard", bobot: 35, rencana: 100, realisasi: 100, status: "Done" },
      { id: "m4", nama: "Panel Proteksi, SCADA & Telekomunikasi", bobot: 15, rencana: 100, realisasi: 100, status: "Done" },
      { id: "m5", nama: "Testing, Commissioning & Energizing (COD)", bobot: 15, rencana: 100, realisasi: 100, status: "Done" }
    ],
    kurvaS: [
      { minggu: "M-4 (Mei '23)", rencana: 18.0, realisasi: 19.0 },
      { minggu: "M-12 (Sep '23)", rencana: 45.0, realisasi: 46.2 },
      { minggu: "M-20 (Jan '24)", rencana: 70.0, realisasi: 72.0 },
      { minggu: "M-28 (Mei '24)", rencana: 90.0, realisasi: 91.5 },
      { minggu: "M-32 (Jul '24)", rencana: 100.0, realisasi: 100.0 }
    ],
    kendala: [],
    dokumentasi: [
      {
        id: "doc-8",
        judul: "Seremonial Energize & Uji Beban Pertama GI 150 kV Daya Baru",
        tgl: "2024-07-28",
        tahap: "Energize COD",
        foto: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=800&q=80"
      }
    ]
  },
  {
    id: "PRJ-2024-007",
    kode: "SUTET-500-TGT-KRP",
    nama: "Pembangunan SUTET 500 kV Tanjung Jati B - Pemalang - Batang",
    tipe: "SUTET (Transmisi 500 kV)",
    tegangan: "500 kV",
    uip: "UIP JBT (Jawa Bagian Tengah)",
    upp: "UPP JBT 3",
    lokasi: "Batang - Jepara, Jawa Tengah",
    koordinat: [-6.9124, 110.1245],
    kontraktor: "PT Mega Eltra - KEC International Consortium",
    nomorKontrak: "0512.PJ/KON.02/UIP-JBT/2023",
    nilaiKontrak: 385000000000, // Rp 385 M
    tglMulai: "2023-06-15",
    targetCOD: "2025-06-30",
    status: "In Progress",
    progresRencana: 54.0,
    progresRealisasi: 56.5,
    deviasi: 2.5,
    penyerapanAnggaran: 50.0,
    deskripsi: "Transmisi Backbone 500 kV sepanjang 85 km-route untuk mengevakuasi daya PLTU Tanjung Jati B unit 5 & 6 ke pusat beban Jawa bagian barat.",
    milestones: [
      { id: "m1", nama: "Pembebasan 210 Tapak Tower & RoW", bobot: 25, rencana: 95, realisasi: 96.0, status: "In Progress" },
      { id: "m2", nama: "Pekerjaan Pondasi Tower (Stub 500 kV)", bobot: 30, rencana: 65, realisasi: 68.0, status: "In Progress" },
      { id: "m3", nama: "Erection Tower 4-Circuit 500 kV", bobot: 25, rencana: 40, realisasi: 44.0, status: "In Progress" },
      { id: "m4", nama: "Stringing Conductor 4x Zebra & OPGW", bobot: 15, rencana: 15, realisasi: 18.0, status: "In Progress" },
      { id: "m5", nama: "Testing, Commissioning & Energize", bobot: 5, rencana: 0, realisasi: 0, status: "Pending" }
    ],
    kurvaS: [
      { minggu: "M-6 (Okt '23)", rencana: 10.0, realisasi: 11.0 },
      { minggu: "M-14 (Feb '24)", rencana: 26.0, realisasi: 28.0 },
      { minggu: "M-22 (Jun '24)", rencana: 42.0, realisasi: 44.5 },
      { minggu: "M-28 (Agu '24)", rencana: 54.0, realisasi: 56.5 },
      { minggu: "M-40 (Feb '25)", rencana: 78.0, realisasi: null },
      { minggu: "M-52 (Jun '25)", rencana: 100.0, realisasi: null }
    ],
    kendala: [],
    dokumentasi: [
      {
        id: "doc-9",
        judul: "Pekerjaan Erection Tower Tension 500 kV",
        tgl: "2024-07-30",
        tahap: "Erection Tower",
        foto: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80"
      }
    ]
  },
  {
    id: "PRJ-2024-008",
    kode: "GI-150-MED",
    nama: "Pembangunan Gardu Induk 150 kV Medan Industrial Park",
    tipe: "Gardu Induk (GI)",
    tegangan: "150 kV",
    uip: "UIP SUMBAGUT",
    upp: "UPP Sumbagut 1",
    lokasi: "Medan, Sumatera Utara",
    koordinat: [3.6667, 98.6833],
    kontraktor: "PT Medco Energi Konstruksi - Alstom",
    nomorKontrak: "0621.PJ/KON.01/UIP-SBU/2023",
    nilaiKontrak: 79000000000,
    tglMulai: "2023-10-01",
    targetCOD: "2024-11-15",
    status: "Critical",
    progresRencana: 82.0,
    progresRealisasi: 69.5,
    deviasi: -12.5,
    penyerapanAnggaran: 62.0,
    deskripsi: "Suplai listrik andal untuk kawasan industri KIM tahap III dengan kapasitas 2x60 MVA.",
    milestones: [
      { id: "m1", nama: "Lahan & Soil Improvement", bobot: 15, rencana: 100, realisasi: 100, status: "Done" },
      { id: "m2", nama: "Sipil & Pondasi Trafo", bobot: 25, rencana: 100, realisasi: 85.0, status: "In Progress" },
      { id: "m3", nama: "Pemasangan Transformator Daya & Switchyard", bobot: 35, rencana: 80, realisasi: 60.0, status: "In Progress" },
      { id: "m4", nama: "Wiring & Control Panel Protection", bobot: 15, rencana: 50, realisasi: 35.0, status: "In Progress" },
      { id: "m5", nama: "Testing & COD", bobot: 10, rencana: 0, realisasi: 0, status: "Pending" }
    ],
    kurvaS: [
      { minggu: "M-4 (Des '23)", rencana: 12.0, realisasi: 11.5 },
      { minggu: "M-12 (Mar '24)", rencana: 35.0, realisasi: 30.0 },
      { minggu: "M-20 (Mei '24)", rencana: 58.0, realisasi: 48.0 },
      { minggu: "M-28 (Agu '24)", rencana: 82.0, realisasi: 69.5 },
      { minggu: "M-36 (Nov '24)", rencana: 100.0, realisasi: null }
    ],
    kendala: [
      {
        id: "K-08",
        kategori: "Vendor / Manpower",
        deskripsi: "Kekurangan tenaga kerja bersertifikasi kelistrikan tegangan tinggi di site kontraktor.",
        dampak: "Pekerjaan wiring panel dan terminasi trafo mengalami keterlambatan.",
        tindakanMitigasi: "PLN menerbitkan Surat Peringatan (SP-1) dan kontraktor menambah sub-vendor lokal bersertifikasi.",
        status: "Open",
        tglLapor: "2024-08-02"
      }
    ],
    dokumentasi: [
      {
        id: "doc-10",
        judul: "Pemasangan Trafo Daya 60 MVA di Dudukan Pondasi",
        tgl: "2024-06-20",
        tahap: "Elektromekanikal",
        foto: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80"
      }
    ]
  }
];

const MASTER_UIP = [
  "UIP JBB (Jawa Bagian Barat)",
  "UIP JBT (Jawa Bagian Tengah)",
  "UIP JBTB (Jawa Bagian Timur & Bali)",
  "UIP SUMBAGUT (Sumatera Bagian Utara)",
  "UIP SUMBAGTENG (Sumatera Bagian Tengah)",
  "UIP SUMBAGSEL (Sumatera Bagian Selatan)",
  "UIP KALIMANTAN",
  "UIP SULAWESI",
  "UIP MALUKU PAPUA",
  "UIP NUSA TENGGARA"
];

const MASTER_TIPE = [
  "Gardu Induk (GI)",
  "GITET (Ekstra Tinggi)",
  "SUTT (Transmisi)",
  "SUTET (Transmisi 500 kV)",
  "SKTT (Kabel Tanah)",
  "Pembangkit EBT (PLTS)",
  "Pembangkit (PLTA/PLTU)",
  "Jaringan Distribusi (JTM/JTR)"
];
