# Analyze Contract Reconciliation

## Drift

The current implementation treats Analyze as if it owns `analyze.md`:

- `src/main/hooks/manifest.ts` lists `STEP_ARTIFACT_MANIFEST.analyze.requiredFiles` as `['analyze.md']`.
- `src/main/domain/factories/analyze.factory.ts` validates required markdown for the Analyze step and returns a commit candidate for the manifest required files.
- `src/main/domain/factories/analyze.factory.test.ts` expects a valid Analyze pass to read `analyze.md` and commit `files: ['analyze.md']`.

The roadmap says something different: Analyze may remediate `spec.md`, `plan.md`, and `tasks.md`, and it commits with `--allow-empty` when no diff exists. The roadmap and constitution are the higher-level contract for Run 8, so the current `analyze.md` requirement is drift.

## Fix Plan

Run 8 implementation should rewrite the Analyze factory and manifest:

- Remove `analyze.md` as a required artifact.
- Represent Analyze allowed remediation targets as `spec.md`, `plan.md`, and `tasks.md`.
- Preserve `allowEmptyCommit: true` for Analyze.
- Validate that any Analyze commit scope is limited to the allowed remediation targets.
- Allow a no-diff pass path that still emits the Analyze Step Commit trailer through the lifecycle hook.
- Keep Analyze non-destructive from the UI perspective: it reports remediation targets and milestones, not a standalone artifact.

## Tests To Update

- Rewrite `src/main/domain/factories/analyze.factory.test.ts` so each factory case has its own `describe` block.
- Add happy-path coverage for allowed target sets: `spec.md`, `plan.md`, `tasks.md`, and combinations.
- Add an empty-diff/allow-empty case.
- Add rejection coverage for disallowed targets such as `analyze.md`, files outside the feature directory, and unrelated source files.
- Update manifest tests and hook helper tests that currently expect `analyze.md`.
- Add passive-step IPC tests proving Analyze `done/pass` uses compact manifest/remediation summary plus `commitSha`, not full artifact text.
