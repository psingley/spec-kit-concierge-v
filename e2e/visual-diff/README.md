# Visual Diff Harness

This is the single authoritative Run visual-fidelity harness. It replaced the old full-viewport pixelmatch-only check because that check could pass while required UI was missing.

## Pipeline

`npm run vd:loop` runs:

1. `vd:capture` builds Electron, captures the design reference, captures the shipped app, and writes scoped screenshots plus DOM/AOM/style snapshots under `e2e/visual-diff/artifacts/`.
2. `vd:diff` verifies every screen in four layers: required elements, structural markers, computed style samples, and cropped pixel residuals.
3. `vd:report` writes machine JSON and human markdown reports.

Reports are written to `e2e/visual-diff/artifacts/results/` and mirrored to `specs/0006-5-design-fidelity/visual-diff/`.

## Add A Screen

1. Add the screen to `e2e/visual-diff/harness/screens.config.ts`.
2. Run `npm run vd:generate-contract -- <screen>`.
3. Review `e2e/visual-diff/contracts/<screen>.contract.json`; remove extraction noise and keep intentional headings, copy, controls, visual markers, style samples, and cropped pixel threshold.
4. Add `data-vd-role` attributes to shipped React components only for required visual markers.
5. Run `npm run vd:loop`.

Contracts are committed source of truth. The verifier reads contracts, not live design JSX.
