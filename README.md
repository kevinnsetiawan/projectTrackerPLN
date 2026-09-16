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

Login demo (lihat juga `.env`):

| Email               | Password    | Role   |
| ------------------- | ----------- | ------ |
| `admin@pln.local`   | `admin123`  | Admin  |
| `vendor@pln.local`  | `vendor123` | Vendor |
| `dalkon@pln.local`  | `dalkon123` | Dalkon |
| `enjin@pln.local`   | `enjin123`  | Enjin  |

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

Tanpa `DB_DRIVER`, aplikasi memakai **PGlite** dan otomatis melakukan **seed** data demo.

## Script

| Script            | Keterangan                                      |
| ----------------- | ----------------------------------------------- |
| `npm run dev`     | Vite dev server (localhost:5173)                |
| `npm run api:dev` | Express API lokal (localhost:4000)              |
| `npm run api:pglite` | API dengan driver PGlite dipaksakan         |
| `npm test`        | `test-local.mjs` + `test-http.mjs` (regression) |
| `npm run build`   | Build production ke `dist/`                     |
| `npm run db:seed` | Seed ulang data demo                            |

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

---

© PT PLN (Persero) — PLN Pro-Track v1.0.0