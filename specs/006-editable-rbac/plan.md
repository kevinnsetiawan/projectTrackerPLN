# Implementation plan

## Contracts

Enhance `GET /api/security-matrix` with feature/role/kind metadata and current revision. Add `PUT /api/security-matrix/:unitKind` accepting `{ revision, matrix }`, where matrix contains complete role/action arrays for the selected kind. Server validates editable actions, stage cardinality, CAS revision, audit, and auth-version invalidation in one transaction.

## Frontend

Reuse existing table, checkbox, modal, and capability helpers. Add kind tabs and grouped rows with explicit labels and disabled explanations. Read current policy from the server; never infer authority from role labels or hidden controls. On 401/revocation, clear stale context and require fresh authentication. Revision events trigger reload while preserving dirty forms until save/cancel.

## Safety and rollout

IAM actions remain locked. Initial policy is generated from current effective access. Test PostgreSQL/PGlite, API authorization, revision conflicts, audit/auth-version behavior, frontend keyboard/mobile layout, and route/file/export guards before deployment.
