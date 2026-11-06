# Analysis

## Preimplementation decisions

- Roles are per-unit membership. `asman` maps to IK level 2; `logistik` has read and agenda write. Existing roles and global identity fields remain compatible.
- `jabatan` is optional, trimmed, nullable, and limited to 120 characters. Omission preserves the current membership value; membership saves retain the existing authorization-version invalidation.
- Provisioning is secure stdin dry-run/apply for exactly active `UPT-SBYA`, with atomic ten-account creation, exact rerun no-op, conflict abort, `provision_id`, verified-root audit actor, and non-secret fingerprint. Inputs and credentials stay outside Git.
- Schema release requires matching API/frontend artifacts, backups with isolated restore, maintenance, approved schema SHA, old API stopped before migration, and a post-bootstrap role/constraint gate before web traffic.

## Verification evidence

Independent checks passed for the new roles, isolation 167, GI 65, WARNOTO, schema gate positive/legacy-constraint negative cases, readiness fail-closed behavior, bash syntax, Layout SSR, frontend context, and build. CI run `42188543865` passed with PostgreSQL 17. Release `e41f49a0870a64c43648e5e20f70ce19a9cc05d8` is deployed. Ten UPT-SBYA accounts were created; exact rerun was a no-op, ten logins were verified across asman, dalkon, logistik, and staff roles, and cross-unit/IAM denials passed. Ten memberships were added for unit ID 14; the original root identity, organization, and 189 GI records were unchanged. Isolated backup restores verified the root password and ten new profile fingerprints. Backups `/var/backups/protrack/protrack-20261106T083845Z.dump` and `/var/backups/protrack/protrack-20261106T085158Z.dump` copied to PVE and restored in isolation. The deploy timer is active, a manual no-op run succeeded, the public site returned HTTP 200, release metadata matched the deployed SHA, registration remained closed, and unauthenticated projects returned 401. Browser visual QA was blocked by a user print dialog; no visual claim is made. T009 and T010 are complete. No production account, credential, real name, email, or password is recorded here.
