# Master Gardu Induk Warnoto

Status: approved for local implementation, 2026-11-05. Publishing and production import require explicit follow-up authorization.

## Objective

Import the approved Warnoto organization and Gardu Induk reference snapshot into Pro-Track through an explicit operator workflow. Make GI references readable within existing unit authorization and optionally link each project location to a GI without changing its manually entered name or coordinates.

## Requirements

- Preserve the existing global identities, unit memberships, operational capabilities, and vendor project assignments. A master reference does not grant access to a project or create a business-role bypass.
- Store GI source identifiers, owning unit, name, active status, nullable coordinates, and map source URL. Preserve source provenance and avoid inventing missing coordinates or production unit names.
- Use an explicit import plan and dry run. Validate and map the approved source into the existing unit model before applying changes. Imports must be repeatable without duplicate source references and must not run during normal bootstrap.
- `GET /api/gardu-induk` returns authorized rows; active rows are the default and `include_inactive=1` includes authorized historical references. Technical root can inspect the master without an operational membership. Other contexts remain bounded by their authorized unit/Unit Induk scope.
- Provide a read-only master page with name/UPT search, UPT filtering, active status, nullable coordinate display, and source-map links. Do not add master CRUD or permission editors.
- Each project location may submit `gardu_induk_id` or null. New selections use active GIs belonging to the project UPT. Existing inactive links remain visible and can be retained under server validation.
- Selecting a GI must not overwrite project location name, latitude, or longitude. Manual locations and multiple locations remain supported.
- Keep all work local. Do not push, trigger deployment, import production data, or edit HANDOFF without explicit approval.

## Acceptance

Verify master visibility for technical root, UPT users/vendors, and Unit Induk. Cross-unit master IDs and location links are rejected server-side; vendor project visibility remains restricted to assignments. Verify optional/manual, active, inactive-retention, multiple-location, coordinate-preservation, and rollback/error paths. Run focused tests, a production build, and isolated local UI checks. Production import and deployment remain deferred.
