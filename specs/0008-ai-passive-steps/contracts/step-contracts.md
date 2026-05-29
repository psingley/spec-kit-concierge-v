# Contract: Plan, Tasks, and Analyze Step Contracts

All Run 8 Step Contract factories are disk-entry trust boundaries and follow the seven-case floor:

1. Happy path.
2. Empty object named error.
3. Null named error.
4. Undefined named error.
5. Hostile malformed case.
6. Partial structurally plausible case.
7. Extra-key rejection for malicious JSON/frontmatter payloads.

Implementation must write these as sequential vertical RED -> GREEN tracer bullets, not a horizontal test batch.

## Plan Contract

Required artifacts:
- `plan.md`
- `research.md`

Optional discovered artifacts:
- `data-model.md`
- `contracts/*`
- `quickstart.md`

Allowed exception:
- `.github/copilot-instructions.md` may be modified by Plan to update the SPECKIT-marked plan path.

Pass rules:
- Required artifacts exist and satisfy required headings/fields.
- Optional artifacts are summarized when present and do not fail Plan when absent.
- Compact manifest includes required artifacts, optional artifacts, context-file exception when present, and `commitSha`.
- Full artifact bodies are excluded.

Fail rules:
- Missing or invalid required artifacts.
- Context-file changes outside the SPECKIT-marked exception.
- Extra or malicious frontmatter keys rejected by the factory.

## Tasks Contract

Required artifacts:
- `tasks.md`

Parsed details:
- Task id.
- Title.
- Phase/area when present.
- Dependencies when present.
- Files when present.
- Acceptance notes when present.
- Estimate when present.

Pass rules:
- `tasks.md` exists and has parseable task identities.
- Each parsed task has a stable id and title.
- Dependency references are understandable enough for safe display.
- Compact manifest includes `tasks.md`, task count, malformed count of zero, and `commitSha`.

Fail rules:
- Missing `tasks.md`.
- Duplicate task ids.
- Missing ids or titles.
- Unresolved or malformed dependencies that prevent safe user presentation.
- Extra or malicious frontmatter keys rejected by the factory.

## Analyze Contract

Analyze does not own or require `analyze.md`.

Allowed remediation targets:
- `spec.md`
- `plan.md`
- `tasks.md`

Pass rules:
- Analyze may pass with no diff and an empty Step Commit.
- Analyze may pass with changes limited to allowed remediation targets.
- Compact summary reports changed targets, verified targets, no-diff state, and `commitSha`.

Fail rules:
- Any attempted remediation of `analyze.md`.
- Any attempted remediation outside the active feature directory.
- Any source-code, documentation, or unrelated artifact change outside `spec.md`, `plan.md`, and `tasks.md`.
- Step Commit failure or hook validation failure.

## Analyze Drift Migration

Run 8 implementation must remove the current `analyze.md` assumption from:
- `src/main/hooks/manifest.ts`.
- `src/main/domain/factories/analyze.factory.ts`.
- `src/main/domain/factories/analyze.factory.test.ts`.
- Hook/helper tests that assert Analyze required artifacts.
- Passive pipeline summaries that would otherwise expose `analyze.md`.

Replacement tests must prove:
- Allowed target combinations pass.
- No-diff pass writes/returns Step Commit identity.
- Disallowed `analyze.md`, source files, and outside-feature files fail.
- Terminal `done/pass` carries compact remediation summary plus `commitSha`, not artifact text.
