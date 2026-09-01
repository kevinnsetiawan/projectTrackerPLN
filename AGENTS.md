# AGENTS.md

Laravel 11 app ("PLN Pro-Track") for monitoring PLN construction project progress (GI, SUTT, SUTET, SKTT, PLTS works). Server-rendered Blade; no Livewire/Inertia, no auth.

## Stack & setup

- PHP `^8.2`, Laravel `^11`. Database is **SQLite** (`database/database.sqlite`); `.env` sets `DB_CONNECTION=sqlite` (MySQL vars are commented out — don't switch to MySQL unless asked).
- Frontend assets (Tailwind, Chart.js, Leaflet, Lucide) are loaded **via CDN** in `resources/views/layouts/app.blade.php`, not through Vite. `package.json`/`vite.config.js` exist but are essentially unused for app styling. Match the CDN pattern for UI work; don't introduce npm build steps for view changes.
- Faker/Jetstream auth is absent — all routes in `routes/web.php` are public with no middleware.

## Commands

- Serve: `php artisan serve` (APP_URL defaults to `http://localhost:8000`).
- Migrate + seed: `php artisan migrate:fresh --seed`
- Tests: `php artisan test` (Feature suite lives in `tests/Feature`, incl. `ProTrackRoutesTest.php`).
- Code style is enforced by Laravel Pint (`vendor/bin/pint`).

## Testing gotcha

`ProTrackRoutesTest` hits routes like `/projects/1` and asserts **seeded** content (`GI-150-SRP`, "Kurva S"). Feature tests have no `RefreshDatabase`/seeding and run against the on-disk sqlite DB. After a fresh checkout or empty DB, run `php artisan migrate:fresh --seed` first or these tests will fail.

## Domain model & conventions

- A `Project` owns `Milestone`, `SCurve`, `Kendala`, `Dokumentasi` (all `hasMany`, ordered by `urutan`/`id` or `desc id`).
- Terminology is Indonesian: `kendala` = issue/obstacle, `dokumentasi` = construction photos, `uip`/`upp` = PLN business units, `ROW` = right-of-way, `COD` = commercial operation date.
- `deviasi` (deviation) = `progres_realisasi - progres_rencana` (tracked on `Project`; `SCurve` rows hold weekly `rencana`/`realisasi`).
- `Project.status` enum: `Planning`, `In Progress`, `Critical`, `Testing`, `COD / Energized`. Auto-derivation logic exists in both `ProjectController::store` and `ProgressController::store` (e.g. `realisasi >= 100` → `COD / Energized`, `deviasi < -5` → `Critical`) — keep them consistent if you change status rules. Badge colors map in `Project::getStatusBadgeClassAttribute`.
- The hardcoded `$allTipe` / `$allUip` option arrays are **duplicated** across `ProjectController`, `GisController`, and `ReportController`. Edit them in all three or extracts to avoid divergence.

## Views

- Blade views extend `layouts/app.blade.php` and use `@section('title')`, `@section('page-title')`, `@section('content')`, plus `@push('styles')`/`@push('scripts')`.
- PLN design system is a Tailwind config block inside `layouts/app.blade.php`: brand colors under `pln.*` (`navy`, `cyan`, `yellow`, `surface`, …), font "Plus Jakarta Sans". Use these for new UI.
