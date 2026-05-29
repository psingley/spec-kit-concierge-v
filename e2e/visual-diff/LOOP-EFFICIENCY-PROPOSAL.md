# Visual-Diff Loop Efficiency Proposal

## 1. Actual time accounting for iteration A

Source log: `/Users/psingley/.claude/plugins/data/codex-openai-codex/state/spec-kit-concierge-v-247499cef7f71e89/jobs/task-mppukzax-snl36a.log`.

Iteration A ran from first active command at 18:50:11 to final proof at 20:01:26, with commit at 20:03:07.

Distinct `vd:loop` invocations: 14.

| Command | Count | Durations | Total |
| --- | ---: | --- | ---: |
| `npm run vd:loop -- workspace-titlebar-closed-menus` | 12 | 103s, 102s, 102s, 102s, 101s, 102s, 101s, 100s, 1047s failed, 105s, 106s, 104s | 2276s / 37.9m |
| `npm run vd:loop` full suite | 2 | 104s, 113s | 217s / 3.6m |

Normal single-target runs were consistently about 100-106s. One target run failed after 1047s; that was not productive loop time, but it is real wall time and needs a timeout/health path. Total visual-loop wall time was 2493s / 41.6m.

Other long-running commands:

| Command | Count | Durations | Total |
| --- | ---: | --- | ---: |
| 4-command verify: `rm -rf .vite/build && npm run typecheck && npm run lint && npm test && npm run e2e` | 5 | 25s fail, 55s fail, 51s fail, 34s fail, 25s pass | 190s / 3.2m |
| Standalone `npm run e2e` | 2 | 931s fail, 16s pass | 947s / 15.8m |
| Isolated Playwright re-checks | 2 | 31s fail, 31s fail | 62s / 1.0m |
| Targeted unit test | 6 | about 1s each | about 6s |

The honest breakdown: repeated visual loops cost 41.6m, e2e debugging cost 16.8m, full verify chains cost 3.2m, and unit checks were negligible. The controllable waste was redoing cold capture setup after small UI changes.

## 2. Per-iteration command opportunities

`vd:loop -- <screen>` was necessary after real UI changes, but not every invocation needed cold design server startup, Chromium launch, Electron launch, design recapture, shipped recapture, diff, and report. During single-screen work, design artifacts could usually be reused until a design-source signature changed.

The current `vd:capture` always builds Electron, then runs design and shipped capture. That preserves semantics but overpays in the inner loop. The design server, Chromium browser, and Electron app can be persistent within a dev session, with explicit reset through the same setup entrypoints. Single-screen CLI selection already exists; the cold process model keeps it slow.

The full `npm run vd:loop` runs were necessary as regression checks, but only at the end of an iteration or before commit. They did not need to happen after each target tweak.

The 4-command verify remains necessary because axe found a real contrast failure. It should stay as an end gate. After the first axe failure, narrower `npm run e2e` or isolated Playwright checks were appropriate until fixed, then one fresh full chain.

## 3. Concrete proposal: `vd:dev` mode

Add an opt-in npm script: `vd:dev`, backed by new harness files only:

- `e2e/visual-diff/harness/dev/session.ts`
- `e2e/visual-diff/harness/dev/cache.ts`
- `e2e/visual-diff/harness/dev/runDevLoop.ts`
- `e2e/visual-diff/harness/dev/README.md` if needed

Avoid modifying existing gold-standard scripts beyond adding the package script.

First invocation per session:

1. Build Electron once if `.vite/build/main.js` is missing or older than renderer/main/preload sources.
2. Start one design HTTP server.
3. Launch one Chromium browser for design captures.
4. Launch one Electron app for shipped captures.
5. Compute a design cache key from `design/v3-fetch/project/**`, the selected screen contract, `screens.config.ts`, and capture helpers.
6. If cache is cold or stale, capture design artifacts for all screens, or for the named screen plus any screens sharing the same `designPath`.
7. Capture shipped artifacts for the named screen, run diff/report, and write `e2e/visual-diff/artifacts/dev-session.json`.

Subsequent invocation in the same session:

1. Reuse the live design server, Chromium browser, and Electron instance if healthy.
2. Recompute the design cache key. If unchanged, skip design capture.
3. Re-capture shipped for the named screen, re-diff that screen, and re-report.
4. If Electron health fails or the screen setup cannot reliably reset state, restart Electron only.

Expected warm target loop: 15-30s, not sub-10s. Remaining costs are app navigation, screenshots, snapshots, pixel diff, and report I/O.

`vd:dev` must not skip final regression safety. It only defers it. Before an iteration is accepted, run `npm run vd:loop`, then the standard verify chain.

## 4. Recommended iteration B workflow

1. Baseline target: `npm run vd:dev -- <iteration-b-screen>`: 100-140s cold.
2. Make UI/test fixture changes.
3. Inner loop: `npm run vd:dev -- <iteration-b-screen>` after each change: 15-30s warm. Assume six passes: 90-180s.
4. If axe or e2e fails, use the narrowest reproducer first: isolated Playwright or `npm run e2e`, then one full verify after the fix.
5. Regression gate: `npm run vd:loop`: 100-140s.
6. Standard gate: `rm -rf .vite/build && npm run typecheck && npm run lint && npm test && npm run e2e`: 25-60s when green.

Projected iteration B loop: about 6-9 minutes for a typical six-adjustment screen, plus real debugging. Iteration A spent 41.6 minutes in visual loops alone, so this saves roughly 30+ minutes without weakening final gates.

## 5. What not to do

- Do not skip the full-harness `npm run vd:loop` regression check entirely.
- Do not trust prior shipped captures after source changes.
- Do not loosen visual contracts to make screens pass faster.
- Do not skip the 4-command verify. Axe caught a real WCAG contrast issue in iteration A.
- Do not make `vd:dev` overwrite or reinterpret `vd:loop` results as final proof.

## 6. Maintenance cost

`vd:dev` should be opt-in and explicitly documented as an inner-loop accelerator. Future iterations only need to know: use `vd:dev -- <screen>` while fixing one screen, then finish with `vd:loop` plus standard verify.

Cache invalidation must be concrete. Store SHA-256 hashes for `design/v3-fetch/project/**`, `e2e/visual-diff/contracts/<screen>.contract.json`, `e2e/visual-diff/harness/screens.config.ts`, and capture helpers. If any hash changes, recapture design. Add `npm run vd:dev -- --reset-cache` or delete `e2e/visual-diff/artifacts/dev-cache/` as the manual escape hatch.
