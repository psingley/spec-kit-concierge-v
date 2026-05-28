# Run 6.5 Visual Diff Iteration Journal

## 2026-05-28 Initial Harness Attempt

Status: BLOCK

The first capture attempt did not reach screenshot generation. Playwright Chromium failed before page creation with macOS Mach port permission denial. Full e2e and archived `main` comparison also fail at Electron process launch before UI assertions.

No visual iteration was attempted because there is no reliable design/shipped screenshot pair to compare.

Current local proof:

| Command | Result |
| --- | --- |
| `npm run typecheck` | GREEN |
| `npm run lint` | GREEN |
| `npm test` | GREEN, 778 tests |
| `npm run e2e` | BLOCKED at Electron launch |
| `npm run vd:capture -- signin-fresh` | BLOCKED at Chromium launch |

## 2026-05-28 Harness Hardening

Status: APPLIED

- Fixed `e2e/design-fidelity.spec.ts` so Activity screenshots explicitly arrange and assert the rail is visible before screenshot capture. This addresses the inherited-state timeout called out in Task 0.
- Added `e2e/visual-diff/harness/diffCore.ts` and `diffCore.test.ts` so crop/mask/diff math is covered by Vitest instead of living only in the CLI script.
- Fixed `vd:capture` argument forwarding so `npm run vd:capture -- <screen>` sends the same screen filter to design and shipped capture.

No CSS/JSX parity attempts were made because the browser process still fails before screenshots exist.
