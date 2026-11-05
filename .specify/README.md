# Spec Kit workspace

Feature artifacts live in `specs/self-host-protrack/` and `specs/002-upt-isolation/`. The active feature and artifact paths are recorded in `feature.json`.

The CLI initialization did not generate the usual prerequisite scripts or extension hooks in this workspace. Validation therefore reads the recorded spec, plan, tasks, and checklist directly. Do not treat missing generated tooling as evidence that application acceptance checks have run.
