# AGENTS.md

PLN Pro-Track — React 18 + Vite 5 SPA with an Express REST API, backed by PGlite (in-memory Postgres) by default or Postgres via `pg`. Monitors PLN construction project progress (GI, SUTT, SUTET, SKTT, PLTS works). No auth frontend framework — custom HMAC-token auth, no third-party UI libs.

## Stack & setup

- **Frontend**: `src/` — React Router SPA. Tailwind is loaded **via CDN** in `index.html` with a PLN design-system config (brand colors `pln.*`, font "Plus Jakarta Sans") — do not add a Tailwind PostCSS build step.
- **Backend**: `api/` — Express app exported from `api/index.js`. Routers live in `api/routes/*`, shared helpers in `api/_lib/*`.
- **DB**: dual driver in `api/_lib/db.js`. Uses PGlite when no explicit `DB_DRIVER` (default), Postgres when `DB_DRIVER=pg` + `DATABASE_URL`. DDL in `api/_lib/schema.js`, demo data in `api/_lib/seedData.js` (auto-seeded when driver is pglite / not explicit).
- **Node**: PHP/Laravel is NOT used. Frontend uses a shared design system, never npm-wired Tailwind.

## Commands

- Serve frontend: `npm run dev` (Vite, http://localhost:5173)
- Serve backend: `npm run api:dev` (node `api/local-server.js`, http://localhost:4000)
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
- `Project.status` (via `deriveStatus`): `In Progress`, `BASTB` (barang sudah dicek), `BAST 1` (progres ≥100%), `BAST 2` (BAST 1 + masa garansi `tgl_selesai_garansi` terlampaui). Auto-derivation lives in `api/_lib/business.js` (`deriveStatus`, used by both `POST /projects` and `POST /projects/:id/progress`) — keep status rules consistent in one place. `STATUS_BADGE` in the same file is the display source — don't duplicate the keys.
- `ALL_TIPE`, `ALL_UIP`, `KATEGORI_KENDALA`, `CSV_HEADERS`, badge maps live in `api/_lib/business.js`. It is the single source of truth — do not duplicate these option arrays in route files.

## Auth & RBAC (roles)

- Roles: `vendor` (Kontraktor), `dalkon` (Pengawas), `enjin` (Engineering), `admin`. Constants & helpers in `api/_lib/auth.js`: `ROLES`, `ROLE_LABELS`, `hashPassword`, `verifyPassword`, `signToken`, `verifyToken`, `publicUser`, middlewares `requireAuth`, `requireRole(...roles)`.
- **Every mutation route must chain `requireAuth` and (where role-restricted) `requireRole(...)`.**
- Current permission matrix:
  - `vendor` + `dalkon` + `admin`: create/update projects, input progress, kurva-S docs, dokumentasi, instruksi, BOQ upload/fotos, upload drawing (vendor/admin).
  - `dalkon` + `admin`: termin bayar status, amandemen, agenda (CRUD), kirim rekap WA, delete project, delete kendala, drawing dalkon step.
  - `enjin` + `admin`: kendala status update/edit; `enjin` only: drawing engineering review step.
  - `admin` only: delete drawing, user management (`/api/users`), everything.
  - Reporting/read-only endpoints (dashboard, projects list/detail, reports, gis, agenda list, kendala list) are public but the SPA still requires login.
- Frontend helpers in `src/auth.js`: `getUser`, `can(...roles)`, `ROLE_LABELS`, `ROLE_FULL_LABELS`.
- Admin-only `/api/users` router in `api/routes/users.js` (list/create/update/delete + password reset); guard the SPA page with `<RequireAdmin>` in `src/App.jsx` and the nav item in `src/components/Layout.jsx` (`adminOnly: true`).
- Do not break the admin bypass used by tests.

## Files & uploads

- Files are stored as **base64 data-URLs in DB TEXT columns** (no disk/multer). Frontend reads via `FileReader`; backend `express.json({ limit: '15mb' })` (api/index.js).
- Add a client-side size guard (max 8 MB) via `fileToDataUrl(file, maxMb)` in `src/utils.js` before reading.
- Drawings, kurva-S docs, instruksi, BOQ photos, dokumentasi and amandemen docs all follow this pattern.

## Views

- SPA pages in `src/pages/*`, shared UI in `src/components/ui.jsx` (Card, StatusBadge, ProgressBar, StatCard, Field, DevChip, Spinner, PageHeader, Empty, BadgeIcon) and `src/components/Layout.jsx` (page title contract via `setPageTitle`, admin nav hints, `ROLE_BADGE`).
- Follow the `pln.*` Tailwind color tokens and existing component patterns for new UI; keep the Indonesian labels.

## Export & reporting

- `GET /api/reports/export-csv` (text/csv) and `GET /api/reports/export-excel` (.xlsx, via **exceljs** — server-only dep in `api/routes/reports.js`). Both are public anchor downloads (`exportCsvUrl()` / `exportExcelUrl()` in `src/api.js`).
- `getReports` returns filterable project list; ReportsPrint gives a browser-print PDF-style layout.