# UPT Surabaya Unit Job Roles

Status: approved for planning, 2026-11-06. Implementation and provisioning remain gated by CI, backup, and maintenance approval.

## Objective

Add the `asman` and `logistik` job roles for UPT-SBYA and provision ten new unit accounts atomically, without changing existing identities, passwords, memberships, or cross-unit authority.

## Requirements

- Unit membership may carry optional `jabatan`, trimmed and limited to 120 characters; omitted values preserve existing data and membership saves retain the existing `auth_version` bump.
- `asman` has business capabilities excluding `user_manage` and `security_matrix`, including `ik_upt`; it has no `drawing_dalkon`, `drawing_enjin`, `ik_ultg`, or `ik_induk`. `logistik` has `read` and `agenda_write`. Existing `dalkon` remains unchanged; `staff` remains read-only.
- IK approval stays three levels. `asman` aliases Engineering level 2; either `asman` or `enjin` may approve once after Dalkon, and Unit Induk remains last. No new stage is added.
- Roles and jabatan are scoped to `unit_memberships`; global `users.role` is not an authorization source. No role grants control-plane or cross-unit privilege.
- Provisioning targets exactly active unit code `UPT-SBYA`, kind `upt`. Ten new accounts and memberships are created in one atomic operation. Re-running the exact same identities and memberships is a no-op; conflicts abort without password resets or partial writes.
- Provisioning supports secure stdin input plus dry-run/apply modes. Credentials stay outside Git and are handled only by root. No demo or seed accounts are created.
- Each provisioning run has an operator-supplied `provision_id` and records an audit fingerprint of the requested identities/memberships with the verified root actor; the same exact fingerprint is a no-op, while a changed fingerprint conflicts and aborts.
- Existing root identity, password, memberships, projects, and assignments remain unchanged. New schema/role releases require matching tested API/frontend artifacts, backup and isolated restore, maintenance mode, approved schema SHA, and old API stopped before migration.

## User scenarios and acceptance

1. An administrator selects UPT-SBYA and sees ten memberships with the requested role/jabatan labels; other units are unchanged.
2. An `asman` can use UPT business reads, progress/project capabilities allowed by the role, and IK UPT approval; attempts at excluded capabilities return the existing denial behavior.
3. A `logistik` can read scoped data and write agenda, but cannot mutate projects, approvals, users, or security policy.
4. Repeating the same provisioning input reports no-op; any identity, unit, or membership conflict aborts atomically.

## Success criteria

- Ten intended accounts and memberships exist for UPT-SBYA with no duplicate or partial records.
- Existing account/password/membership fingerprints are unchanged.
- Role capability and three-level IK tests pass for asman, logistik, dalkon, enjin, and staff.
- Dry-run makes no writes; apply is repeatable and conflict-safe.
- CI, isolated PostgreSQL/PGlite tests, build, backup/restore, maintenance rollout, and ten login checks pass before release.

## Assumptions

The ten identities, emails, passwords, and jabatan values are supplied securely at provisioning time and are never committed to the repository. Existing authorization helpers and UI patterns are extended minimally.
