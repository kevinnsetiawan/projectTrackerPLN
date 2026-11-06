# Tasks

## Phase 1: Contract and schema

- [x] T001 Add `asman` and `logistik` role definitions and capability tests without changing existing role semantics.
- [x] T002 Add nullable `unit_memberships.jabatan` migration with 120-character validation and preserve auth-version behavior.
- [x] T003 Update auth/me and membership contracts to expose jabatan and active-unit role labels.

## Phase 2: Provisioning

- [x] T004 Build secure stdin dry-run/apply provisioning for exactly active UPT-SBYA; validate ten records before atomic apply.
- [x] T005 Verify exact rerun no-op, conflict abort, no password reset, and no writes in dry-run.
- [x] T006 Record provision ID, verified-root audit actor, and non-secret request fingerprint for safe rerun/conflict detection.

## Phase 3: Business behavior and UI

- [x] T007 Map asman/enjin to IK level 2 and verify Dalkon → level 2 → Unit Induk ordering.
- [x] T008 Add minimal role/jabatan display and edit flows; verify read/mutation scope, vendor assignment, control-plane denial, and realtime invalidation for all affected roles.

## Phase 4: Verification and rollout

- [x] T009 Add PostgreSQL/PGlite, API, frontend, and ten-login regression tests; run build and dependency checks.
- [x] T010 Stage matching API/frontend artifacts, backup and isolated restore, maintenance migration approval, rollback check, and production verification.
