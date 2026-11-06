# Analysis

## Preimplementation decisions

- Roles are per-unit membership. `asman` maps to IK level 2; `logistik` has read and agenda write. Existing roles and global identity fields remain compatible.
- `jabatan` is optional, trimmed, nullable, and limited to 120 characters. Omission preserves the current membership value; membership saves retain the existing authorization-version invalidation.
- Provisioning is secure stdin dry-run/apply for exactly active `UPT-SBYA`, with atomic ten-account creation, exact rerun no-op, conflict abort, `provision_id`, verified-root audit actor, and non-secret fingerprint. Inputs and credentials stay outside Git.
- Schema release requires matching API/frontend artifacts, backups with isolated restore, maintenance, approved schema SHA, old API stopped before migration, and a post-bootstrap role/constraint gate before web traffic.

## Verification evidence

Independent checks passed for the new roles, isolation 167, GI 65, WARNOTO, schema gate positive/legacy-constraint negative cases, readiness fail-closed behavior, bash syntax, Layout SSR, frontend context, and build. IAM/approval fixtures and real HTTP checks passed. PostgreSQL CI and production rollout remain pending in T009–T010. No production account, credential, real name, email, or password is recorded here.
