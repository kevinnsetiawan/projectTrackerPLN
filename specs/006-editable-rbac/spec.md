# Editable Unit RBAC

Status: approved for planning, 2026-11-06. Backend contract and rollout remain gated.

## Objective

Allow only verified technical superadmins to edit per-unit-kind read, operational, and approval capabilities through an auditable, revisioned policy matrix while preserving existing access initially.

## Requirements

- Policies are per unit kind (`upt`, `unit_induk`) and cover seven roles. IAM capabilities remain read-only and cannot be edited.
- Read flags cover agenda, dashboard, projects, drawings, instruksi, GIS, gardu induk, kendala, and reports; `reports_export` is separate. Existing operational capabilities and IK/drawing approval capabilities remain configurable.
- At most one IK approval stage is assigned per role/kind, with at least one valid role per stage: UPT stages 1 and 2, Unit Induk stage 3.
- Policy updates use JSONB plus revision compare-and-swap. Conflicts return 409, audit the transaction, and bump `auth_version` for affected roles. Initial policy preserves current access.
- Non-root monitoring reads parent-scoped child units. Other authorized admins can view but not edit the matrix.
- UI groups features by Baca, Operasional, Approval, and IAM; supports kind tabs, sticky header/first column, horizontal scrolling, accessible checkboxes, dirty state, explicit save/cancel, diff preview, and disabled reasons.
- Menus, direct routes, file/exports, project child tabs, and realtime refresh honor server capabilities. Hidden UI is not a security boundary.

## Success criteria

- Verified superadmin can edit and save each unit-kind policy with revision conflict handling and audit evidence.
- Unauthorized roles cannot edit or gain IAM capabilities.
- Existing access remains unchanged before the first policy edit.
- Frontend displays server policy and refreshes after revision/auth-version changes.
