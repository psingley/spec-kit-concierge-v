# Quickstart: Run 8 AI-Passive Steps Vertical

This feature is implemented after `/speckit.tasks`; `/speckit.plan` stops at design artifacts.

## TDD Sequence

Use vertical tracer bullets only:

1. Write one failing public-behavior test for Plan passive start/progress/pass, then implement the smallest Plan path.
2. Add one failing test for Plan optional artifact/context-file summary, then implement.
3. Add one failing test for Tasks pass and task id/title rows, then implement.
4. Add one failing test per additional task detail field group, then implement.
5. Add one failing test for Analyze no-diff pass without `analyze.md`, then implement.
6. Add one failing test for Analyze allowed remediation targets, then implement.
7. Add one failing test for Analyze disallowed target rejection, then implement.
8. Add one failing test for lazy `artifacts:read` on evidence click, then implement.
9. Add one failing test for sanitized GFM markdown rendering, then implement.
10. Add one failing fake-timer test for the 20-minute hang notification, then implement.
11. Add one failing duplicate-terminal test, then implement.
12. Add one visual screen at a time until the exact 10-screen Run 8 set passes.

Do not write all tests first. Do not mock internal reducers, selectors, or passive IPC helpers. Mock only system boundaries such as Electron IPC, filesystem, git shell-outs, ACP process I/O, time, and canvas/browser APIs where needed.

## Expected Commands

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run e2e
npm run test:coverage
```

`npm install` is required only when adding the locked markdown dependencies.

## Spot Checks

```bash
rg "artifact:read" src specs docs
rg "artifacts:read" src specs docs
rg "analyze\\.md" src specs docs
rg "rehype-raw|highlight" package.json src specs
```

Expected outcomes:
- No new singular `artifact:read` implementation.
- `artifacts:read` remains the user-facing IPC capability.
- `analyze.md` is not required by Analyze contracts or manifests.
- No raw-HTML or syntax-highlighting markdown dependency is introduced.

## Manual Product Flow

1. Complete Specify and Clarify in a session.
2. Start Plan and watch passive progress rows update.
3. Confirm Plan pass shows `plan.md`, `research.md`, optional artifacts when present, context-file exception when present, and commit identity.
4. Start Tasks and confirm task rows parse from `tasks.md`.
5. Open one task detail row and confirm parsed fields.
6. Start Analyze and confirm no-diff pass or allowed remediation summary without `analyze.md`.
7. Open an evidence artifact and confirm content is fetched only on click.
8. Open hostile markdown fixture and confirm raw HTML is stripped.
9. Simulate 20 minutes of ACP silence and confirm the soft notification appears without failing the step.
