# Security Matrix PLN Pro-Track

Matriks ini merupakan aturan tetap yang ditegakkan server. Admin mengubah penugasan pengguna, bukan mengedit definisi izin bebas. Menu yang terlihat tidak menggantikan pemeriksaan API.

| Kewenangan | Superadmin teknis | Admin Unit Induk | Admin UPT |
|---|---|---|---|
| Master organisasi | Kelola | Kelola | Baca unit sendiri |
| Penetapan admin dan keanggotaan lintas UPT | Kelola | Kelola | Tidak |
| Pengguna non-admin | Kelola | Kelola | UPT sendiri |
| Password global akun lintas UPT | Kelola | Kelola | Tidak |
| Pantau proyek/laporan | Seluruh unit aktif melalui pilihan unit atau Pantau semua unit (read-only) | Seluruh UPT di bawah Unit Induk | UPT sendiri |
| Buat/edit/hapus proyek | Sesuai keanggotaan operasional | Tidak pada proyek UPT | UPT sendiri |
| Agenda internal | Unit aktif terpilih; Pantau semua mencakup agenda internal Unit Induk (read-only) | Unit Induk sendiri | UPT sendiri |
| Approval tahap Unit Induk | Hanya jika memiliki peran Unit Induk | Tahap Unit Induk | Tidak |
| Mengganti approval peran lain | Tidak | Tidak | Tidak |
| Security Matrix | Baca | Baca | Baca |

## Peran operasional

- Dalkon UPT menjalankan pekerjaan pengawasan dan approval tahap ULTG pada unitnya.
- Engineering UPT menjalankan kewenangan engineering dan approval tahap UPT pada unitnya.
- Vendor hanya mengakses proyek penugasannya pada UPT aktif. Vendor boleh membuat proyek dalam UPT keanggotaannya dan otomatis ditugaskan ke proyek tersebut.
- Staff membaca data unit sesuai scope; tidak melakukan perubahan.
- Unit Induk dapat memantau UPT dan melakukan approval tahap yang sah. Hak pemantauan tidak memberikan hak mengubah proyek UPT.

## Batas keamanan

Setiap akses memeriksa identitas aktif, versi izin, unit/konteks aktif, peran keanggotaan, tindakan, dan kepemilikan resource. Akun lintas UPT memilih konteks terpisah per tab. Root superadmin dapat memilih unit aktif atau `all` untuk baca-saja; unit tanpa membership ditandai `role: null` dan tidak memperoleh capability mutasi. Konteks kosong tidak memberikan akses global. Agenda internal Unit Induk tidak dikirim ke UPT.

Pembatasan mencakup file langsung, ekspor, rekap, PIC, pilihan proyek, GIS, dashboard, notifikasi, cache dan SSE. Perubahan role, keanggotaan, dan penugasan dicatat tanpa password/token. Pencabutan izin berlaku pada permintaan berikutnya serta stream yang sudah terbuka.

## Temuan dependensi di luar perubahan RBAC

Audit baca-saja pada 5 November 2026 dengan `npm audit --omit=dev --json` melaporkan 13 paket produksi terdampak: 1 critical, 7 high, dan 5 moderate. Jumlah ini mencakup paket transitif, bukan 13 eksploitasi yang terpisah. Lockfile dan versi dependensi tidak diubah dalam rilis isolasi UPT.

Jalur yang perlu ditinjau mencakup Express melalui `proxy-addr` dan `body-parser`, ExcelJS melalui dependensi arsip, React Router, serta rantai `@vercel/blob`. Cabang snapshot Blob tidak dipakai oleh deployment PostgreSQL ini. Parser JSON dan penentuan alamat klien Express tetap merupakan permukaan aplikasi yang relevan; kelulusan pengujian RBAC tidak menghapus temuan tersebut. Pembaruan dependensi perlu dilakukan sebagai perubahan terpisah dengan pengujian regresi.
