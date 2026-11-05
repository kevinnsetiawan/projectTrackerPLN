# Tasks

- [x] T001 Record the approved private-repository CI and server-pull architecture.
- [x] T002 Resolve official action release tags to immutable commit SHAs.
- [x] T003 Implement Node 22/PGlite regression, context/calendar/registration checks, and build.
- [x] T004 Implement three independent PostgreSQL 17 fixture databases and suites.
- [x] T005 Implement a read-only PR path and a separately privileged, current-main, fast-forward production promotion job.
- [x] T006 Validate workflow syntax and promotion failure/staleness behavior locally. Actionlint 1.7.12 reported no diagnostics; mocked current, stale, rechecked, unchanged, missing-ref, and divergent-ref cases passed.
- [x] T007 Confirm the complete workflow succeeds in the private GitHub repository and failed/PR runs cannot promote. GitHub run 42028655627 passed all jobs; static and mocked failure/PR/staleness guards passed. Branch protection is unavailable for this private repository under the current GitHub plan; no account upgrade or visibility change was made.
- [ ] T008 Verify server read-only pull, release/rollback controls, and hosted deployment through the operations owner.

T007–T008 belong to the main agent and operations integration. No production secret or deployment key is required by this workflow.
