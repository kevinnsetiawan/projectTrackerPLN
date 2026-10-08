# PLN Pro-Track

Sistem monitoring progres pekerjaan konstruksi PT PLN (Persero) — Divisi Konstruksi (MPO). Mencakup GI, SUTT, SUTET, SKTT, dan PLTS.

> **Stack**: React 18 + Vite 5 (SPA) · Express REST API · Postgres (via PGlite in-memory default, atau server `pg`)

## Fitur

- **Dashboard KPI** — ringkasan progres, deviasi jadwal, penyerapan anggaran, dan status portofolio.
- **Manajemen Proyek** — CRUD proyek, Kurva S (rencana vs realisasi), milestones, termin bayar, amandemen (perpanjangan COD otomatis).
- **Approval Drawing** — alur verifikasi 8 tahap: Vendor → Dalkon (hardfile & nodin) → Engineering (review/approve/revisi).
- **Kendala & Mitigasi** — lapor issue lapangan, update status (Open / In Review / Resolved).
- **Agenda & Rekap** — jadwal rapat per kontrak, status surat AMS, rekap mingguan/bulanan, kirim rekap ke grup WhatsApp (Fonnte).
- **Dokumentasi & LK** — foto progres lapangan dan Laporan Konstruksi (upload file/base64).
- **BOQ Kontrak** — import Excel BOQ, bobot tertimbang vs Kurva S, foto item per Vendor/Dalkon.
- **Instruksi Kerja** — unggah SPK / gambar kerja / metode pelaksanaan.
- **GIS Proyek** — peta lokasi proyek (Leaflet).
- **Laporan Eksekutif** — print PDF (browser), export **CSV**, dan export **Excel (.xlsx)**.
- **Manajemen Pengguna (Admin)** — CRUD akun vendor/dalkon/enjin/admin + reset password.

## Akses Cepat (Local)

```bash
npm install
npm run api:dev     # API di http://localhost:4000 (PGlite + auto-seed)
npm run dev         # SPA di http://localhost:5173 (proxy /api → 4000)
```

Akun login **hanya untuk pengembangan lokal** dibuat otomatis oleh auto-seed —
kredensialnya diambil dari variabel `DEMO_*_EMAIL` / `DEMO_*_PASS` di `.env`
(lihat `.env.example`). Di produksi (`NODE_ENV=production`) akun demo **tidak
dibuat** kecuali `DEMO_*_PASS` diisi dengan kuat; selain itu gunakan
`npm run db:create-admin`.

## Konfigurasi

Salin `.env.example` ke `.env` bila perlu:

```env
# Postgres opsional — default memakai PGlite (tanpa DB_DRIVER)
DB_DRIVER=pg
DATABASE_URL=postgres://user:pass@host:5432/dbname

# Security / token
JWT_SECRET=ganti-dengan-string-random

# WhatsApp gateway (Fonnte) untuk "Kirim ke WA Grup"
FONNTE_TOKEN=
FONNTE_TARGET=
```

Tanpa `DB_DRIVER`, aplikasi memakai **PGlite in-memory**: data **hilang** setiap instance
dibuat ulang (cold start) dan tidakshared antar-instance. Ini hanya cocok untuk demo lokal.

Untuk data persisten di Vercel, set environment variable berikut di project Vercel:

```env
DB_DRIVER=pg
DATABASE_URL=postgres://user:pass@host:5432/dbname?sslmode=require
JWT_SECRET=ganti-dengan-string-random
```

Skema tabel dan akun demo dibuat otomatis pada boot pertama driver Postgres
(`ensurePgBootstrap()` di `server/_lib/db.js`, dikunci advisory lock), jadi tidak perlu
DDL manual. Driver Postgres juga mengaktifkan bridge realtime via `pg_notify`/`LISTEN`,
sehingga event SSE menjangkau semua instance serverless.

## Script

| Script            | Keterangan                                      |
| ----------------- | ----------------------------------------------- |
| `npm run dev`     | Vite dev server (localhost:5173)                |
| `npm run api:dev` | Express API lokal (localhost:4000)              |
| `npm run api:pglite` | API dengan driver PGlite dipaksakan         |
| `npm test`        | `test-local.mjs` + `test-http.mjs` (regression) |
| `npm run build`   | Build production ke `dist/`                     |
| `npm run db:seed` | Seed ulang data demo                            |
| `npm run db:create-admin -- <email> <password> [nama]` | Buat/reset akun admin (produksi, `SEED_DEMO=0`) |

## Hak Akses (RBAC)

| Aksi                                  | vendor | dalkon | enjin | admin |
| ------------------------------------- | :----: | :----: | :---: | :---: |
| CRUD proyek, input progres, kurva-S   | ✓      | ✓      |       | ✓     |
| Dokumentasi & LK, instruksi, BOQ      | ✓      | ✓      |       | ✓     |
| Upload drawing                        | ✓      |        |       | ✓     |
| Verifikasi drawing (Dalkon step)      |        | ✓      |       | ✓     |
| Review drawing (Enjin step)           |        |        | ✓     | ✓     |
| Kendala: lapor                        | ✓      | ✓      | ✓     | ✓     |
| Kendala: update status / edit         |        | ✓      | ✓     | ✓     |
| Kendala: hapus                        |        | ✓      |       | ✓     |
| Termin bayar, amandemen, agenda, WA   |        | ✓      |       | ✓     |
| Hapus drawing, manajemen pengguna     |        |        |       | ✓     |

## Struktur

```
api/
  index.js            # Express app + mount router
  local-server.js     # Entry lokal (pilih driver DB)
  routes/             # auth, projects, kendala, agenda, drawings, reports, gis, users
  _lib/               # db, schema, seedData, business, auth, http
src/
  pages/              # Halaman SPA (Dashboard, ProjectsIndex, ProjectShow, ...)
  components/         # Layout (nav), ui.jsx, ApprovalDrawingList, ProjectTimeline
  api.js              # Klien API (fetch + token)
  auth.js             # helper sesi & role (getUser, can, ...)
  utils.js            # formatter nilai/tanggal, fileToDataUrl
test-local.mjs        # Pure-function tests
test-http.mjs         # HTTP integration tests (seeded DB, admin token)
```

## Deployment (Vercel)

- Lampiran `vercel.json` me-routing `/api/*` ke serverless Express dan SPA fallback ke `dist/index.html`.
- Wajib set `JWT_SECRET` (dan `DATABASE_URL` + `DB_DRIVER=pg` bila memakai Postgres ter-managed). Jika memakai PGlite, datanya **in-memory per instance** — gunakan Postgres untuk data persisten.

## Deployment server sendiri (mini PC)

Checklist go-public:

1. **Environment** (di `.env` server):
   ```
   NODE_ENV=production
   JWT_SECRET=<random panjang>        # wajib — server gagal start tanpa ini
   DB_DRIVER=pg
   DATABASE_URL=postgresql://...      # Supabase: Session pooler port 5432 (bukan 6543)
   DEMO_ADMIN_PASS=<kuat>             # atau SEED_DEMO=0 + npm run db:create-admin
   FONNTE_TOKEN=... FONNTE_TARGET=...
   ```
2. **Build & jalankan permanen**: `npm ci && npm run build` → `pm2 start server/local-server.js --name protrack && pm2 save && pm2 startup`.
3. **nginx**: serve `dist/` + proxy `/api/` ke `127.0.0.1:4000` (`client_max_body_size 20m`) dan `/api/events/stream` dengan `proxy_buffering off` (SSE). Port forward router **hanya 80/443**, Postgres tidak diekspos.
4. **HTTPS**: `certbot --nginx -d domainmu.com` (auto-renew bawaan).
5. **Keamanan**: default `READ_AUTH` aktif di produksi (endpoint baca wajib login); ganti/hapus akun demo; RLS tanpa policy di Supabase bila memakai Supabase (blokir REST API publiknya).
6. **Rutin**: cron `pg_dump` harian untuk backup; cron `curl /api/dashboard` harian mencegah Supabase free tier pause.

---

© PT PLN (Persero) — PLN Pro-Track v1.0.0