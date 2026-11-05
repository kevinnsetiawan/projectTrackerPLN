# Data awal PLN Pro-Track

Aplikasi menggunakan satu database PostgreSQL `protrack`. Enam UPT dan satu Unit Induk dipisahkan berdasarkan kepemilikan data serta keanggotaan pengguna, bukan database terpisah.

## Data wajib untuk aktivasi unit

| Master | Kolom yang perlu disiapkan | Penanggung jawab |
|---|---|---|
| Unit Induk | Kode unik, nama resmi | Admin pusat |
| Enam UPT | Kode unik, nama resmi, Unit Induk pemilik | Admin pusat |
| Admin UPT | Nama lengkap, email, UPT | Admin pusat |
| Pengguna | Nama, email, unit, peran: vendor/dalkon/enjin/staff/admin | Admin sesuai kewenangan |
| Vendor | Nama perusahaan/pengguna, email, keanggotaan UPT | Admin pusat/UPT sesuai kewenangan |
| Referensi Gardu Induk | Identitas sumber, nama GI, UPT pemilik, status aktif, koordinat jika tersedia, URL sumber peta | Import operator yang disetujui |

Gunakan nama dan kode organisasi yang sebenarnya. Nama unit produksi tidak dibuat otomatis. Satu email merupakan satu identitas yang dapat memiliki beberapa keanggotaan unit.

## Data operasional saat proyek pertama dibuat

| Data | Isian |
|---|---|
| Proyek | Kode, nama, UPT pemilik, tipe pekerjaan, tegangan, lokasi, kontraktor |
| Kontrak | Nomor kontrak, nilai, tanggal kontrak/SPMK, tanggal mulai, target selesai |
| Akses vendor | Pengguna vendor yang ditugaskan pada proyek tersebut |
| Progres | Tahapan pekerjaan, bobot/BOQ bila digunakan, rencana dan realisasi |
| Lampiran | Dokumen kontrak/drawing/IK dan foto sesuai kebutuhan proyek |
| Agenda | Tanggal, waktu bila ada, pokok rapat, PIC anggota unit, lokasi |

Transaksi dapat dimulai kosong. Vendor yang membuat proyek pada UPT keanggotaannya otomatis ditugaskan ke proyek baru tersebut. Penugasan tambahan diatur pengguna berwenang dalam UPT.

Setiap titik lokasi proyek dapat memiliki referensi Gardu Induk opsional dari UPT proyek yang sama. Lokasi manual tetap didukung. Pilihan GI tidak menimpa nama atau koordinat lokasi; koordinat master yang belum tersedia tetap kosong. Referensi nonaktif yang sudah tersimpan ditampilkan sebagai riwayat dan divalidasi server saat dipertahankan. Hak membaca master GI tidak memperluas penugasan proyek vendor.

Migrasi master Warnoto dikerjakan melalui rencana pemetaan dan dry run operator, bukan bootstrap otomatis. Implementasi dan pengujian lokal tidak mengizinkan impor ke produksi, push, atau deployment; tahap tersebut memerlukan instruksi eksplisit berikutnya.

## Pembersihan awal

Sebelum pembersihan produksi, buat backup dan uji restore. Sesuai persetujuan pengguna, seluruh transaksi proyek/agenda/lampiran beserta turunannya dikosongkan. Admin utama dan akun asli dipertahankan; akun contoh yang dapat diidentifikasi dihapus. Data fixture tidak dijalankan pada penggunaan normal atau instalasi baru.

Nama unit dan daftar pengguna asli belum diberikan pada saat rencana implementasi disetujui. Admin pusat mengisinya melalui pengelolaan organisasi sebelum unit dipakai.
