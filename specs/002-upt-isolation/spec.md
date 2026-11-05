# Isolasi UPT dan Data Awal Bersih

Status: approved for implementation, 2026-11-05.

## User scenarios

1. Pusat mengisi satu Unit Induk dan enam UPT dengan nama asli, menetapkan admin dan keanggotaan. Tidak ada nama unit produksi rekaan.
2. Pengguna memilih unit aktif per tab. Pegawai hanya mengakses unit tersebut; vendor hanya proyek penugasannya, termasuk proyek yang ia buat sendiri dan otomatis ditugaskan kepadanya.
3. Unit Induk memantau seluruh UPT dan menyetujui tahap yang sah, tanpa mengedit proyek UPT. Agenda internal Unit Induk tidak terlihat oleh UPT.
4. Admin UPT mengelola pengguna non-admin unit sendiri. Penetapan admin, akses lintas unit, dan reset kredensial global akun multi-unit hanya oleh pusat.
5. Seluruh menu bisnis ditampilkan sesuai capability, ditambah organisasi dan Security Matrix baca-saja. Admin tidak menjadi bypass approval.

## Requirements

- Identitas global beremail unik; keanggotaan/peran per unit, penugasan vendor per proyek, status aktif dan versi izin.
- Semua API, resource anak, berkas, pencarian, laporan, ekspor, PIC, cache dan realtime memakai otorisasi server yang sama; konteks kosong bukan seluruh data.
- Satu database PostgreSQL; ownership unit dan foreign key konsisten. Teks uip/upp bukan dasar akses.
- Identitas dan keanggotaan diperiksa ulang dari database. Pencabutan izin memutus akses dan stream lama.
- Approval ULTG oleh Dalkon UPT, UPT oleh Engineering UPT, Unit Induk oleh admin Unit Induk; tetap berurutan.
- Backup dan restore sebelum pembersihan seluruh transaksi. Pertahankan admin utama dan akun asli, hapus akun contoh teridentifikasi. Seed normal mati; fixture hanya untuk test terisolasi.
- Audit perubahan akun, role, keanggotaan dan penugasan tanpa menyimpan rahasia.
- Data lama tanpa unit tidak boleh ditebak dari uip/upp atau dibuka kepada UPT; pemetaan pusat eksplisit sebelum aktivasi.

## Acceptance

Uji dua UPT, vendor berbeda proyek, akun multi-UPT, Unit Induk dan superadmin. ID silang, file langsung, ekspor, PIC, approval, scope palsu/kosong, cache dan SSE tidak membocorkan data. Dua tab tidak berbagi konteks. Setelah rollout transaksi kosong dan admin dapat mengisi master asli. Test PostgreSQL dan PGlite serta build lulus. Backup dapat direstore. Rollback tidak membuka kode global lama ke data multi-UPT. HANDOFF tidak diubah tanpa persetujuan.
