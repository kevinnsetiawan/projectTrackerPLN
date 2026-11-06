# AGENTS.md

PLN Pro-Track adalah SPA React 18 + Vite 5 dengan REST API Express. Aplikasi memantau pekerjaan konstruksi PLN, termasuk GI, SUTT, SUTET, SKTT, dan PLTS. Backend menggunakan satu database PostgreSQL; PGlite in-memory tersedia untuk pengembangan dan pengujian terisolasi. Aplikasi tidak menggunakan PHP/Laravel, framework autentikasi frontend, atau pustaka UI pihak ketiga.

## Stack dan bootstrap

- Frontend berada di `src/`. React Router menangani navigasi SPA. Tailwind dibangun melalui konfigurasi PostCSS/Tailwind yang sudah ada dan direktif `@tailwind` di `src/index.css`. Gunakan token `pln.*` dan font Plus Jakarta Sans. Jangan menambahkan kembali Tailwind CDN atau mengganti pipeline CSS tanpa kebutuhan yang disetujui.
- Express diekspor dari `api/index.js`. Entry server lokal berada di `server/local-server.js`, router di `server/routes/`, dan helper bersama di `server/_lib/`.
- `server/_lib/db.js` memilih PostgreSQL ketika `DATABASE_URL` tersedia atau `DB_DRIVER=pg` diarahkan ke URL tersebut. Tanpa koneksi PostgreSQL, driver dapat memakai PGlite. Gunakan `isPg()` dan `supportsListen()`; jangan menebak driver melalui pembacaan environment di router.
- Bootstrap normal membuat skema, bukan akun demo, unit rekaan, atau transaksi. `autoSeed()` hanya berjalan ketika **keduanya** terpenuhi: `NODE_ENV=test` dan `SEED_DEMO=1`. `DEMO_*_PASS` tidak mengaktifkan seed pada penggunaan normal. `npm run db:seed` juga dibatasi untuk lingkungan test tersebut.
- PGlite bersifat in-memory dan tidak berbagi data antar-instance. Gunakan PostgreSQL persisten untuk produksi. Akun pusat yang dipertahankan harus dipromosikan secara eksplisit melalui migrasi identitas terverifikasi; role lama `admin` tidak otomatis menjadi superadmin.
- `npm run db:create-admin` membuat atau mereset identitas akun admin. Perintah ini tidak menetapkan `is_superadmin`, keanggotaan unit, atau kewenangan bisnis. Jangan menyamakan keberhasilan login dengan pemberian akses operasional.
- Master organisasi menggunakan nama dan kode resmi yang diisi pengguna melalui UI. Data lama tanpa kepemilikan unit memerlukan pemetaan pusat secara eksplisit sebelum aktivasi; `uip`/`upp` bukan dasar akses. Lihat [data awal](docs/data-awal.md), [Security Matrix](docs/security-matrix.md), dan [panduan self-host](docs/self-host.md).

## Perintah

- Frontend: `npm run dev` pada `http://localhost:5173`.
- Backend: `npm run api:dev` pada `http://localhost:4000`; `npm run api:pglite` memaksa PGlite tanpa mengaktifkan seed normal.
- Regresi: `npm test`, yaitu `test-local.mjs` dan `test-http.mjs`.
- Isolasi unit: `node test-unit-foundation.mjs` dan `node test-upt-isolation.mjs`.
- Konteks frontend: `node src/unit-context.test.mjs`.
- Kalender dan registrasi: `node test-agenda-calendar.mjs` dan `node test-auth-registration.mjs`.
- Build: `npm run build`, dengan keluaran `dist/`.
- Buat/reset identitas admin: `npm run db:create-admin -- <email> <password> [nama]`.

Jalankan regresi yang relevan, pengujian isolasi ketika scope/auth berubah, dan build sebelum selesai. `test-local.mjs` menguji fungsi murni; suite HTTP menyiapkan fixture test dan memakai token serta konteks unit yang sah. Jangan melonggarkan izin agar token admin lama melewati pengujian. Untuk menguji driver PostgreSQL, arahkan `UNIT_TEST_PG_URL` ke database test yang dapat dibuang, lalu jalankan suite unit; jangan gunakan database produksi untuk fixture.

## Autentikasi dan isolasi unit

- Identitas email bersifat global dan unik. `unit_memberships` menyimpan peran serta status keanggotaan per unit. Pengguna dapat memiliki peran berbeda pada unit berbeda. `vendor_project_assignments` membatasi vendor pada proyek penugasannya.
- Semua API bisnis, termasuk endpoint baca pada dev/test, memerlukan autentikasi. `/api/auth/login` dan `/api/auth/config` merupakan endpoint publik; registrasi mengikuti `REGISTRATION_OPEN` dan ditutup secara default pada semua lingkungan. `READ_AUTH=0` bukan jalan untuk membuka API bisnis.
- Token membawa identitas dan versi izin (`auth_version`). `requireAuth` memeriksa ulang pengguna aktif, versi token, keanggotaan, dan konteks dari database. Token lama yang tidak sesuai kontrak memerlukan login ulang. Pencabutan atau perubahan keanggotaan/penugasan harus menghilangkan akses sesi lama.
- Header `X-Unit-ID` membawa ID unit aktif. Navigasi file, ekspor, dan SSE menggunakan query `unit` bersama token. Header dan query yang bertentangan menghasilkan 400. Konteks kosong berarti tidak ada scope bisnis, bukan akses global.
- Konteks `all` tersedia bagi anggota Unit Induk untuk monitoring UPT di bawah induknya dan root superadmin untuk read-only monitoring seluruh unit aktif. Scope monitoring tidak memberi kewenangan mutasi proyek UPT.
- `GET /api/auth/me` mengembalikan `{ user, memberships, selectable_units, context, capabilities, setupRequired }`. Root menerima seluruh unit aktif di `selectable_units`; unit tanpa membership memakai `role: null` dan read-only. `context` berisi `mode`, `unit_id`, `unit`, dan `role`. Aplikasi tidak boleh mengambil kewenangan bisnis dari role identitas lama.
- `server/_lib/scope.js` menjadi sumber otorisasi: `projectScope`, `assertProject`, `assertChild`, `agendaScope`, `assertAgenda`, `assertPic`, `requireUnitContext`, `requireCapability`, `canInUnit`, dan `getCapabilities`. Gunakan predicate/helper ini untuk daftar, pencarian, ID langsung, resource anak, file, ekspor, PIC, dashboard, GIS, dan realtime. Resource di luar scope menghasilkan 404; tindakan yang tidak diizinkan pada resource terlihat menghasilkan 403.
- Mutasi wajib memakai `requireAuth` dan pemeriksaan capability/kepemilikan yang sesuai. Role `admin` tidak menjadi bypass global, tidak boleh mengganti approval role lain, dan tidak menggantikan pemeriksaan unit.

## Capability dan pengelolaan organisasi

Nilai awal capability berasal dari matriks kompatibilitas di `scope.js`, lalu ditegakkan melalui policy database request-local per `unit_kind` (`upt` atau `unit_induk`). Security Matrix dapat mengubah capability operasional dan approval secara global per jenis unit hanya melalui superadmin terverifikasi. Capability baca bisnis dipisah per menu; `reports_export` memerlukan `reports_read`. IAM tetap terkunci.

- Vendor hanya membaca dan mengubah proyek penugasannya pada UPT aktif. Vendor boleh membuat proyek pada UPT keanggotaannya dan otomatis ditugaskan kepada proyek baru tersebut.
- Dalkon UPT menjalankan approval IK ULTG dan verifikasi drawing Dalkon. Engineering UPT menjalankan approval IK UPT dan review drawing Engineering. Admin UPT tidak menggantikan kedua jenjang tersebut.
- Admin Unit Induk memantau proyek UPT dan menyetujui jenjang IK Unit Induk. Agenda internal Unit Induk hanya dapat diubah dalam konteks induk tersebut dan tidak dikirim kepada UPT.
- Staff membaca data sesuai scope tanpa tombol mutasi. Semua peran dapat melihat menu bisnis yang tersedia; visibilitas menu tidak memberikan akses data di luar scope.
- Superadmin teknis mengelola control plane tanpa memerlukan keanggotaan unit, tetapi tetap memerlukan keanggotaan operasional untuk kewenangan bisnis. Root tanpa unit tetap dapat membuka organisasi, pengguna, dan Security Matrix; menu bisnis menampilkan arahan pemilihan unit.
- Admin UPT hanya mengelola pengguna non-admin unit sendiri. Pusat menetapkan admin dan keanggotaan lintas unit. Perubahan identitas/password global akun multi-unit hanya oleh pusat. UI mengikuti flag `can_update_identity` dan `can_reset_password` dari server.
- API control plane di `server/routes/users.js` meliputi `/api/units`, `/api/users`, `/api/users/:id/memberships/:unitId`, `/api/projects/:id/vendors/:userId`, dan `/api/security-matrix`. Perubahan akun, keanggotaan, serta penugasan dicatat dalam audit tanpa password/token. PUT Security Matrix memakai revision/CAS, audit diff, dan invalidasi sesi terdampak. IAM tetap baca-saja; superadmin hanya mengubah capability operasional dan approval sesuai batas tahap IK.

Rincian kewenangan ada di [docs/security-matrix.md](docs/security-matrix.md). Pertahankan validasi input, transaksi, pembatasan akun pusat terakhir, dan constraint ownership unit ketika mengubah control plane.

## Sesi frontend

- `src/auth.js` menyediakan `getUser`, `getUnitId`, `setUnitId`, `getAuthState`, dan `canAction`. Helper lama `can(...roles)` membaca role konteks aktif; tombol bisnis menggunakan capability server.
- Unit aktif disimpan di **sessionStorage per tab**, bukan localStorage global. Saat berganti unit, batalkan request lama, kosongkan capability/data tampilan, ambil ulang `/auth/me`, dan sambungkan ulang SSE. `src/api.js` menggunakan AbortController serta generation guard agar respons unit lama tidak mengisi tampilan baru.
- Layout menahan halaman bisnis hingga konteks selesai diverifikasi. Pilihan PIC dan proyek berasal dari daftar server yang telah di-scope. Jangan membuat dropdown akun/proyek global lalu memfilternya hanya di browser.
- Halaman SPA berada di `src/pages/`; gunakan komponen `Card`, `Field`, `Drawer`, `Modal`, dan pola UI yang sudah ada di `src/components/ui.jsx`. Pertahankan label Indonesia, aksesibilitas dasar, serta kontrak judul `setPageTitle` di Layout.

## Konvensi domain

- Proyek memiliki milestone, kurva-S, kendala, dokumentasi, agenda, amandemen, IK, BOQ/grup BOQ, drawing, dan termin bayar. Ownership unit pada proyek/agenda dan foreign key terkait harus konsisten.
- `deviasi = progres_realisasi - progres_rencana`. Status proyek diturunkan melalui `deriveStatus` di `server/_lib/business.js`: `In Progress`, `BASTB`, `BAST 1`, dan `BAST 2`. Gunakan satu implementasi status untuk pembuatan proyek dan pembaruan progres.
- `ALL_TIPE`, `ALL_UIP`, `KATEGORI_KENDALA`, `CSV_HEADERS`, dan badge map berada di `business.js`. Jangan menduplikasi daftar opsi pada router. Label `uip`/`upp` tetap metadata tampilan, bukan otorisasi.
- PIC agenda menggunakan `pic_user_id` dan harus merupakan anggota aktif unit yang sah; PIC vendor juga memerlukan penugasan proyek terkait. `penanggung_jawab` tetap label teks warna kalender. `isAgendaPic()` di `src/utils.js` mengutamakan ID dan memiliki fallback nama untuk data lama.
- IK menyimpan tahap pekerjaan, tanggal, JSA/WP/DP3, dan indikator keselamatan/kualitas/jadwal/pengawasan. Approval disimpan di `ik_approvals` dan harus berjalan berurutan ULTG → UPT → Unit Induk. Status diturunkan melalui `ikStatusFromApprovals`; IK lama tanpa baris approval mengikuti perilaku kompatibilitas yang sudah ada.

## File dan ekspor

- Lampiran disimpan sebagai data URL base64 di kolom TEXT database. Gunakan `fileToDataUrl(file, maxMb)` di `src/utils.js`, dengan guard 8 MB. Gambar dikompresi hingga 1600 px/JPEG q75 sesuai helper; backend menerima JSON hingga 15 MB.
- File drawing, dokumentasi, foto BOQ, kurva-S, IK, lampiran approval, dan amandemen diambil melalui endpoint file yang memeriksa resource dalam scope. Jangan mengembalikan berkas di luar pemeriksaan otorisasi.
- Ekspor `/api/reports/export-csv` dan `/api/reports/export-excel` memerlukan token serta konteks `unit`; gunakan `exportCsvUrl()`/`exportExcelUrl()` di `src/api.js`. Anchor download bukan endpoint publik. Excel menggunakan `exceljs` di server; `ReportsPrint` memakai print browser.

## Realtime dan cache

- Hub `server/_lib/events.js` dan router `server/routes/events.js` menyediakan `/api/events/stream`, `/api/events/rev`, serta `/api/events/peers`. SSE memakai token dan query `unit`; autentikasi/konteks tidak dilewati oleh filter topik.
- Event hanya membawa penanda (`topic`, `project_id`, `unit_id`, `action`, `actor`), bukan isi data. Mutasi bisnis mengirim `await broadcast(TOPIC.X, ...)` dengan scope proyek atau unit yang benar. Klien mengambil ulang data melalui REST API yang diotorisasi.
- Pengiriman SSE memeriksa hak penerima, termasuk penugasan vendor dan versi izin. `/events/rev` menggunakan predicate scope yang sama dengan REST; jumlah peer juga mengikuti konteks. **Jangan menggunakan memo/cache/promise global yang dibagi antar-konteks izin** untuk hasil revision atau data bisnis.
- PostgreSQL dapat memakai `pg_notify`/`LISTEN` ketika `supportsListen()` benar. Listener harus memakai `connectDirectClient()` di luar pool agar tidak menghabiskan slot request. Transaction pooler port 6543 tidak mendukung LISTEN; gunakan broadcast lokal dan polling revision yang sudah di-scope.
- `src/events.js` memakai satu EventSource per tab dan menggabungkan event per topik selama 300 ms. Polling cadangan berjalan setiap 10 detik, dengan guard request minimal 3 detik. Pergantian unit membersihkan antrean/revision/koneksi; respons polling dari konteks lama diabaikan.
- Form/modal terbuka melewati refresh realtime agar isian pengguna tidak tertimpa, seperti `formBusy` pada detail proyek.

## Keamanan dan performa produksi

- `JWT_SECRET` wajib pada `NODE_ENV=production`. Pertahankan rate limiter registrasi, CORS same-origin secara default, security headers, dan `trust proxy` loopback. Jangan mengaktifkan akun demo atau registrasi publik sebagai jalan bootstrap produksi.
- `pgConnectionString()` menangani SSL dan kompatibilitas `sslmode` yang sudah ada. `PG_POOL_MAX` default 1 pada session/direct connection dan 5 pada transaction pooler; pertahankan timeout serta batas pool agar instance serverless tidak menghabiskan koneksi.
- Bootstrap/migrasi PostgreSQL menggunakan transaksi serta advisory transaction lock. Jangan menggantinya dengan lock sesi pada transaction pooler.
- Untuk Vercel, region `sin1` harus sesuai region database; gunakan transaction pooler Supabase port 6543 yang mendukung IPv4. Pada server sendiri, gunakan endpoint PostgreSQL yang cocok dengan konektivitas dan kebutuhan LISTEN.
- `getProjectFull()` mengumpulkan item BOQ dan approval IK melalui satu gelombang `Promise.all`; jangan mengembalikan pola query N+1.
- Halaman memakai React.lazy dan prefetch `lazyPages.js`. Chunk Leaflet/chart/Excel/ikon dipisahkan di `vite.config.js`; jangan mengimpor library berat ke Layout atau komponen inti.

## Serah terima

`HANDOFF.md` tidak boleh dibuat atau diperbarui otomatis. Perubahan memerlukan persetujuan pengguna sesuai kontrak lintas-vendor. Dokumentasi operasional dan keputusan scope harus tetap konsisten dengan [spec isolasi UPT](specs/002-upt-isolation/spec.md).
