# Analysis

Approved decisions: policies are per unit kind and role; only verified technical superadmin edits. Read, operational, approval, and IAM actions are distinct; IAM is immutable. Updates are full-matrix JSONB with revision CAS, transactional audit, and auth-version bump. Initial policy preserves existing access. No credentials, identities, or production policy values are stored in this feature.

## Verification status

Local and hosted evidence: the root npm suite, unit foundation, core security (25), read-boundary (38, including cross-parent access and vendor assignment checks), UPT isolation (167), GI (65), prior job-role suite (54), frontend Security Matrix SSR checkbox read-only/editable checks, unit-context, Layout SSR, build, deploy schema/readiness checks, CI 42209668371, and PostgreSQL 17 validation passed. Release `b311b492b3494343cc8c9dc4423b74783a525cf6` is live; public health and release checks returned 200, protected business access remained 401 when unauthenticated, and the hosted role/cross-unit checks passed. Ten existing sessions retained their expected capabilities and roles; ten cross-unit checks were denied; staff matrix reads and updates were denied (403), while authorized non-superadmin admins retained read-only access. Two policy rows at revision 1 were verified. Backup copies and isolated dual restores matched the pre/post fingerprints for users, memberships, units, GI, projects, and agendas; no password hashes or auth versions changed. Active-context scope helpers prevent authentication mixing and cross-context permission reuse. Browser visual QA was unavailable and manual visual QA was not performed. No actual names, email addresses, passwords, or credentials are stored.

## Incident note

An initial Node-only probe missed a shell quoting failure because inline Bash quotes stripped a literal. The exact Bash round-trip and apostrophe guard were added, then private-gate and image/dist verification completed before the final deployment. The deployed release passed the corrected checks; timer/manual no-op monitoring remained active with no blocked or failed-SHA state.
