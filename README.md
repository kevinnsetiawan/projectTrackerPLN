# PLN Pro-Track

Sistem monitoring progres pekerjaan konstruksi PT PLN (Persero), mencakup GI, SUTT, SUTET, SKTT, dan PLTS.

Stack: React 18 + Vite 5, REST API Express, dan satu database PostgreSQL. PGlite in-memory tersedia untuk pengembangan dan pengujian terisolasi. Tailwind dibangun melalui konfigurasi lokal yang sudah tersedia.

## Fitur

- Dashboard KPI, manajemen proyek, progres, kurva-S, milestone, termin bayar, dan amandemen.
- Approval drawing Vendor → Dalkon → Engineering, serta approval IK berurutan ULTG → UPT → Unit Induk.
- Kendala dan mitigasi, dokumentasi/Laporan Konstruksi, import BOQ Excel, dan foto pekerjaan.
- Agenda, kalender, PIC, rekap, notifikasi, dan pengiriman WhatsApp melalui Fonnte.
- GIS proyek, laporan eksekutif, print browser, serta ekspor CSV/Excel.
- Master organisasi, identitas akun, keanggotaan per unit, penugasan vendor per proyek, dan Security Matrix berbasis policy.

## Data awal dan akses unit

Bootstrap normal membuat skema kosong tanpa akun demo, nama unit rekaan, atau transaksi contoh. Admin pusat mengisi satu Unit Induk dan enam UPT menggunakan nama/kode resmi, kemudian menetapkan keanggotaan pengguna. Lihat [kebutuhan data awal](docs/data-awal.md).

Satu email merupakan satu identitas. Pengguna dapat memiliki peran berbeda pada beberapa unit. Unit aktif dipilih per tab; konteks kosong tidak membuka seluruh data. Root teknis tanpa keanggotaan tetap dapat mengelola organisasi, pengguna, dan Security Matrix, serta membaca unit aktif atau seluruh unit melalui pilihan read-only. Hanya superadmin terverifikasi yang dapat mengubah policy capability global per jenis unit. Mutasi bisnis tetap memerlukan keanggotaan dan capability yang sesuai.

Peran operasional `asman` dan `logistik` ditetapkan per keanggotaan unit bersama jabatan opsional; role global bukan sumber kewenangan bisnis.

Vendor hanya mengakses proyek penugasannya dan otomatis ditugaskan pada proyek yang dibuatnya dalam UPT aktif. Unit Induk memantau UPT di bawahnya dan menjalankan approval jenjang yang sah, tanpa mengubah proyek UPT. Agenda internal Unit Induk tidak dikirim kepada UPT. Admin UPT mengelola pengguna non-admin unit sendiri; penetapan admin, akses lintas unit, serta password global akun multi-unit dikelola pusat. Role admin bukan bypass approval atau scope.

[Security Matrix](docs/security-matrix.md) menjelaskan nilai awal dan batas policy. Halaman `/security-matrix` menampilkan matriks revisioned dari server; hanya superadmin yang dapat mengubah capability operasional dan approval. IAM tetap terkunci.

## Menjalankan lokal

```bash
npm install
npm run api:dev
npm run dev
```

API berjalan pada `http://localhost:4000`, sedangkan SPA pada `http://localhost:5173` mem-proxy `/api` ke backend. Tanpa PostgreSQL, PGlite menyimpan data di memori proses; data hilang saat proses dibuat ulang dan tidak dibagi antar-instance. Memulai server lokal tidak otomatis membuat akun login atau fixture.

Gunakan PostgreSQL persisten untuk data yang perlu dipertahankan. Akun pusat pertama dipertahankan atau dipromosikan melalui prosedur migrasi identitas terverifikasi. `npm run db:create-admin -- <email> <password> [nama]` hanya membuat/mereset identitas admin; perintah tersebut tidak otomatis memberi flag superadmin atau keanggotaan unit.

## Konfigurasi

Salin `.env.example` ke `.env` dan isi nilai sesuai lingkungan:

```env
NODE_ENV=production
DB_DRIVER=pg
DATABASE_URL=postgresql://user:password@host:5432/protrack
JWT_SECRET=ganti-dengan-rahasia-acak-yang-kuat
SEED_DEMO=0
REGISTRATION_OPEN=0
FONNTE_TOKEN=
FONNTE_TARGET=
```

`JWT_SECRET` wajib di produksi. Registrasi publik dikendalikan oleh `REGISTRATION_OPEN`; pertahankan nilai `0` untuk pengoperasian tertutup. Menetapkan `DEMO_*_PASS` tidak mengaktifkan seed pada penggunaan normal. Fixture hanya dapat dijalankan dengan **`NODE_ENV=test` dan `SEED_DEMO=1`**, pada database test terisolasi.

PostgreSQL menjalankan bootstrap skema melalui transaksi dengan advisory lock. Migrasi kepemilikan unit dan pembersihan transaksi produksi memerlukan backup yang sudah diuji restore. Data lama tidak boleh dipetakan dari label teks `uip`/`upp` secara otomatis.

## Kontrak API

Semua API bisnis memerlukan autentikasi, termasuk pada dev/test. Login dan konfigurasi registrasi merupakan endpoint publik. `READ_AUTH=0` tidak membuka endpoint bisnis.

- Request JSON membawa `Authorization: Bearer <token>` dan `X-Unit-ID: <id>`.
- File, ekspor, dan SSE membawa token serta query `unit`; query dan header yang bertentangan ditolak.
- Konteks `all` hanya tersedia bagi anggota Unit Induk untuk scope monitoring yang sah.
- `/api/auth/me` mengembalikan identitas, keanggotaan, konteks, capability, dan status kebutuhan setup. Server memeriksa ulang pengguna aktif serta versi izin pada setiap request.
- ID di luar scope menghasilkan 404; tindakan yang tidak diizinkan pada resource terlihat menghasilkan 403. Perubahan role, keanggotaan, dan penugasan membatalkan sesi lama sesuai versi izin.
- Frontend menyimpan unit aktif di sessionStorage per tab, membatalkan request lama, mengosongkan tampilan, memuat ulang capability, dan menyambungkan kembali SSE saat unit berubah.

SSE hanya mengirim penanda perubahan. Isi data tetap diambil melalui REST API yang diotorisasi. Revision polling dan jumlah peer mengikuti scope; hasilnya tidak dibagikan melalui cache global antar-konteks izin. LISTEN/NOTIFY tersedia pada koneksi PostgreSQL yang mendukungnya; transaction pooler menggunakan broadcast lokal dan polling revision.

## Perintah dan pengujian

| Perintah | Kegunaan |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run api:dev` | Express lokal |
| `npm run api:pglite` | Express dengan PGlite, tanpa seed normal |
| `npm test` | Regresi fungsi murni dan HTTP |
| `node test-unit-foundation.mjs` | Identitas, scope, dan control plane unit |
| `node test-upt-isolation.mjs` | Pengujian adversarial akses antar-unit dan resource |
| `node src/unit-context.test.mjs` | Konteks per tab dan penolakan respons unit lama |
| `node test-agenda-calendar.mjs` | Perilaku kalender |
| `node test-auth-registration.mjs` | Konfigurasi dan pembatasan registrasi |
| `npm run build` | Build produksi ke `dist/` |
| `npm run db:seed` | Fixture test; mensyaratkan `NODE_ENV=test` dan `SEED_DEMO=1` |

Suite HTTP menyiapkan fixture sendiri dan menguji token beserta konteks unit yang sah. Pengujian PostgreSQL memakai `UNIT_TEST_PG_URL` yang menunjuk database test yang dapat dibuang; jangan arahkan fixture ke produksi. Sebelum merilis, jalankan regresi yang relevan, suite isolasi, dan build.

## Struktur

```text
api/index.js                 Express app dan pemasangan router
server/local-server.js       Entry server lokal
server/routes/               Router bisnis dan control plane
server/_lib/                 DB, schema, auth, scope, business, events, HTTP
server/scripts/              Perintah administrasi dan fixture test
src/pages/                   Halaman SPA
src/components/              Layout, kalender, drawer, dan komponen bersama
src/api.js                   Request, token, konteks unit, dan pembatalan
src/auth.js                  Identitas, konteks sesi, dan capability frontend
src/events.js                SSE dan polling cadangan per konteks
docs/                        Data awal, Security Matrix, dan self-host
specs/002-upt-isolation/      Spesifikasi isolasi UPT
```

## Deployment

Produksi menggunakan VM210 melalui `https://protrack.warnoto.com`, dengan PostgreSQL self-host. Source utama berada pada repository private `udawidi/projectTrackerPLN`; repository asal dipertahankan sebagai remote `upstream`. Vercel dan Supabase tidak digunakan oleh deployment aktif.

Push ke `main` menjalankan CI. Setelah semua pemeriksaan lulus, workflow memajukan branch `production` tanpa force push. VM210 memeriksa branch tersebut setiap dua menit memakai deploy key read-only. Perubahan skema/startup/dependensi membutuhkan persetujuan operator, dan kegagalan rilis menghentikan retry kandidat sampai diperiksa. Rahasia produksi tetap di server.

Panduan operasional ada di [docs/self-host.md](docs/self-host.md). Untuk server sendiri, serve `dist/` melalui nginx dan proxy `/api/` ke Express; matikan buffering pada stream SSE. Gunakan HTTPS, simpan rahasia di environment server, dan uji restore backup sebelum perubahan data produksi.

Konfigurasi lama `vercel.json` tetap tersedia sebagai referensi alternatif, bukan jalur deploy produksi. Jangan memakai PGlite in-memory sebagai penyimpanan produksi multi-instance.

© PT PLN (Persero) — PLN Pro-Track
