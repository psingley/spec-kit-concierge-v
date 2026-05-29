1. Playwright `toHaveScreenshot()` - Free, installed, lowest setup; assertion-first, not metric-first.
   - What it gives us: screenshots, baselines, diffs, `maxDiffPixelRatio`, reports.
   - Cost: free.
   - Setup complexity: low, 30-60 lines.
   - Loop fitness: partial; parse artifacts/output, but ranked diff % is not primary.
   - Local-only: yes.
   - Verdict: good gate, weak loop source.

2. `pixelmatch` + `pngjs` - Free micro-libs matching prior art: capture separately, compute percentages.
   - What it gives us: mismatch counts, diff PNGs, JSON metrics, crop/mask control.
   - Cost: free.
   - Setup complexity: low-med, 80-140 lines.
   - Loop fitness: excellent; Codex reads JSON, picks worst, fixes, re-runs.
   - Local-only: yes.
   - Verdict: best fit for the <=9% loop.

3. `@argos-ci/playwright` - Polished managed review, but cloud/PR-check centered.
   - What it gives us: uploads, review UI, CI status, collaboration.
   - Cost: freemium/paid [verify].
   - Setup complexity: low, 20-50 lines.
   - Loop fitness: poor; review/check, not local numeric control.
   - Local-only: no; SaaS/login/network required.
   - Verdict: disqualified.

4. `reg-cli` / `reg-suit` - Free OSS comparison/report layer for HTML review.
   - What it gives us: batch compare, diff outputs, HTML reports, optional publishing.
   - Cost: free core.
   - Setup complexity: med, 80-180 lines/config.
   - Loop fitness: moderate; parseable, heavier than direct pixelmatch.
   - Local-only: yes without publishing plugins.
   - Verdict: best backup for local reports.

5. `playwright-visual-regression-tracker` - OSS tracker/server; more product than library.
   - What it gives us: baseline management, Playwright visual review UI.
   - Cost: free OSS [verify].
   - Setup complexity: high, 150-300 lines plus service.
   - Loop fitness: weak; tracker state/UI obscures one metric file.
   - Local-only: maybe self-hosted, operationally heavy [verify].
   - Verdict: overbuilt.

6. BackstopJS - Mature free runner with strong reports, duplicating Playwright orchestration.
   - What it gives us: scenarios, viewports, capture, diff images, HTML report.
   - Cost: free.
   - Setup complexity: med-high, 120-250 lines/config.
   - Loop fitness: moderate; ranked percentages require glue.
   - Local-only: yes.
   - Verdict: credible, too heavy.

7. Percy - Managed BrowserStack visual testing; wrong constraints.
   - What it gives us: cloud rendering, Playwright SDKs, review UI, PR integration.
   - Cost: freemium/paid [verify].
   - Setup complexity: low-med, 30-80 lines.
   - Loop fitness: poor; SaaS approval, not local percentage loops.
   - Local-only: no; SaaS/login/network required.
   - Verdict: disqualified.

8. Recommendation: primary is Playwright capture plus `pixelmatch` + `pngjs`, emitting `visual-diff-results.json` with per-screen `diffPercent`, dimensions, and artifact paths. Backup is `reg-cli`/`reg-suit` for local HTML reports, while JSON remains Codex's source of truth.
