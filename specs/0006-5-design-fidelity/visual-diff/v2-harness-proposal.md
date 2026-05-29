# Visual Diff V2 Harness Proposal

## 1. Why the current harness fails

The current harness answers one narrow question: "how many pixels differ across the full 1280 x 720 viewport after masking?" That is not the same as "does the shipped screen contain the designed UI?" The `signin-fresh` case proves the gap: a screen can miss the brand mark, headline, provider copy, subtitles, button treatment, and footer while still reporting only `2.13%` pixel diff.

The dilution is mechanical. The viewport is `1280 * 720 = 921,600` pixels. A `2.13%` diff means about `19,630` changed pixels. The current pass gate is `9%`, or about `82,944` changed pixels. So `signin-fresh` could be roughly four times worse by pixel count and still pass. If the meaningful sign-in card area is treated as about `640 x 520 = 332,800` pixels, the same changed pixels become about `5.9%` of the card; if only the text/control content lane is considered, the effective local diff rises again. The full dark background dominates the denominator and hides missing foreground structure.

What the current files do:

- `e2e/visual-diff/harness/paths.ts` fixes capture to a single `1280 x 720` viewport and writes global design, shipped, and diff PNGs.
- `capture-design.ts` serves `design/v3-fetch/project/Spec-kit Concierge.html` over local HTTP, applies each screen's `designSetup`, waits `250ms`, and takes a viewport screenshot.
- `capture-shipped.ts` launches Electron from `.vite/build/main.js`, applies the same screen's `shippedSetup`, waits `250ms`, and takes a viewport screenshot.
- `diffCore.ts` optionally crops, applies rectangular masks by painting both sides gray, then runs `pixelmatch` over the remaining pixels with `threshold: 0.1`.
- `diff.ts` records only `diffPercent`, image paths, masks, and timestamp. The JSON has no structural failures, no missing text list, no selector-level bbox scores, and no priority signal beyond percent.
- `screens.config.ts` has `bbox?: Rect`, but the current 24 entries do not use it. They all diff the full viewport, usually with only a scrollbar mask.

The design source contains the missing sign-in intent directly. `design/v3-fetch/project/signin.jsx` renders a `.signin-mark` with three animated rings and a dot, an `h1` of `Spec-kit Concierge`, a descriptive tagline, three provider rows named `GitHub CLI`, `GitHub Copilot CLI`, and `Atlassian MCP`, per-provider subtitles, icon-bearing `Sign in` buttons, and the footer "Trouble signing in? Use the gear menu to report a bug."

The shipped component does not match that structure. `src/renderer/components/SignInScreen.tsx` renders `.hero-card` with an eyebrow, `h1` of `Connect your tools`, copy about GitHub/Copilot/Run 11, three `.auth-row` buttons, provider names `GitHub CLI`, `Copilot CLI`, and `Atlassian (coming in Run 11)`, right-side status text, and no subtitles, orb mark, or footer. Pixelmatch sees only a modest amount of changed foreground because both screens are sparse dark cards on a dark stage.

The same pattern appears in the other inspected components:

- `topbar.jsx` has a richer design titlebar: traffic-light dots, brand, repo chip with `collette-travel / repo`, branch/session menus, model picker, auth chip, settings icon menu, and menu-specific rows. `Titlebar.tsx` ships a simpler `<strong>Concierge</strong>` titlebar with generic menu wrappers and reduced menu content. Pixelmatch can report the overall bar as close because its dark rectangles and chip silhouettes are similar.
- `customize-modal.jsx` has a modal veil, header with gear icon and close icon, sections `Theme`, `Layout`, and `Flow`, six accent swatches, density values `Compact`, `Regular`, `Comfy`, activity choices `Left`, `Right`, `Off`, and a switch row. `CustomizeModal.tsx` ships a simpler dialog with two density values, two activity choices, one swatch indicator, a close text button, and no veil/header structure. The current result still reports `customize-modal` as a passing `6.86%`.

Failure modes in the current pixel-diff approach:

1. **Full-viewport denominator dilution.** The dark unchanged background counts as success. Sparse UI changes are mathematically small even when semantically large.
2. **No required-element gate.** Missing orb, footer, subtitles, exact provider names, and button labels are not represented as first-class failures.
3. **No text-semantic diff.** "Spec-kit Concierge" vs "Connect your tools", "GitHub Copilot CLI" vs "Copilot CLI", and "Atlassian MCP" vs "Atlassian (coming in Run 11)" are just glyph pixels.
4. **No hierarchy diff.** A design row with icon, title, subtitle, and icon button can be replaced by a flatter row with status text and still produce a small percent.
5. **No style contract.** Colors, font sizes, radii, shadows, gaps, opacity, and disabled treatment are not sampled as named properties. A teal pill button and a text/status row are evaluated only by affected pixels.
6. **Masks can hide meaningful text drift.** Current masks are justified for dynamic timestamps and font subpixel differences, but masking body text areas means some content mismatches become intentionally invisible to pixelmatch.
7. **Selector fallbacks hide divergence.** Setup helpers accept both design and shipped selectors, for example `.signin-card` vs `.auth-list .auth-row` and `[data-testid="spec-markdown"]` vs `.md-panel`. That keeps capture robust, but it also normalizes over structural mismatch instead of reporting it.
8. **No bbox discipline.** The config supports `bbox`, and the London PoC proved cropped diffs are more meaningful when intentional chrome is excluded, but the current manifest leaves every screen uncropped.
9. **No screen-specific thresholds.** `9%` is too loose for sparse cards and possibly too strict for dense modals. One global threshold cannot encode surface risk.
10. **Animation/timing is not normalized structurally.** The design's pulsing mark is animated. A single screenshot may catch a partial ring state, and a missing mark may affect few pixels if the ring is faint at capture time.
11. **No machine-readable diagnosis.** The JSON cannot tell Codex "missing provider subtitles" or "wrong heading"; it can only sort by `diffPercent`.
12. **No reference contract.** The current source of truth is a live render of the design bundle at capture time. It does not commit a semantic snapshot of what each screen is supposed to contain.

## 2. Candidate approaches

| Candidate | What it measures | What it misses | Build complexity | Maintenance complexity | False positives | False negatives | Codex loop fit | New-screen fit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Cropped pixelmatch | Pixel deltas inside a named bbox, usually the designed card/panel/rail, while ignoring intentional chrome. | Missing low-contrast text can still be diluted; cannot explain missing DOM elements; copy changes remain glyph-level. | Low. `diffCore.ts` already supports `bbox`. Need reliable per-screen content selectors/bboxes. | Medium. Bboxes drift when layout changes. | Medium if font/rendering shifts differ by host. | Medium-high for semantic omissions. | Good as a residual score; weak as primary gate. | Good for quick onboarding if bbox auto-detected. |
| Structural diff (DOM/AOM tree compare) | Added/missing roles, headings, buttons, list rows, accessible names, rough hierarchy, disabled states. It would catch missing brand mark only if the mark has semantic exposure or explicit structural marker. | Pure decoration, pseudo-elements, exact spacing, color, visual polish, hidden elements not in AOM. | Medium. Playwright can capture DOM and accessibility snapshots; need normalizer. | Medium. Requires stable role/name conventions. | Medium if design and shipped use different but acceptable semantics. | Low for text/control omissions; medium for visual-only elements. | Strong. Produces actionable missing/extra nodes. | Strong if generated from reference snapshot. |
| Element-presence assertions | Required headings, button labels, provider names, subtitles, icons/marks, menu items, and sections from the design contract. | Layout, spacing, color, relative hierarchy unless assertions include locations/parents. | Low-medium. Can start from explicit manifests, later derive from JSX/DOM snapshot. | Medium. Needs review when design intentionally changes. | Medium if wording changes intentionally. | Low for the `signin-fresh` class of bug. | Excellent. Boolean failures tell Codex what to fix first. | Excellent with generated checklist plus human review. |
| Computed-style sampling | Key CSS properties for selected design/shipped elements: color, background, font, size, weight, radius, box shadow, opacity, display, dimensions, gaps. | Missing pseudo-elements unless sampled explicitly; screenshots can differ despite matching computed styles; text/content semantics. | Medium. Playwright `getComputedStyle` plus bbox metrics. | Medium-high. Selector mapping must stay current. | Medium if minor browser normalization differs, especially `oklch`/resolved colors. | Medium. Unsampled properties can drift. | Good as second-order diagnostics after structure passes. | Good for important elements, not every node. |
| Hybrid: structural + element-presence gate, cropped pixelmatch residual | Required semantic content and structure first; local visual residual second. | Some style drift unless style sampling is included; subjective polish still needs review. | Medium. Reuses current capture/diff, adds semantic capture and contract. | Medium. Contracts need approval on design changes. | Medium-low if contracts are generated and intentionally updated. | Low for missing/copy/structure issues; medium for subtle polish. | Excellent. JSON can rank by gate failures, then residual diff. | Excellent. New screens get a generated contract and a residual image score. |
| LLM-judged screenshots | Human-like assessment of missing elements, mismatched copy, visual tone, hierarchy, and "does this look like the design?" | Deterministic pass/fail, exact measurement, reproducible CI without model/API dependency. | Low to prototype, medium to operationalize. | Medium. Prompt/schema and model behavior drift. | Medium-high. Subjective judgments may vary. | Low for obvious missing elements; medium for fine measurements. | Good as advisory triage; poor as sole gate. | Good for first-pass review of new screens. |
| Reference DOM snapshot | A committed reference HTML/DOM/AOM/contract generated from the design render once. Ongoing checks compare shipped against committed truth without needing design hosting. | Does not by itself measure pixels or styles unless snapshot includes those. | Medium. Need snapshot generator and review/update workflow. | Low-medium. Intentional design changes update snapshots. | Low if snapshots are reviewed. | Low for committed structural expectations. | Excellent. Stable local artifact, deterministic JSON. | Strong. Each new screen adds one snapshot artifact. |
| Visual regression library recommendation | Mature capture/reporting around screenshots, selectors, baselines, CI reports. BackstopJS supports selector-scoped scenarios; Playwright has native screenshot baselines and HTML reports; Chromatic/Argos add hosted review workflows. | They remain visual-first unless we add semantic gates. SaaS tools add infra/cost and may not run Electron-local exactly. | Low-medium depending on adoption. | Medium. Baselines and approvals are a workflow. | Medium due to rendering drift. | Medium-high for semantic omissions if used alone. | Good for visual residuals, not enough for autonomous fixes. | Good for report ergonomics. |

Research notes:

- Playwright's own visual comparison docs warn that browser rendering can vary by OS, version, settings, hardware, power state, and headless mode, which supports keeping screenshots as a residual signal rather than the only gate: <https://playwright.dev/docs/test-snapshots>.
- Playwright screenshots support clipping, which fits the cropped-content residual model without changing the toolchain: <https://playwright.dev/docs/screenshots>.
- BackstopJS is a reasonable local visual-regression candidate because its scenario model supports URLs, viewports, selectors, delays, and reports, but it still does screenshot comparison rather than semantic parity: <https://github.com/garris/BackstopJS>.
- Chromatic and Argos are strong review products, but they introduce hosted workflow assumptions. Chromatic's docs describe E2E snapshot archives and cloud rendering; useful conceptually, but not a fit as the primary local-only gate: <https://www.chromatic.com/docs/snapshots>, <https://argos-ci.com/docs>.
- The London PoC prior art is useful but limited here. Cropping to `.legacy-bridge` fixed an intentional-chrome denominator problem and produced actionable style deltas. This app's failure is harsher: the content area itself is semantically wrong, so cropping helps but does not solve the primary issue.

## 3. Recommended stack

Primary recommendation: **V2 hybrid harness with committed reference contracts: structural + element-presence gates, computed-style sampling for key elements, and cropped pixelmatch as residual signal.**

The important shift is that pass/fail moves from "pixel percent under threshold" to "all required semantic/design contract items are present and compatible." Pixel residual remains useful, but only after the screen has proven it contains the expected content.

This catches `signin-fresh` directly:

- Missing `.signin-mark` / brand mark: required element failure.
- Wrong heading: required heading text failure.
- Wrong provider names: required text failures for `GitHub Copilot CLI` and `Atlassian MCP`.
- Missing subtitles: required text failures.
- Wrong button labels/chrome: required button label failures plus style sample failures for `.btn.primary` shape/color/icon gap.
- Missing footer: required text failure.

The stack remains reproducible because every screen has a committed reference contract generated from the design render. CI does not need Claude Design hosting. It needs only the repo, Playwright, the Electron app build, and the committed references.

It scales to ~50 screens because each screen emits the same small bundle:

- `reference.dom.json`
- `reference.aom.json`
- `reference.contract.json`
- `actual.dom.json`
- `actual.aom.json`
- `actual.styles.json`
- cropped screenshots and diff PNGs
- one per-screen JSON result

The autonomous Codex loop gets a deterministic ranking:

1. screens with blocking required-element failures;
2. screens with structural mismatch score above threshold;
3. screens with style sample failures;
4. screens with highest cropped residual pixel diff.

The human report gets the same facts in readable language: "signin-fresh failed because 9 required items are missing/wrong; residual cropped diff is 5.9%; full viewport diff would have been 2.13% and is not the gate."

Backup recommendation: **BackstopJS or Playwright-native selector screenshot baselines for cropped residuals, while keeping custom structural/element gates.**

If maintaining custom PNG diff code becomes low-value, delegate selector-scoped image comparison and HTML report generation to BackstopJS or Playwright's `toHaveScreenshot` snapshots. Do not delegate semantic parity to those tools. The structural/element contract remains the primary gate either way.

Why not LLM as primary: it is good at calling out the exact `signin-fresh` misses, but it is not deterministic enough for CI or a per-run autonomous loop. Use it as an optional advisory report for new screens or after mechanical gates disagree with human judgment.

## 4. Implementation sketch

File structure under `e2e/visual-diff/v2/`:

```text
e2e/visual-diff/v2/
  README.md
  screens.v2.config.ts
  capture/
    captureDesignReference.ts
    captureShippedActual.ts
    snapshotDom.ts
    snapshotAom.ts
    snapshotStyles.ts
    screenshot.ts
  contract/
    generateContract.ts
    normalizeDom.ts
    normalizeAom.ts
    extractRequiredElements.ts
    selectors.ts
  verify/
    verifyScreen.ts
    verifyStructure.ts
    verifyElements.ts
    verifyStyles.ts
    verifyPixels.ts
    score.ts
  report/
    writeJsonReport.ts
    writeMarkdownReport.ts
  artifacts/
    references/
      signin-fresh/
        reference.dom.json
        reference.aom.json
        reference.contract.json
        reference.styles.json
        design.png
    actual/
      signin-fresh/
        actual.dom.json
        actual.aom.json
        actual.styles.json
        shipped.png
        cropped-diff.png
    results/
      visual-diff-v2-results.json
      visual-diff-v2-report.md
```

Manifest entry shape:

```ts
{
  name: 'signin-fresh',
  designPath: 'design/v3-fetch/project/signin.jsx',
  setup: {
    design: 'none',
    shipped: 'none'
  },
  regions: {
    primary: {
      designSelector: '.signin-card',
      shippedSelector: 'main.signin section',
      role: 'card'
    }
  },
  required: {
    texts: [
      { value: 'Spec-kit Concierge', role: 'heading', level: 1 },
      { value: 'GitHub CLI' },
      { value: 'GitHub Copilot CLI' },
      { value: 'Atlassian MCP' },
      { value: 'Required to discover org repositories' },
      { value: 'Requires GitHub CLI first' },
      { value: 'Required to send specs to JIRA' },
      { value: 'Trouble signing in? Use the gear menu to report a bug.' }
    ],
    controls: [
      { role: 'button', name: 'Sign in', count: 3 }
    ],
    visuals: [
      { name: 'brand mark', designSelector: '.signin-mark', shippedSelector: '[data-vd-role="signin-mark"]' }
    ]
  },
  styleSamples: [
    {
      name: 'primary sign-in button',
      designSelector: '.signin-row .btn.primary',
      shippedSelector: '[data-vd-role="signin-provider-action"]',
      properties: ['backgroundColor', 'color', 'borderRadius', 'height', 'paddingInline', 'gap']
    }
  ],
  pixel: {
    clip: 'primary',
    maxDiffPercent: 3.0,
    warningDiffPercent: 1.5,
    masks: ['scrollbar']
  }
}
```

The current `screens.config.ts` is still useful for setup flows. V2 should reuse those setup functions or wrap them, but add explicit regions and contracts.

Per-screen capture produces:

- design screenshot, full and cropped to `regions.primary.designSelector`;
- shipped screenshot, full and cropped to `regions.primary.shippedSelector`;
- normalized design DOM snapshot scoped to primary region;
- normalized shipped DOM snapshot scoped to primary region;
- design and shipped AOM snapshots;
- computed style samples for configured selectors;
- bounding boxes for primary/key elements.

Per-screen verify computes:

- `elementFailures`: missing text, wrong text, missing role, wrong control count, missing visual marker;
- `structureFailures`: added/missing normalized nodes, role/name hierarchy differences, disabled-state differences;
- `styleFailures`: property deltas outside tolerance;
- `pixelResidual`: cropped pixelmatch percent plus changed pixel count;
- `status`: `FAIL` if any required element/structure/style gate fails, `WARN` for residual-only threshold breach, otherwise `PASS`;
- `priorityScore`: weighted score for the Codex loop.

Report JSON shape:

```json
{
  "runId": "2026-05-28T18-30-00Z",
  "viewport": { "width": 1280, "height": 720 },
  "summary": {
    "total": 24,
    "pass": 18,
    "fail": 6,
    "worstScreen": "signin-fresh"
  },
  "screens": [
    {
      "name": "signin-fresh",
      "status": "FAIL",
      "priorityScore": 94,
      "failures": {
        "requiredElements": [
          { "kind": "visual", "name": "brand mark", "expected": ".signin-mark", "actual": "missing" },
          { "kind": "heading", "expected": "Spec-kit Concierge", "actual": "Connect your tools" },
          { "kind": "text", "expected": "GitHub Copilot CLI", "actual": "missing" },
          { "kind": "text", "expected": "Atlassian MCP", "actual": "missing" },
          { "kind": "button", "expected": "Sign in x3", "actual": "0" }
        ],
        "structure": [],
        "styles": [
          { "sample": "primary sign-in button", "property": "borderRadius", "expected": "6px", "actual": "missing" }
        ]
      },
      "pixels": {
        "fullViewportDiffPercent": 2.13,
        "croppedDiffPercent": 5.9,
        "changedPixels": 19630,
        "denominatorPixels": 332800
      },
      "artifacts": {
        "designPng": "e2e/visual-diff/v2/artifacts/references/signin-fresh/design.png",
        "shippedPng": "e2e/visual-diff/v2/artifacts/actual/signin-fresh/shipped.png",
        "diffPng": "e2e/visual-diff/v2/artifacts/actual/signin-fresh/cropped-diff.png"
      }
    }
  ]
}
```

Human markdown report shape:

```text
# Visual Diff V2 Report

## Summary
FAIL: 6 of 24 screens have contract mismatches.
Worst screen: signin-fresh.

## signin-fresh
Status: FAIL
Meaning: shipped screen is structurally not the design, even though full-viewport diff is 2.13%.

Blocking failures:
- Missing brand mark.
- Heading expected "Spec-kit Concierge"; found "Connect your tools".
- Missing provider text "GitHub Copilot CLI".
- Missing provider text "Atlassian MCP".
- Missing 3 "Sign in" buttons.
- Missing sign-in footer.

Residual pixels:
- Cropped primary region: 5.9%.
- Full viewport: 2.13% for comparison only.
```

## 5. Migration plan

Ship V2 alongside V1 first. Do not replace the existing `e2e/visual-diff/harness/` in the first implementation pass.

Backwards compatibility:

- Keep `vd:capture`, `vd:diff`, `vd:report`, and `vd:loop` mapped to V1 initially.
- Add new scripts: `vd2:reference`, `vd2:capture`, `vd2:verify`, `vd2:report`, and `vd2:loop`.
- After V2 proves stable, change `vd:loop` to call V2 and leave V1 scripts available as `vd1:*` or `vd:legacy:*` for one run.
- Keep the old `visual-diff-results.json` schema intact until all downstream consumers move to `visual-diff-v2-results.json`.

Reuse of the existing 24-screen manifest:

- Start by importing or wrapping the existing `screens` array for names, design paths, and setup functions.
- Add V2 metadata in `screens.v2.config.ts`: primary region selectors, required elements, style samples, and pixel thresholds.
- Do not require every screen to have full style sampling on day one. Required elements and primary-region cropped residual are the minimum.

Existing screenshots and results:

- Leave `e2e/visual-diff/screenshots/` untouched as V1 artifacts.
- Leave `specs/0006-5-design-fidelity/visual-diff/visual-diff-results.json` and `visual-diff-results-baseline.json` untouched as historical proof of why V1 was insufficient.
- Write V2 artifacts under `e2e/visual-diff/v2/artifacts/` and reports under `specs/0006-5-design-fidelity/visual-diff/visual-diff-v2-results.json` plus `visual-diff-v2-report.md`.
- Keep `final-report.md` as a V1 report, then add a short note in a future report that V1 passed despite known structural misses.

Migration sequence:

1. Add V2 read-only capture and snapshot generation for `signin-fresh`.
2. Generate and review `signin-fresh` reference contract from the design render.
3. Verify shipped `signin-fresh` against it and confirm it fails for the known six classes of mismatch.
4. Extend to the other two inspected surfaces: `workspace-titlebar-closed-menus`, `workspace-titlebar-gear-menu-open`, and `customize-modal`.
5. Convert the remaining 20 screens in batches of 5 to 8, prioritizing screens with sparse dark UI where dilution is highest.
6. When all 24 V1 screens have V2 contracts, make `vd2:loop` the default gate for design-fidelity work.
7. For Runs 7-13, require a V2 manifest entry and committed reference contract for every new screen before calling it visually covered.

## 6. Honest risks

- AOM snapshots can drift between the design's vanilla browser React render and shipped React inside Electron. Use AOM for roles/names/control states, not as the only structural truth.
- Element-presence assertions can become brittle when design and shipped intentionally use different naming. The `.md-panel` vs `data-testid="spec-markdown"` pattern already shows selector vocabulary can diverge. V2 needs explicit mapping fields instead of pretending selectors are universal.
- Decorative elements like the pulsing sign-in mark may not appear in AOM. Required visual markers need explicit `data-vd-role` or selector contracts in shipped code once implementation begins.
- Computed-style sampling can miss pseudo-elements, canvas/SVG internals, inherited font rendering, and visual issues caused by stacking/context or overflow. It is a targeted diagnostic, not a complete visual proof.
- Computed color values can normalize differently (`oklch`, `color-mix`, RGB) across browser versions. Style comparisons should normalize colors and allow small tolerances.
- Cropped pixelmatch still has font subpixel and antialiasing sensitivity. It should remain a residual signal with thresholds per screen, not the primary pass/fail gate.
- Reference snapshots can fossilize design mistakes. Updating a reference must be an intentional review step, not an automatic overwrite inside the fix loop.
- Deriving required elements from JSX automatically will need guardrails. Some text is dynamic state text, some is hidden, and some icons are decorative. Generated contracts should be reviewable before commit.
- LLM-judged screenshots are useful for review, but expensive, non-deterministic, and hard to reproduce in CI. They should be advisory only.
- The current Electron launch/build path has been flaky in prior runs. V2 should separate "could not capture" from "failed parity" so infrastructure blockers do not look like UI failures.
- Adding semantic gates means V2 will initially fail many existing screens. That is expected. The report must separate "known implementation drift" from "harness broken."

## Recommendation in one sentence

Build V2 as a contract-first Playwright harness: committed reference DOM/AOM/required-element snapshots gate correctness, computed-style samples diagnose key chrome drift, and cropped pixelmatch becomes the final residual signal instead of the definition of visual fidelity.
