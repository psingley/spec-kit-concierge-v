# UI/UX Visual-Fidelity Harness — Methodology Runbook

A reusable, design-source-agnostic process for driving any design handoff into shipped
code at near-1:1 fidelity, and for proving that fidelity with evidence instead of vibes.

This runbook generalizes the harness built at `e2e/visual-diff/` in
`spec-kit-concierge-v`, which took a claude.ai/design HTML/CSS/JS handoff into a
React/Electron app. The same methodology applies to any "design reference → shipped UI"
problem. The design source can be an HTML prototype, a Figma frame, a live legacy page,
or a static comp — only the *capture front-end* changes. The verification core is reusable.

---

## 0. TL;DR

1. Pixel-diff alone **lies** for dark/sparse UIs: a screen can miss the brand mark,
   headline, every provider row, and the button treatment and still report ~2% pixel
   diff because the unchanged dark background dominates the denominator.
2. The fix is **contract-first 4-layer verification**: (1) required-element presence,
   (2) structural DOM/AOM diff, (3) computed-style sampling, (4) cropped pixel residual.
   Pixels become the *last* signal, not the definition of fidelity.
3. The **contract** is a committed JSON file per screen. It is the source of truth. The
   verifier reads the contract, not a live render of the design.
4. Iterate per-screen: **fix the worst screen → re-diff → commit**. A warm dev loop
   (`vd:dev`) keeps the inner loop ~15-30s; a full gate (`vd:loop`) is the regression
   check before commit.
5. **Honesty disciplines**: verify through the *real* shipped component (not synthetic
   stand-in markup); keep thresholds single-digit and justified; never empty out a
   contract array to make a screen pass; cite evidence (residual %, diff PNG, failures).

---

## 1. The Core Insight — Why Pixel-Diff Alone Fails

The original harness for this app answered exactly one question: *"how many pixels
differ across the full 1280×720 viewport after masking?"* That is **not** the same
question as *"does the shipped screen actually contain the designed UI?"*

### The dilution math (the bug that started everything)

The `signin-fresh` screen proved the gap. The shipped sign-in screen was missing the
brand mark, the headline ("Spec-kit Concierge" vs "Connect your tools"), all three
provider rows with correct names ("GitHub Copilot CLI", "Atlassian MCP"), the provider
subtitles, the primary-button treatment, and the footer — yet it reported only **2.13%**
pixel diff and **passed** a 9% gate.

Why? The viewport is `1280 × 720 = 921,600` pixels. A 2.13% diff is ~19,630 changed
pixels. The pass gate of 9% is ~82,944 pixels. So the screen could have been ~4× more
wrong by pixel count and still passed. The full dark background is the denominator, and
it never changes, so it permanently drowns out missing foreground structure. If you crop
to just the sign-in card (~640×520 ≈ 332,800 px) the same delta becomes ~5.9%; if you
crop to the text/control lane it climbs again. **The metric was measuring the wrong area.**

### The 12 failure modes of pixel-only diffing

(Condensed from `specs/0006-5-design-fidelity/visual-diff/v2-harness-proposal.md`.)

1. **Full-viewport denominator dilution** — unchanged dark background counts as success.
2. **No required-element gate** — missing orb/footer/subtitles/labels aren't first-class failures.
3. **No text-semantic diff** — "Atlassian MCP" vs "Atlassian (coming in Run 11)" is just glyph pixels.
4. **No hierarchy diff** — a rich row (icon+title+subtitle+button) can collapse to a flat row cheaply.
5. **No style contract** — color/size/radius/shadow/gap/opacity/disabled aren't sampled.
6. **Masks can hide real text drift** — masking body text for font subpixel reasons also hides content mismatch.
7. **Selector fallbacks hide divergence** — accepting both design and shipped selectors normalizes over structural mismatch.
8. **No bbox discipline** — cropping to the meaningful region is the single biggest lever and it was unused.
9. **No per-screen thresholds** — one global % can't encode surface risk (sparse card vs dense modal).
10. **Animation/timing not normalized** — a single screenshot can catch a half-rendered pulsing mark.
11. **No machine-readable diagnosis** — the JSON can only sort by `diffPercent`; it can't say "missing provider subtitles."
12. **No reference contract** — truth was a live render at capture time, not a committed semantic snapshot.

### Why contract-first 4-layer verification works

Pass/fail moves from *"pixel percent under threshold"* to *"all required semantic/design
contract items are present and compatible, AND the residual pixels are small."* Pixels
stay useful, but only **after** the screen has proven it contains the expected content.
The `signin-fresh` bug is now caught directly: missing mark → element failure; wrong
heading → heading failure; missing provider names → text failures; wrong button →
control + style-sample failures; missing footer → text failure.

---

## 2. The Four Layers (what each one asserts)

Each screen is verified by four independent layers. **Any** element/structure/style
failure makes the screen `FAIL`. A residual-only breach makes it `WARN`. All clear is
`PASS`. (See `e2e/visual-diff/harness/verify/verifyScreen.ts`.)

| Layer | Source file | What it asserts | What it catches | Blind spots |
|---|---|---|---|---|
| **1. Required elements** | `verify/verifyElements.ts` | Required texts are substrings of captured text; required headings match by level+text; required controls match by role+name+**count**; required visual markers are present by `data-vd-role`. | Missing copy, wrong headline, wrong/absent buttons, missing decorative marks. | Layout, spacing, color (unless also a style sample). |
| **2. Structure** | `verify/verifyStructure.ts` | Every `data-vd-role` marker present in the *design* DOM is present in the *shipped* DOM (first 10 misses reported). | Missing structural landmarks that have semantic exposure. | Pure decoration with no marker; exact geometry. |
| **3. Computed styles** | `verify/verifyStyles.ts` | For each named style sample, the listed CSS properties match between design selector and shipped selector, after color/shadow normalization (`oklch`↔`rgb` equivalence table). | Color/radius/shadow/padding/gap/size drift on key chrome (buttons, chips, panels). | Properties you didn't list; pseudo-elements; canvas/SVG internals. |
| **4. Cropped pixel residual** | `verify/verifyPixels.ts` | `pixelmatch` over the cropped primary region only; `diffPercent` must be ≤ `pixel.maxDiffPercent`; between warn and max is `WARN`. | Final visual polish drift inside the meaningful region. | Anything diluted by area; font subpixel noise (hence masks + single-digit thresholds). |

### The priority score (how the loop ranks work)

`verify/score.ts` weights failures so the autonomous loop fixes the most semantically
broken screen first:

```
score = min(100, round(elementFailures*30 + structureFailures*8 + styleFailures*5 + pixelResidual))
```

Element failures dominate (30 each) because a missing heading or button is a *real* gap;
pixel residual contributes its raw percent as a tiebreaker. The report sorts screens by
this score descending, so `worstScreen` is always the top of the table.

---

## 3. The Contract Schema

Contracts live at `e2e/visual-diff/contracts/<screen>.contract.json`. They are JSON with
`//` and `/* */` comments stripped at load (`contract/loadContract.ts`). The committed
contract — **not** a live design render — is the source of truth at verify time.

```jsonc
{
  "name": "signin-fresh",
  "designPath": "design/v3-fetch/project/signin.jsx",   // provenance only
  "primaryRegion": {                                      // crop target for layers 2-4
    "designSelector": ".signin-card",
    "shippedSelector": ".signin-card"
  },
  "required": {
    "texts":    [ { "value": "GitHub Copilot CLI" }, ... ],         // substring asserts
    "headings": [ { "level": 1, "text": "Spec-kit Concierge" } ],   // level + exact text
    "controls": [ { "role": "button", "name": "Sign in", "count": 3 } ], // role+name+count
    "visualMarkers": [                                              // decorative marks
      { "name": "signin-mark",
        "selector": "[data-vd-role=\"signin-mark\"]",  // shipped: data-vd-role hook
        "designSelector": ".signin-mark" }             // design: natural class
    ]
  },
  "styleSamples": [
    { "name": "primary sign-in action",
      "designSelector": ".signin-row .btn.primary",         // may differ from shipped
      "shippedSelector": "[data-vd-role=\"signin-provider-action\"]",
      "properties": [ "background-color", "border-radius", "gap" ] }
  ],
  "pixel": { "maxDiffPercent": 7, "warnDiffPercent": 7 }   // single-digit, justified
}
```

### Field-by-field authoring guidance

- **`primaryRegion`** — crop both sides to the *meaningful* element (the card / panel /
  rail / modal), not the viewport. This is the lever that kills denominator dilution.
  `contract/generateContract.ts#guessPrimaryRegion` seeds sensible defaults by screen-name
  prefix (`.signin-card`, `.modal`, `.titlebar`, `.stepper`, …); review and tighten it.
- **`required.texts`** — assert the *intentional* copy a human would notice if it vanished:
  headlines, provider names, subtitles, state copy ("Navigate freely…"), footers. These
  are substring matches against the concatenated captured text, so keep them specific
  enough to be meaningful but not so long they break on trivial whitespace.
- **`required.headings`** — level **and** exact text. This is what catches "wrong headline."
- **`required.controls`** — role + name + **count**. The count matters: "3 Sign in buttons"
  vs "0" is the whole `signin-fresh` bug.
- **`required.visualMarkers`** — for decorative elements (orbs, spinners, pulse dots) that
  do **not** appear in the accessibility tree. The design side uses the natural class
  (`.signin-mark`); the shipped side must expose a `data-vd-role` attribute so the marker
  is detectable. This is the one place the methodology asks you to add a hook to shipped code.
- **`styleSamples`** — pick the handful of properties that define the *chrome identity* of
  key elements: button `background-color`/`border-radius`/`gap`, panel `box-shadow`/`padding`,
  chip `border-radius`. Do **not** sample every property of every node — that is brittle
  and slow. Design and shipped selectors are allowed to differ (the design prototype and
  the React component need not share class names); the contract carries the mapping.
- **`pixel.maxDiffPercent` / `warnDiffPercent`** — single-digit and justified. Treat
  anything above ~12% as a smell (see Anti-Pattern: inflated thresholds). The residual is
  a *backstop*, not the gate; the semantic layers are the gate.

### Generating a first draft

`npm run vd:generate-contract -- <screen>` parses the design JSX with Babel
(`contract/generateContract.ts#extractContractFromSource`) and emits a starter contract:
it harvests JSX text nodes, `<h1-6>` headings, `<button>` labels with counts, and class
names matching the marker patterns (`/signin-mark/`, `/brand-orb/`, `/spinner/`,
`/activity-glyph/`, `/ap-spinner/`, `/pulse-dot/`). The generated draft has
`styleSamples: []` and a default `pixel` of `{ max: 4, warn: 2.5 }`. **It is a draft, not
a contract** — see the next section.

---

## 4. The Onboarding Workflow (adding a NEW surface)

This is the canonical loop for bringing one new screen under fidelity coverage.

1. **Manifest entry.** Add the screen to `e2e/visual-diff/harness/screens.config.ts`:
   a `name`, a `designPath`, a `designSetup(page)` and `shippedSetup(page)` that drive
   each side into the target state, plus any `masks` for genuinely dynamic regions
   (timestamps, scrollbars, font-subpixel body text). Setup functions are where state is
   reached: navigate to the screen, fill inputs, open menus, dispatch store actions.
2. **Generate the draft contract.** `npm run vd:generate-contract -- <screen>`.
3. **Review and harden the contract** (the human step — do not skip):
   - Remove extraction noise (stray fragments, single glyphs, aggregate concatenations).
   - Keep the *intentional* headings, copy, controls, and visual markers.
   - Add `styleSamples` for the key chrome elements (the generator leaves this empty).
   - Set a single-digit, justified `pixel` threshold.
   - Tighten `primaryRegion` to the meaningful element.
4. **Add `data-vd-role` markers to the shipped React components** — but *only* for the
   required visual markers in the contract (orbs, spinners, identity dots). Do not litter
   the codebase; markers exist to make decorative elements detectable by layer 1/2.
5. **Run the gate.** `npm run vd:loop` (or `vd:loop -- <screen>` for one screen).
   Iterate on the shipped component until the screen passes honestly.
6. **Commit** the contract + component changes together.

The README at `e2e/visual-diff/README.md` is the short form of steps 1-5. Contracts are
committed source of truth; the verifier reads contracts, not live design JSX.

---

## 5. The Iteration Loop — `vd:dev` (warm) vs `vd:loop` (gate)

The harness has two modes. Understanding the split is what makes per-screen iteration fast
without weakening the final gate. (See `e2e/visual-diff/LOOP-EFFICIENCY-PROPOSAL.md` and
`harness/dev/README.md`.)

### `vd:loop` — the full regression gate

```
npm run vd:loop   # = vd:capture && vd:diff && vd:report
```

- **`vd:capture`** builds Electron (all three vite configs), captures the design reference
  (serves the design bundle over local HTTP, drives `designSetup`, screenshots the cropped
  region, snapshots DOM/AOM/styles), then captures the shipped app the same way via a fresh
  Electron launch per screen (`capture/captureDesign.ts`, `capture/captureShipped.ts`).
- **`vd:diff`** runs all four verify layers for every screen (`harness/diff.ts`).
- **`vd:report`** writes machine JSON + human markdown (`report/writeJsonReport.ts`,
  `report/writeMarkdownReport.ts`), mirrored to `specs/0006-5-design-fidelity/visual-diff/`.

This is **cold** by design — a fresh process model per run for maximum trust. It is the
regression check you run at the end of an iteration and before commit. Measured ~100-115s
for the full suite; a single-screen cold run is similar because of the fixed startup cost.

### `vd:dev` — the warm inner-loop accelerator

```
npm run vd:dev -- <screen>            # warm loop on one screen
npm run vd:dev -- <screen> --reset-cache
```

`harness/dev/runDevLoop.ts` + `dev/session.ts` + `dev/cache.ts` keep one design HTTP
server, one Chromium browser, and one Electron app **alive across invocations within a
session**, and skip design re-capture when nothing relevant changed:

- Builds Electron only when `.vite/build/main.js` is stale vs `src/main|preload|renderer`
  and the vite configs (`ensureElectronBuild`).
- Computes a **SHA-256 design cache key** over `design/v3-fetch/project/**`, the selected
  screen's contract, `screens.config.ts`, and the capture helpers (`computeDesignCacheKey`).
  If the key is unchanged, design capture is **skipped** and the cached reference reused;
  shipped is **always** re-captured fresh.
- Times each capture step out at 90s and **restarts Electron once** before re-trying a
  shipped capture, so a wedged app self-heals instead of hanging (`captureShippedWithFallback`,
  `markCaptureFailure` → `restart-electron` phase).
- Writes `artifacts/dev-session.json` with what was captured vs reused and the session phase.

Expected warm target loop: **~15-30s**, not sub-10s — the remaining cost is app
navigation, screenshots, snapshots, the pixel diff, and report I/O.

### The per-screen "fix worst screen" pattern

1. Read the report; the table is sorted by priority score, so the top row is the worst screen.
2. `npm run vd:dev -- <worst-screen>` to baseline it warm.
3. Make one targeted change to the shipped component (or fix a contract that is genuinely
   wrong about the design — but never to dodge a real gap).
4. `npm run vd:dev -- <worst-screen>` again (~15-30s) and read the failures.
5. Repeat 3-4 until that screen passes honestly.
6. **Regression gate:** `npm run vd:loop` (full suite).
7. **Standard gate:** the project verify chain
   (`rm -rf .vite/build && npm run typecheck && npm run lint && npm test && npm run e2e`).
   In the documented iteration this caught a real WCAG contrast failure via axe — the
   standard gate is not optional.
8. Commit.

`vd:dev` **defers** regression safety, it does not skip it. The discipline is: warm loop
while fixing one screen, then finish every accepted iteration with `vd:loop` + the standard
chain. Projected savings in the worked example were ~30 minutes per iteration (iteration A
spent 41.6 min in visual loops alone, mostly redoing cold capture after tiny UI changes).

### What not to do (from the efficiency proposal)

- Do not skip the full `vd:loop` regression check.
- Do not trust prior shipped captures after source changes (shipped is always re-captured).
- Do not loosen contracts to make screens pass faster.
- Do not skip the standard verify chain (axe caught a real contrast issue).
- Do not let `vd:dev` overwrite or reinterpret `vd:loop` results as final proof.

---

## 6. Anti-Patterns Learned the Hard Way

These are the failure modes the methodology exists to prevent. Each is a real lesson from
the journey (Runs 6.5-11), documented in the v2 proposal and the contract-honesty audit
(`specs/0008-ai-passive-steps/fixtures/contract-honesty-audit.md`).

### 6.1 The hollow contract (passes by definition)

The harness will happily pass a contract whose semantic arrays are empty.
`verifyRequiredElements` only loops over the entries that exist; empty `texts`/`headings`/
`controls`/`visualMarkers` produce **zero** element failures. Empty `styleSamples` produce
zero style failures. With everything empty, the *only* live gate is the pixel residual —
i.e. you are back to the pixel-only lie. **A contract with `required.* = []` and
`styleSamples = []` is a hollow pass by construction.** The honesty audit's first job is
to scan for this; the standard is that every contract asserts at least real visible
content or controls, and key surfaces also carry markers/style samples.

### 6.2 Inflated thresholds masking gaps

Setting `pixel.maxDiffPercent` high (the audit flagged three Clarify contracts at
`65 / 40`) lets large future drift pass silently. The tell: the *measured* residual was
~5%, so a 65% cap was never needed — it only existed to create headroom. The discipline is
single-digit, justified thresholds. If a screen genuinely needs more (heavy animation),
mask the animated region or justify the number in the contract comment — don't inflate
globally. The audit's #1 recommended fix was tightening these back to single digits.

### 6.3 Synthetic markup vs the real component path

The most subtle anti-pattern. A screen's `shippedSetup` can `innerHTML`-inject simplified
markup that *resembles* the design, instead of driving the **real** shipped component into
the target state. The contract then passes — but it is proving the *fixture*, not the
product. The Run 8 passive-step screens originally did this (`renderPassiveState` injected
hand-written evidence rows). The honesty audit caught it: the contracts "prove the
simplified harness surface, not the full source component behavior." The fix (Run 9, task
#5) was to drive the contracts through the **real `StatusStep`** component by dispatching
real store actions (`renderPassiveShippedState` dispatches `workspaceEntered`,
`passiveStepRunStarted`, `passiveStepRunSucceeded` into the live Redux store and waits for
the real heading to render). **Verify through the real component, or you are testing a
decoy.**

### 6.4 Dark-sparse-UI dilution

The root failure from §1. Any time the meaningful UI is a small bright region on a large
dark stage, full-viewport pixel diff is mathematically blind to missing foreground. The
defense is `primaryRegion` cropping + the semantic layers. Be especially suspicious of
"passing" sparse dark screens with no element/style assertions.

### 6.5 Selector fallbacks that normalize over mismatch

Setup helpers that accept *either* the design or the shipped selector
(`.signin-card, .auth-list .auth-row`) keep capture robust but can hide that the shipped
structure diverged. Use them for resilience, but make sure the contract's required
elements and style samples still pin the *intended* structure so divergence surfaces as a
failure rather than being silently accepted.

### 6.6 Thin (not hollow) contracts

A contract can be non-empty but still under-assert — e.g. asserting only a step label,
ready copy, one heading, and one button, with no markers or style samples. It is a real
gate, just a weak one: it would miss status-card styling, spinner rendering, disabled
state, and fuller copy. The audit classed several passive idle/running contracts as
`THIN`. Thin is acceptable as a starting point but should be hardened on the surfaces that
matter (add a style sample for the card, a marker for the spinner, the full status copy).

---

## 7. Honesty Disciplines (the standard for "done")

These are the non-negotiables that keep a green report *meaningful*. They are the
methodology's answer to "how do we know the fidelity claim is real?"

1. **Verify via the real component, not a stand-in.** Drive shipped state through the
   actual product component and real state transitions. Synthetic `innerHTML` fixtures
   prove nothing about the product (§6.3).
2. **Thresholds single-digit and justified.** The pixel residual is a backstop. Caps above
   ~12% are a smell; if needed, mask or justify in-line, never inflate globally (§6.2).
3. **No empty arrays to force a pass.** Every contract asserts real visible content or
   controls; key surfaces also carry markers and style samples. Removing a requirement
   because shipped currently misses it is forbidden — *the failure is the point of the
   gate* (see the comment headers in the committed contracts).
4. **Cite evidence.** A claim of fidelity is backed by the residual %, the diff PNG, and
   the explicit failure list — not by a screenshot that "looks right." The report
   (`writeMarkdownReport.ts`) surfaces status, priority, residual, and top failures per
   screen for exactly this reason.
5. **Reference contracts are reviewed, never auto-overwritten in the fix loop.** A design
   change updates a contract as a deliberate, reviewed step. Auto-regenerating a contract
   to make a failure disappear fossilizes the bug.
6. **Separate "could not capture" from "failed parity."** Infrastructure flakiness (Electron
   wedged, build stale) must not masquerade as a UI fidelity failure. The dev session's
   restart-on-timeout and the build-staleness check exist to keep this boundary clean.
7. **Run the honesty audit periodically.** A green `N/N PASS` is necessary but not
   sufficient. Periodically audit contracts for hollow/thin/inflated patterns (the audit
   doc is the template: per-contract table with a HONEST / THIN / HOLLOW / INFLATED verdict
   and file:line evidence).

---

## 8. Reusing This Methodology Elsewhere

The verification core is **design-source-agnostic**. To apply it to a new project or a
new design medium, only the *capture front-end* changes:

| Stays the same (the reusable core) | Swaps per project / medium |
|---|---|
| Contract schema (`generateContract.ts` types) | The design source (HTML bundle, Figma frame, live page, comp) |
| 4-layer verify (`verify/*.ts`) | The **design adapter** that produces `design.png` + `design.dom.json` + `design.aom.json` + `design.styles.json` |
| Scoring + report (`score.ts`, `report/*`) | The shipped capture target (Electron, browser, native) |
| Dev/gate split + cache (`dev/*`) | `screens.config.ts` setup functions + masks |
| Honesty disciplines (§7) | `primaryRegion` selectors and `data-vd-role` hooks |

The prior-art London PoC (`/Users/psingley/foundation/blog-parity/destination-page-portability/TECHNICAL-RUNDOWN.md`)
seeded the cropped-pixel-diff idea against a *live legacy page* design source and proved
the central lever: cropping to the meaningful region
(`.legacy-bridge` bbox) turned a meaningless full-page metric into an actionable one
(desktop diff went 30% → 4.33% as real gaps were closed, with intentional chrome excluded
from the denominator). This harness's contribution on top of that prior art is the
**semantic contract layers** — because for dark/sparse product UI, cropping helps but is
not enough: the content area itself can be semantically wrong while the cropped pixels
still look close.

The next document, `docs/figma-harness-proposal.md`, works a concrete swap: replacing the
claude.ai/design HTML-bundle adapter with a **Figma** adapter (REST API / Dev Mode MCP
server), while keeping the entire verify → score → report → loop core intact.
