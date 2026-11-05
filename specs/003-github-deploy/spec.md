# GitHub CI and production promotion

Status: approved for implementation, 2026-11-05.

## Objective

Use the private repository `udawidi/projectTrackerPLN` as the source of reviewed, tested releases. Changes on `main` and pull requests run the existing regression and security suites. Only a successful, current `main` commit may advance the `production` branch consumed by the existing server deployment process.

## Requirements

- Use Node 22 and `npm ci` with the committed lockfile, without dependency updates.
- Run `npm test`, PGlite foundation/isolation, frontend context, calendar, registration, and the production build.
- Run `test-local.mjs`, `test-unit-foundation.mjs`, and `test-upt-isolation.mjs` against PostgreSQL 17, each in a fresh isolated database with `PG_POOL_MAX=5`.
- Keep the existing dependency-audit findings informational; do not bypass test or build failures.
- Pull-request jobs have read-only repository permissions and no production credentials. Pin official actions to immutable commit SHAs verified through the GitHub API.
- After every required job succeeds on a push to `main`, a separate job may create or fast-forward `refs/heads/production`. It must reject stale runs and never force an update.
- The server keeps its read-only deploy key. No production SSH key, database URL, application password, or signing secret is stored in Actions. Do not introduce Vercel deployment.
- Preserve existing attribution; do not invent a license. Do not edit HANDOFF without user approval.

## Acceptance

PRs cannot execute the write-permission promotion job. Failure in any required test matrix or build prevents promotion. A stale run performs no ref update, and a divergent production branch is rejected rather than overwritten. GitHub CI runs and the server-side pull/release integration must be verified before declaring the overall delivery complete.
