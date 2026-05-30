# Quickstart: Run 9 Review & Evidence Vertical

## Prerequisites

- Work on branch `spec/0009-review-evidence`.
- Keep the active feature pointer on `specs/0009-review-evidence`.
- Do not add runtime dependencies or a Redux slice.

## Implementation order

1. Add tests and implementation for main-process Review evidence aggregation.
2. Add lazy body-read handling on the `review:evidence` capability.
3. Add app-owned Analyze report capture, terminal Markdown extraction, feature/Analyze-commit report index, and passive summary metadata.
4. Add Plan optional artifact discovery and passive summary optional rows.
5. Add renderer RTK Query endpoint/factory and Review smart/dumb components.
6. Add read-only non-Review dim treatment and deterministic Resume targeting.
7. Update passive ACP stream silence handling to 40 minutes and active-stream reset.
8. Retrofit StatusStep behavior and visual fixtures through real component paths.

## Targeted verification commands

```bash
npm run typecheck
npm run lint
npm run test
npm run vd:capture -- review-unavailable review-populated review-readonly-bounce review-task-modal plan-passive-running plan-passive-done tasks-passive-done analyze-passive-done
npm run vd:diff
npm run vd:report
```

## Manual evidence checks

1. Open Review for a feature with passing Specify, Clarify, Plan, Tasks, and Analyze trailers.
2. Confirm Review status is unchanged after restarting the app.
3. Confirm no step is marked complete from renderer session memory alone.
4. Select a markdown artifact and confirm the body loads on click.
5. Restart the app, open Review without live ACP session memory, select the app-owned Analyze report resolved through the Analyze commit index, and confirm it loads on click.
6. Remove an optional Plan artifact and confirm Plan remains complete with no false incomplete status.
7. Open a task row and confirm the modal uses existing parsed task details.
8. Simulate Analyze pass with no diff and confirm the empty pass proof plus report/no-diff explanation appears.
9. Simulate 39 minutes of active ACP streaming and confirm no silence notice appears.
10. Simulate 40 minutes of no ACP stream activity and confirm the notice says still working/no recent output and does not auto-fail.

## Completion criteria

- `review:evidence` returns disk/git-backed summary data and lazy body reads.
- Review creates zero Review Step Commits and invokes no Review agent.
- Analyze reports are app-owned disk evidence outside `specs/<feature>/`.
- Analyze report lookup works after restart from git proof plus app-owned index, without session memory.
- Plan optional artifacts are additive evidence and never required.
- Passive visual contracts and Review visual contracts exercise shipped component paths.
- Runtime dependency count and Redux slice count remain unchanged.
