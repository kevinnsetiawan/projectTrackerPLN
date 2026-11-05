# Tasks

- [x] T001 Record the approved local-only GI import, API, and UI contracts.
- [x] T002 Add GI source schema and unit-consistent project-location foreign keys through the foundation owner.
- [x] T003 Prepare and validate source mapping plus explicit idempotent import/dry run through the import owner. PostgreSQL 17 scratch verified the real snapshot twice with stable source IDs and target primary keys: 1 UIT, 6 UPT, 189 GI.
- [x] T004 Implement scoped GI read APIs and project-location link validation through the routes owner. All 65 API checks passed.
- [x] T005 Add the read-only master page, scoped navigation, search/filter, active status, and nullable coordinate display.
- [x] T006 Add optional per-location active GI selection and visible retained inactive references without overwriting location data.
- [x] T007 Run focused authorization/import/location tests and build. PGlite and PostgreSQL 17 suites passed, including the existing 128 isolation checks, import/migration tests, and regression suite. CI includes the new disposable-database suites.
- [x] T008 Verify UI behavior and responsive accessibility against an isolated local fixture; stop QA services afterward. Root/vendor scope, active and retained inactive GI saves, three mixed locations, unchanged name/coordinates, and the 375 px form passed. The master table overflow and error/retry checks were completed under T010. Old QA services were stopped; the separate user-requested preview remains running.
- [x] T009 Review the complete local dry run with the main agent. Production import and rollout remain deferred. The user explicitly authorized commit and push after reviewing the local preview; database migration still requires the manual rollout procedure.

HANDOFF is outside this task and is not modified automatically.

## Production completion authorized by the user

The user subsequently requested completion through production while away from the laptop. This authorizes the reviewed manual migration/import/release procedure and the necessary commits and pushes; it does not authorize writes to WARNOTO or changes to existing user permissions.

- [ ] T011 Stage the final CI-green release, enter maintenance, create and restore a fresh pre-migration backup with a verified PVE copy, migrate/import, and activate the matching API/frontend.
- [ ] T012 Verify preserved data and credentials, scoped master/API behavior, final backup/restore, reboot and timer recovery, and public browser smoke.

## Remaining UI verification

- [x] T010 Constrain the master GI table at 375 px and complete the error/retry browser checks. Absolute `sr-only` link text escaped the table scroll container; adding `relative` to that existing container fixes its containing block without changing shared layout. On the isolated preview at `127.0.0.1:5176` (backend `4002`), the actual 189-row master has document widths of 375 px and 1366 px at those viewport widths, with horizontal scrolling contained inside the mobile table. Visible filter labels, keyboard focus, 44 px controls, read-only controls, and a forced 503 followed by successful retry were verified. A separate browser-only vendor-shaped context and scoped reference responses verified form error/retry, editable manual fields, active choices, unchanged location name/zero coordinates, and the 375 px form without saving or mutating backend data. Browser page errors were empty; the production build passed.

UI evidence is stored outside the repository in `C:/Users/PLN/AppData/Local/Temp/pln-gi-master-375-final.png`, `pln-gi-master-desktop-final.png`, and `pln-gi-form-retry-375-final.png`.
