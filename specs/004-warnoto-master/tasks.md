# Tasks

- [x] T001 Record the approved local-only GI import, API, and UI contracts.
- [x] T002 Add GI source schema and unit-consistent project-location foreign keys through the foundation owner.
- [x] T003 Prepare and validate source mapping plus explicit idempotent import/dry run through the import owner. PostgreSQL 17 scratch verified the real snapshot twice with stable source IDs and target primary keys: 1 UIT, 6 UPT, 189 GI.
- [x] T004 Implement scoped GI read APIs and project-location link validation through the routes owner. All 65 API checks passed.
- [x] T005 Add the read-only master page, scoped navigation, search/filter, active status, and nullable coordinate display.
- [x] T006 Add optional per-location active GI selection and visible retained inactive references without overwriting location data.
- [x] T007 Run focused authorization/import/location tests and build. PGlite and PostgreSQL 17 suites passed, including the existing 128 isolation checks, import/migration tests, and regression suite. CI includes the new disposable-database suites.
- [x] T008 Verify UI behavior and responsive accessibility against an isolated local fixture; stop QA services afterward. Root/vendor scope, active and retained inactive GI saves, three mixed locations, unchanged name/coordinates, and the 375 px form passed. The 375 px master table still expands document width to 518 px; error/retry browser verification remains pending. Old QA services were stopped; the separate user-requested preview remains running.
- [x] T009 Review the complete local dry run with the main agent. Production import and rollout remain deferred. The user explicitly authorized commit and push after reviewing the local preview; database migration still requires the manual rollout procedure.

HANDOFF is outside this task and is not modified automatically.

## Remaining UI verification

- [ ] T010 Constrain the master GI table at 375 px and complete the error/retry browser checks. This finding does not block the user's explicit request to commit and push the reviewed local implementation; do not report mobile master or error/retry checks as passing.
