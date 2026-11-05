# Analisis konsistensi

Requirement readiness telah diperiksa sebelum implementasi. Kontrak helper scope disinkronkan antara pemilik fondasi, router, dan frontend.

## Keputusan pengamanan

- Teks `uip`/`upp` tidak menjadi batas akses. Keanggotaan, ownership unit, dan penugasan proyek merupakan sumber otorisasi.
- Role admin global lama tidak boleh memberi bypass bisnis; khususnya admin UPT tidak dapat menggantikan approval Dalkon, Engineering, atau Unit Induk.
- Vendor boleh membuat proyek pada UPT penugasannya; assignment pembuat harus atomik dengan pembuatan proyek.
- Konteks kosong tidak berarti semua data. Superadmin tanpa membership tetap dapat memakai control plane untuk setup awal tanpa otomatis mendapat izin bisnis.
- Scope file dan anak proyek memvalidasi ID anak terhadap proyeknya. Kendala create dan status engineering dibedakan.
- Event penghapusan proyek memakai scope/audience yang dipercaya sebelum penghapusan; daftar audience internal tidak dikirim ke klien.
- Cache revisi global dihilangkan terlebih dahulu agar hasil antar-unit tidak tercampur. Optimasi berikutnya harus mempertahankan scope yang sama.
- Pendaftaran publik tetap tertutup; identitas/version/keanggotaan diperiksa ulang dari database dan SSE berhenti saat akses dicabut.

## Bukti implementasi dan pengujian

- `test-local.mjs` dan `test-unit-foundation.mjs` lulus pada PGlite dan PostgreSQL 17 terisolasi.
- `test-upt-isolation.mjs` lulus 128 pemeriksaan pada kedua driver. PostgreSQL memakai pool lima koneksi untuk menguji perubahan bersamaan, termasuk perlindungan admin terakhir.
- Migrasi root dan penguncian ownership dijalankan dua kali pada database PostgreSQL pengujian; versi izin, audit, NOT NULL, dan validasi foreign key tetap konsisten.
- `npm test`, test konteks unit, test kalender, dan build Vite lulus. Pemeriksaan browser mencakup 13 skenario: setup root tanpa unit, pengelolaan organisasi/akun, dua tab, respons lama, vendor assignment, parent baca-saja, dan mobile 375 px.
- Pendaftaran publik tertutup secara default di semua environment; konfigurasi dan penolakan HTTP diuji tanpa membuat akun produksi.
- Backup produksi sebelum cutover telah disalin ke PVE, diperiksa checksum, dan direstore ke PostgreSQL terisolasi. Inventaris produksi berisi satu akun root asli serta nol proyek, agenda, dan seluruh tabel anak transaksi.

## Hasil produksi dan konvergensi

Rilis aktif di `https://protrack.warnoto.com`, dengan SHA-256 arsip `1890d123662f9962de3ddcfdec8dd2af1cf2a7fbfbb9272c29655b7880a50de3`. Pemeliharaan menutup trafik saat migrasi; volume `deploy_postgres_data` dan rahasia server dipertahankan. Kedua kolom ownership `unit_id` berstatus NOT NULL dan lima foreign key tervalidasi. Tidak ada transaksi yang perlu dihapus setelah inventaris membuktikan seluruh tabel transaksi kosong. Satu akun root asli dipertahankan dan hash password identik dengan backup sebelum cutover.

Backup sebelum cutover `protrack-20261105T095313Z.dump` dan backup skema baru `protrack-20261105T100244Z.dump` lulus restore terisolasi serta checksum salinan PVE. Backup setelah reboot `protrack-20261105T100505Z.dump` juga tersalin dengan checksum yang valid. Izin eksekusi skrip dipulihkan setelah ekstraksi arsip Windows; prosedurnya dicatat pada runbook.

Setelah reboot VM210, login root, `setupRequired`, capability kontrol organisasi/akun/matriks, dan master kosong lulus. API anonim menghasilkan 401, pendaftaran menghasilkan 403, konteks unit palsu menghasilkan 403, dan daftar proyek tanpa konteks menghasilkan 200 dengan data kosong. Desktop dan mobile hosted tidak memiliki overflow atau error browser. Data tetap satu akun root serta nol unit, membership, proyek, agenda, dan seluruh tabel anak transaksi. Firewall dan timer backup VM/PVE aktif.

CT100 dan VM200 tetap berjalan dengan hash konfigurasi yang sama; pemeriksaan independen menghasilkan WARNOTO 401 dan Postiz 200 setelah redirect, sesuai baseline.

Peninjauan ulang spec, plan, dan tasks tidak menemukan pekerjaan implementasi tersisa dalam cakupan. Seluruh T001–T010 selesai; tidak ada task konvergensi baru. Nama resmi satu Unit Induk, enam UPT, serta akun/role asli tetap merupakan input setup pengguna dan tidak diganti fixture produksi. Temuan dependensi lama dicatat terpisah di `docs/security-matrix.md`; hasil pengujian RBAC bukan klaim bahwa seluruh dependensi bebas kerentanan. `HANDOFF.md` tidak diubah tanpa persetujuan.
