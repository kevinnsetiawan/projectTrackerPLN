# Implementation plan

## Architecture

Extend the existing `unit_memberships` contract with nullable `jabatan` and the existing role capability map. Keep global identity roles for compatibility only; authorization resolves the active unit membership. Add `asman` and `logistik` to existing validation and UI labels without adding a new permission editor.

## Data and API contracts

- Membership write accepts optional trimmed `jabatan` of at most 120 characters; omitted preserves the current value.
- `/api/auth/me` and membership responses expose `jabatan` alongside existing unit membership fields.
- `asman` maps to IK approval level 2; `enjin` remains compatible with that level. Approval order remains Dalkon → level 2 → Unit Induk.
- Provisioning consumes secure stdin, validates UPT-SBYA active UPT identity, supports dry-run/apply, and wraps all account/membership work in one transaction with idempotent exact-match no-op and conflict abort.
- Apply records `provision_id`, verified root actor, and a non-secret request fingerprint for safe rerun/audit; passwords are never included in the fingerprint or repository.

## Delivery and safety

Create and test the schema/API/frontend release together. Take and verify pre-migration backup plus isolated restore, stop the old API before an approved migration, deploy the matching image/dist, then verify ten logins and role boundaries. Never set `current-sha` manually without release verification.

Before opening web traffic, the verified new app must bootstrap/verify the schema and role constraints against the database after backup/restore and app health/image checks. Any failure retains maintenance and blocks the release; no separate migration CLI is introduced.

## Rollback

On failed migration or verification, retain maintenance and restore the verified backup/release. Do not reset passwords or delete existing memberships as rollback shortcuts.
