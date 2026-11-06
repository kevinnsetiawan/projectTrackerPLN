# Implementation plan

## Architecture

Single PostgreSQL with explicit shared API scope predicates and ownership foreign keys; no mandatory RLS overhaul. Maintain PGlite test support. Existing UI and self-host deployment remain intact.

Foundation owner implements units, unit_memberships, vendor_project_assignments, audit records, users.active/auth_version/is_superadmin, projects.unit_id and agendas.unit_id. Existing root admin is promoted explicitly by verified identity, never by blanket legacy role. No production fixture units.

Fresh requireAuth populates identity, memberships and context. Scope helpers govern every business router. Control-plane routes remain usable by superadmin with no active unit; business mutations still require appropriate membership/capability, while root read-all is explicitly read-only.

## Contracts

Header X-Unit-ID and query unit for files/SSE accept authorized ID, root superadmin's active-unit selection, or root's all-read scope. Conflicting values are 400; missing context is none. Out-of-scope object is 404; forbidden action on visible resource is 403. Token includes identity and authorization version; legacy tokens require login again. Root read-all never grants mutation capability or vendor assignment visibility outside valid project ownership.

scope.js: projectScope(req, alias='p', start=1) returns {sql,params}; assertProject(req,id,action='read',db=query); assertChild; agendaScope/assertAgenda/assertPic; requireUnitContext; requireCapability; canInUnit; getCapabilities. Request context has mode unit|all|none, unit_id, unit, role. Foundation and router owners coordinate these interfaces directly before changes.

GET /api/auth/me returns memberships, selectable_units, context, setupRequired and capabilities. `selectable_units` contains active unit objects only; root receives all active units, while non-root receives actual active memberships. Unit master, scoped users, memberships and project vendor assignments use authenticated APIs. Frontend stores active context in sessionStorage per tab, cancels old requests and reconnects SSE after switching. Root's unit dropdown labels non-membership units as read-only and exposes an explicit Pantau semua unit option.

## Implementation order

1. Add schema/auth/scope/control plane and explicit migrations, runtime seeding off.
2. Scope all business queries, children/files/exports/approval/realtime and caches.
3. Implement unit selector, organization/user assignment UI, capability navigation and fixed security matrix.
4. Adapt test-only fixtures and add adversarial tests on both DB drivers.
5. Validate, back up/restore production, clear authorized transactions, migrate and deploy during maintenance, verify actual hosted UI/API and preserve other services.

## Risks

Missed direct-ID routes, global admin bypass, nullable project-less agendas, old tokens, global revision cache, and cross-project child references require negative tests. Never run unscoped old code over migrated multi-unit data. Secrets and HANDOFF are excluded from automatic changes.
