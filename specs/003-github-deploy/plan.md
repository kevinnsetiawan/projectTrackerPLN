# Implementation plan

## Approved architecture

One GitHub Actions workflow runs on pushes to `main` and pull requests targeting `main`. A Node/PGlite/build job and a PostgreSQL matrix job run independently. Each PostgreSQL matrix entry receives a new PostgreSQL 17 service and its own database, because the suites create and delete fixtures.

All test jobs use `contents: read`, disable persisted checkout credentials, and generate a disposable JWT signing key locally in the runner. The PostgreSQL service credential is a public test fixture with no production access. Dependency-audit output remains informational while all regression/security/build checks remain required.

A dependent promotion job has only `contents: write` and executes no repository code. It reads the latest `main` SHA, checks `production`, rechecks `main` immediately before writing, and uses the GitHub ref API with `force: false`. A missing production ref is created at the verified SHA. Workflow cancellation and a serialized promotion concurrency group reduce competing runs; the fast-forward rule prevents an older run from moving production backwards even if main advances during the final API interval.

Server deployment remains outside Actions. The server polls the verified production ref using a read-only deploy key and retains its existing runtime secrets, backup, migration, and rollback controls. Server setup, repository creation/settings, and hosted rollout are coordinated by the main agent and operations owner.

## Action provenance

Resolved from the official repositories through `gh api` on 2026-11-05:

- `actions/checkout` v7.0.1 → `3d3c42e5aac5ba805825da76410c181273ba90b1`.
- `actions/setup-node` v7.1.0 → `949feb2413d6458794dcd2491c4babbbce0c15c1`.
- `actions/github-script` v9.0.0 → `3a2844b7e9c422d3c10d287c895573f7108da1b3`; its annotated release tag was dereferenced to the commit.

## Risks and validation

Branch protection or repository workflow settings may reject the promotion token; configure the intended policy explicitly rather than adding a PAT or weakening force-update controls. A production ref outside main history should fail safely and require operator investigation. Static workflow validation and mocked promotion cases cover orchestration locally; actual hosted Actions runs establish runner/service compatibility.
