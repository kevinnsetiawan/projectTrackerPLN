# Implementation plan

## Approved approach

Reuse the existing React/Express/PostgreSQL structure, unit scope helpers, request cancellation, per-tab context, Tailwind tokens, and shared table/form components. No new dependencies or product redesign are needed.

The foundation owner adds canonical GI source/provenance fields and composite unit ownership constraints for project locations. The import owner prepares the approved source mapping, operator dry run, validation, and idempotent import. The routes owner implements scoped read endpoints and validates project-location GI links while retaining existing authorization rules. The frontend owner implements the master table, navigation, and optional per-location reference selector.

## API contract

`GET /api/gardu-induk` returns `{ data: [...] }`, with rows containing `id`, `source_system`, `source_id`, `unit_id`, `unit_name`, `unit_code`, `nama`, `latitude`, `longitude`, `map_source_url`, `source_ultg_id`, and `active`. Optional query filters are `search`, `unit_id`, and `include_inactive=1`; filters only narrow authorized scope. `GET /api/gardu-induk/:id` returns the same flat row and hides foreign IDs with 404.

Project detail retains `lokasis[].gardu_induk_id` and adds `gardu_induk_nama` plus `gardu_induk_active` through a unit-consistent join, including inactive links. The frontend submits only the canonical optional ID alongside the existing location name/coordinates. Display metadata is not submitted as authority.

## UI and verification

The master page requests scoped active/inactive data and supports local name/UPT filtering. It follows existing read-only table patterns, visible labels, keyboard navigation, 44 px controls, and contained mobile table scrolling. Root without a unit can open this master using `unit_manage`; operational users use the contextual `read` capability.

Project forms fetch active GI choices through the existing API helper, preserving unit headers and stale-response protection. A stored inactive reference is labelled explicitly. GI loading failures leave manual entry available and expose a retry control. Selecting a reference changes only its ID.

Verify against a temporary PGlite fixture backend and Vite instance on separate QA ports. Do not use the existing localhost proxy to the production API for new GI validation. Stop temporary QA services after verification. The main agent integrates backend/import tests and decides any later publication step.
