# AGENTS.md

PLN Pro-Track — React 18 + Vite 5 SPA with an Express REST API, backed by PGlite (in-memory Postgres) by default or Postgres via `pg`. Monitors PLN construction project progress (GI, SUTT, SUTET, SKTT, PLTS works). No auth frontend framework — custom HMAC-token auth, no third-party UI libs.

## Stack & setup

- **Frontend**: `src/` — React Router SPA. Tailwind is loaded **via CDN** in `index.html` with a PLN design-system config (brand colors `pln.*`, font "Plus Jakarta Sans") — do not add a Tailwind PostCSS build step.
- **Backend**: `api/` — Express app exported from `api/index.js`. Routers live in `server/routes/*`, shared helpers in `server/_lib/*`.
- **DB**: dual driver in `server/_lib/db.js`. Uses PGlite when no explicit `DB_DRIVER` (default, **in-memory — data hilang saat cold start**), Postgres when `DB_DRIVER=pg` + `DATABASE_URL`. DDL in `server/_lib/schema.js`, demo data in `server/_lib/seedData.js`, and the shared seeding routine in `server/_lib/seedRunner.js` (`autoSeed(gliteOrPgClient)` — needs only `query(text, params) => { rows }`). Postgres auto-creates the schema + demo accounts on first boot via `ensurePgBootstrap()` (advisory-lock guarded); PGlite auto-seeds only when `DB_DRIVER` is unset. Use `isPg()` from `db.js` instead of reading `process.env.DB_DRIVER` elsewhere.
- **Node**: PHP/Laravel is NOT used. Frontend uses a shared design system, never npm-wired Tailwind.

## Commands

- Serve frontend: `npm run dev` (Vite, http://localhost:5173)
- Serve backend: `npm run api:dev` (node `server/local-server.js`, http://localhost:4000)
- Backend (PGlite forced): `npm run api:pglite`
- Tests: `npm test` (runs `test-local.mjs` && `test-http.mjs`)
- Build: `npm run build` (outputs to `dist/`)
- Format: run `npm run test` + `npm run build` before finishing

## Testing gotcha

- `test-http.mjs` boots the Express app in-process and runs assertions against a **seeded** DB. Many mutation tests hit routes (e.g. `POST /api/projects/1/progress`, `POST /api/amandemen`) authenticated as **admin**. Do not tighten those routes to exclude admin, or the suite will fail.
- `test-local.mjs` is a pure-function suite (business helpers, hash/password, seed correctness) — no HTTP.

## Domain model & conventions

- A `Project` owns `Milestone`, `SCurve`, `Kendala`, `Dokumentasi`, `Agenda`, `Amandemen`, `InstruksiKerja`, `Boq` (+ `BoqGroup`), `ApprovalDrawing`, `TerminBayar` (all `hasMany`, ordered by `urutan`/`id` or `desc id`).
- Terminology is Indonesian: `kendala` = issue/obstacle, `dokumentasi` = construction photos, `uip`/`upp` = PLN business units, `ROW` = right-of-way, `COD` = commercial operation date, `dalkon` = pengawas/supervisor, `nodin` = nota dinas.
- `deviasi` (deviation) = `progres_realisasi - progres_rencana` (tracked on `Project`; `SCurve` rows hold weekly `rencana`/`realisasi`).
- `Project.status` (via `deriveStatus`): `In Progress`, `BASTB` (barang sudah dicek), `BAST 1` (progres ≥100%), `BAST 2` (BAST 1 + masa garansi `tgl_selesai_garansi` terlampaui). Auto-derivation lives in `server/_lib/business.js` (`deriveStatus`, used by both `POST /projects` and `POST /projects/:id/progress`) — keep status rules consistent in one place. `STATUS_BADGE` in the same file is the display source — don't duplicate the keys.
- `ALL_TIPE`, `ALL_UIP`, `KATEGORI_KENDALA`, `CSV_HEADERS`, badge maps live in `server/_lib/business.js`. It is the single source of truth — do not duplicate these option arrays in route files.

## Auth & RBAC (roles)

- Roles: `vendor` (Kontraktor), `dalkon` (Pengawas), `enjin` (Engineering), `staff` (Staff Agenda, read-only Agenda), `admin`. Constants & helpers in `server/_lib/auth.js`: `ROLES`, `ROLE_LABELS`, `hashPassword`, `verifyPassword`, `signToken`, `verifyToken`, `publicUser`, middlewares `requireAuth`, `requireRole(...roles)`.
- **Every mutation route must chain `requireAuth` and (where role-restricted) `requireRole(...)`.**
- Current permission matrix:
  - `vendor` + `dalkon` + `admin`: create/update projects, input progress, kurva-S docs, dokumentasi, instruksi, BOQ upload/fotos, upload drawing (vendor/admin).
  - `dalkon` + `admin`: termin bayar status, amandemen, agenda (CRUD), kirim rekap WA, delete project, delete kendala, drawing dalkon step.
  - `staff` + `admin`: read-only Agenda & Rekap (halaman `/agenda` saja, lihat `ROLE_NAV` di `src/auth.js`).
  - `enjin` + `admin`: kendala status update/edit; `enjin` only: drawing engineering review step.
  - `admin` only: delete drawing, user management (`/api/users`), everything.
  - Reporting/read-only endpoints (dashboard, projects list/detail, reports, gis, agenda list, kendala list) are public but the SPA still requires login.
- Frontend helpers in `src/auth.js`: `getUser`, `can(...roles)`, `ROLE_LABELS`, `ROLE_FULL_LABELS`.
- Admin-only `/api/users` router in `server/routes/users.js` (list/create/update/delete + password reset); guard the SPA page with `<RequireAdmin>` in `src/App.jsx` and the nav item in `src/components/Layout.jsx` (`adminOnly: true`).
- Do not break the admin bypass used by tests.

## Files & uploads

- Files are stored as **base64 data-URLs in DB TEXT columns** (no disk/multer). Frontend reads via `FileReader`; backend `express.json({ limit: '15mb' })` (api/index.js).
- Add a client-side size guard (max 8 MB) via `fileToDataUrl(file, maxMb)` in `src/utils.js` before reading.
- Drawings, kurva-S docs, instruksi, BOQ photos, dokumentasi and amandemen docs all follow this pattern.

## Views

- SPA pages in `src/pages/*`, shared UI in `src/components/ui.jsx` (Card, StatusBadge, ProgressBar, StatCard, Field, DevChip, Spinner, PageHeader, Empty, BadgeIcon) and `src/components/Layout.jsx` (page title contract via `setPageTitle`, admin nav hints, `ROLE_BADGE`).
- Follow the `pln.*` Tailwind color tokens and existing component patterns for new UI; keep the Indonesian labels.

## Realtime (SSE)

- **Server hub**: `server/_lib/events.js` — `TOPIC` constants, `broadcast(topic, { project_id, action })`, `attachClient()`, `clientCount()`. Router `server/routes/events.js` (mounted in `api/index.js`):
  - `GET /api/events/stream` — SSE stream (`text/event-stream`, `retry: 3000`, heartbeat `: ping` tiap 25 detik). Auth via `Authorization: Bearer` **atau** `?token=` (EventSource tidak bisa kirim header). Optional `?topics=agenda,kendala` untuk filter di server. Event pertama `connected` = handshake. 401 bila token invalid.
  - `GET /api/events/rev` — hash `{ count, max(updated_at) }` per tabel; jaring pengaman bila SSE terputus.
  - `GET /api/events/peers` — jumlah klien realtime aktif.
- **Kontrak**: event **hanya berisi penanda** (`topic`, `project_id`, `action`, `actor`) — bukan data. Klien me-refresh lewat REST API biasa sehingga RBAC tetap di satu tempat dan tidak ada data sensitif yang bocor lewat stream.
- **Wajib**: setiap route mutasi yang mengubah data harus memanggil `await broadcast(TOPIC.X, { project_id, action, actor: req.user.role })` sebelum mengirim response. Topik: `projects`, `progress`, `milestones`, `kurva`, `termins`, `kendala`, `dokumentasi`, `drawing`, `boq`, `instruksi`, `amandemen`, `agenda`, `users`.
- **Cross-instance**: bila driver adalah Postgres (`isPg()`), `broadcast()` juga `pg_notify('protrack_events', ...)` dan instance lain meneruskannya lewat `LISTEN` (payload membawa `origin` agar tidak dobel). Pada driver PGlite event hanya menjangkau instance yang sama — dan karena datanya in-memory, produksi wajib memakai Postgres.
- **Client hub**: `src/events.js` — satu `EventSource` untuk seluruh aplikasi (token lewat query string). Hook `useLive(topics | '*', handler)`; event digabung per topik (300 ms) supaya tidak refresh berulang. `useLiveStatus()` untuk indikator di `Layout.jsx` (footer "Realtime"/"Mode cadangan"). `disconnectLive()` dipanggil saat logout.
- **Jaring pengaman client**: bila stream belum `live`, hub membandingkan `/api/events/rev` tiap 10 detik dan dispatch event dengan `fallback: true` untuk tabel yang berubah. Halaman yang punya form/modal terbuka harus **skip** refresh dari event realtime agar isian pengguna tidak tertimpa (lihat `formBusy` di `ProjectShow.jsx`).
- Halaman yang sudah ter-hook: Agenda, Dashboard, Daftar Proyek, Detail Proyek (+ `ApprovalDrawingList`), Kendala, Approval Drawing, GIS, Laporan, Manajemen Pengguna.

## Export & reporting

- `GET /api/reports/export-csv` (text/csv) and `GET /api/reports/export-excel` (.xlsx, via **exceljs** — server-only dep in `server/routes/reports.js`). Both are public anchor downloads (`exportCsvUrl()` / `exportExcelUrl()` in `src/api.js`).
- `getReports` returns filterable project list; ReportsPrint gives a browser-print PDF-style layout.