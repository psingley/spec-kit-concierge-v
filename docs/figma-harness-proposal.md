# Figma Bidirectional Fidelity Harness — Feasibility & Design Proposal

How to extend the existing visual-fidelity harness (`e2e/visual-diff/`, see
`docs/ui-fidelity-harness-runbook.md`) to work **FROM** and **TO** Figma, so a client
business that designs in Figma — not claude.ai/design — gets the same
near-1:1 design-to-implementation pipeline with evidence-backed contracts.

**Verdict up front:** Figma → app is **MEDIUM** difficulty and **high value**. The
enabling fact is that Figma's REST API and official Dev Mode MCP server expose exactly the
structured data our four verify layers already consume — text strings, bounding boxes,
colors, and typography map almost 1:1 onto our required-element and computed-style layers,
and Figma renders node PNGs on demand for the pixel layer. App → Figma is feasible too
(Figma shipped an official `generate_figma_design` "code to canvas" tool) but is lower
value as a fidelity gate; treat it as a separate niceties track.

---

## 1. What Stays the Same vs What Changes

The methodology runbook §8 already frames this: the verification **core** is
design-source-agnostic; only the **capture front-end** swaps.

| Component | Today (claude.ai/design) | With Figma | Change? |
|---|---|---|---|
| Contract schema | `contract/generateContract.ts` types | identical | **none** |
| Required-element verify | `verify/verifyElements.ts` | identical | **none** |
| Structure verify | `verify/verifyStructure.ts` | identical | **none** |
| Computed-style verify | `verify/verifyStyles.ts` | identical (+ Figma color normalizer) | tiny |
| Pixel residual verify | `verify/verifyPixels.ts` | identical | **none** |
| Score + report | `verify/score.ts`, `report/*` | identical | **none** |
| Dev/gate loop + cache | `dev/*` | identical (cache key hashes Figma file version instead of `design/**`) | tiny |
| Shipped capture | `capture/captureShipped.ts` (Electron) | identical | **none** |
| **Design capture** | `capture/captureDesign.ts` (serve HTML bundle, Playwright render) | **new Figma adapter** (REST/MCP) | **replace** |
| **Contract generation** | parse design JSX with Babel | **new** Figma-node-tree → contract generator | **add alongside** |

So the work is two new modules plus small touches, against an unchanged verify/report/loop
spine. That is the whole reason this is feasible rather than a rewrite.

### The conceptual mapping (why it fits so well)

The design adapter's job is to emit four artifacts per screen, which the verify layers
read: `design.png`, `design.dom.json`, `design.aom.json`, `design.styles.json`. Figma
provides a direct source for each:

| Verify layer needs | Today gets it from | Figma provides | Endpoint / MCP tool |
|---|---|---|---|
| `design.png` (cropped) | Playwright element screenshot | rendered node image | `GET /v1/images/:key?ids=…&format=png` **or** MCP `get_screenshot` |
| required texts / headings / controls | DOM text + `<h1-6>` + `<button>` | TEXT node `characters` | `GET /v1/files/:key/nodes` **or** MCP `get_metadata` |
| visual markers / structure (`design.dom.json`) | `data-vd-role` + DOM tree | node `name` + node tree + `id`/`type` | nodes tree / `get_metadata` |
| style samples (`design.styles.json`) | `getComputedStyle` | node `fills`/`style`/`cornerRadius`/`effects` + variables | nodes tree **or** MCP `get_variable_defs` |
| element bounds (cropping / layout) | element bounding box | `absoluteBoundingBox {x,y,width,height}` | nodes tree / `get_metadata` |

The Figma node tree is, for our purposes, a *better* design source than the HTML bundle:
it gives exact bounds, exact color floats, and exact type metrics as first-class data,
where today we have to render the prototype and read it back out of the browser.

---

## 2. Figma → App (the high-value direction)

### 2.1 Can we capture a Figma frame as the "design reference"? — Yes, two routes.

**Route A — Figma REST API (recommended for CI / deterministic gating).**
A personal access token (or OAuth token) in the `X-Figma-Token` header unlocks three
endpoints that together produce everything the adapter needs:

- **`GET /v1/files/:key/nodes?ids=<frameNodeId>&geometry=paths`** — returns the JSON
  subtree for the target frame: every child node with `name`, `type`,
  `absoluteBoundingBox`, `characters` (for TEXT), `style` (typography), `fills`
  (colors), `strokes`, `cornerRadius`, `effects`, `opacity`. This is the structured
  truth that feeds layers 1-3 and the contract generator. (Scoped to the frame, so it is
  small and fast.)
- **`GET /v1/images/:key?ids=<frameNodeId>&format=png&scale=2&use_absolute_bounds=true`**
  — returns a map `{ nodeId: <signed image URL> }`; fetch the URL to get the rendered PNG
  for the pixel layer. `scale` is 0.01-4; `use_absolute_bounds=true` makes the crop match
  the node's absolute box (important for aligning to the shipped screenshot). Image URLs
  **expire after 30 days** and render up to 32 megapixels.
- **`GET /v1/files/:key`** (whole file) — used once during onboarding to discover frame
  node IDs and names, then you pin the IDs in the manifest and use the per-node endpoint.

**Route B — Figma Dev Mode MCP server (recommended for the agent-in-the-loop authoring
experience).** Figma shipped an **official** MCP server (a real, supported product — not a
community shim). It runs as a remote server (no desktop app needed) or a local desktop
server, and is explicitly listed as compatible with Claude Code, Codex, Cursor, VS Code,
and Windsurf. Relevant tools:

- **`get_metadata`** — sparse XML of the selection: layer **IDs, names, types, position,
  sizes**. This is the required-element + bounds source for layers 1-2.
- **`get_variable_defs`** — the variables/styles applied to the selection: **color,
  spacing, typography tokens with values**. This is the design-system source for the
  computed-style layer (layer 3) — and it is *semantic* (token names), which is even
  better than raw computed values.
- **`get_screenshot`** — a screenshot of the selection, for the pixel layer (layer 4).
- **`get_design_context`** / **`get_code_connect_map`** — generated code + node↔component
  mappings; useful for *authoring* the shipped implementation, not for the gate itself.

**Recommendation:** use **REST for the CI gate** (deterministic, no editor/agent session,
no model dependency, scriptable exactly like today's `vd:capture`) and optionally use the
**MCP server for the interactive authoring loop** (an agent reads `get_variable_defs` +
`get_screenshot` while implementing the component). The contract that gets committed is the
same either way.

### 2.2 How a "Figma frame → contract" generator works

This is the analog of today's `extractContractFromSource` (which Babel-parses design JSX).
Instead, walk the Figma node subtree from `GET /v1/files/:key/nodes` and emit a
`.contract.json` in the **existing schema** (no schema change):

```
walk(frameNode):
  for each descendant node:
    if node.type == "TEXT" and node.characters is meaningful:
        required.texts.push({ value: node.characters })
        if looks-like-heading(node):   # large fontSize / name contains "Heading"/"Title"
            required.headings.push({ level: inferLevel(node), text: node.characters })
        if looks-like-button(node):    # inside a component named */Button/*, or has bg fill + label
            required.controls.push({ role: "button", name: node.characters, count: ++ })
    if node.name matches markerPatterns (orb/spinner/dot/mark):
        required.visualMarkers.push({
          name: slug(node.name),
          selector: `[data-vd-role="${slug(node.name)}"]`,   # shipped hook
          designSelector: `#${node.id}`                       # Figma side keyed by node id
        })
    # style sample candidates: key chrome nodes (buttons, panels, chips)
    if is-key-chrome(node):
        styleSamples.push({
          name: node.name,
          designSelector: `#${node.id}`,
          shippedSelector: `[data-vd-role="${slug(node.name)}"]`,
          properties: ["background-color","border-radius","padding","box-shadow"],
          expected: {                                  # NEW: bake Figma values in directly
            "background-color": rgbaFromFill(node.fills[0]),
            "border-radius": `${node.cornerRadius}px`,
            "box-shadow": shadowFromEffects(node.effects),
            ...
          }
        })
  primaryRegion.designSelector = `#${frameNode.id}`   # crop = the frame
  pixel = { maxDiffPercent: 7, warnDiffPercent: 7 }   # single-digit, per the disciplines
```

Three mapping details that make this concrete:

- **Colors.** Figma `fills[].color` is `{r,g,b,a}` as **0-1 floats**; convert to
  `rgb()/rgba()` (multiply by 255, round) so it lands in the same string space the
  computed-style layer already normalizes. The existing `verifyStyles.ts` color-equivalence
  table (`oklch`↔`rgb`) extends naturally with a Figma-float→rgb step.
- **Typography.** TEXT `style` gives `fontFamily`, `fontWeight`, `fontSize`,
  `lineHeightPx`, `letterSpacing`, `textAlignHorizontal` — a direct feed for
  `font-size`/`font-weight`/`line-height`/`letter-spacing` style-sample properties.
- **Bounds.** `absoluteBoundingBox {x,y,width,height}` per node gives exact element
  geometry. This enables an *optional* new check the HTML adapter never had cheaply:
  position/size assertions (element-bounds layer), since Figma hands us the design's
  intended box directly.

A key upgrade over today's flow: because Figma gives **exact expected values**, the
generated contract can be **non-hollow by construction** — it can bake the Figma color /
radius / type / text into the contract's expected fields, so even a never-reviewed draft
asserts real design intent. (The honesty discipline of human review still applies — to
strip noise and pick the *right* style samples — but the hollow-contract failure mode from
runbook §6.1 is structurally harder to hit.)

### 2.3 The capture adapter (drop-in replacement for `captureDesign.ts`)

Today `capture/captureDesign.ts` serves the HTML bundle over local HTTP, drives a
Playwright `designSetup`, and writes the four artifacts. The Figma adapter implements the
**same output contract** with no live render:

```
captureFigmaDesign(screen):
  nodes = GET /v1/files/{key}/nodes?ids={screen.figmaNodeId}&geometry=paths
  node  = nodes[screen.figmaNodeId]
  # design.png  — render + download
  imgUrl = GET /v1/images/{key}?ids={screen.figmaNodeId}&format=png&scale=2&use_absolute_bounds=true
  write design.png  <- fetch(imgUrl)
  # design.dom.json — synthesize the DomNode tree from the Figma node tree
  write design.dom.json  <- figmaNodeToDomNode(node)     # name→marker, type→tag, characters→text
  # design.aom.json — synthesize roles/names (TEXT→text, button-ish→button, heading-ish→heading)
  write design.aom.json  <- figmaNodeToAomNode(node)
  # design.styles.json — read fills/style/cornerRadius/effects for the contract's style samples
  write design.styles.json <- sampleFigmaStyles(node, contract.styleSamples)
```

Crucially, **the shipped side does not change at all** — `captureShipped.ts` still launches
Electron and reads the real React component via Playwright. Only the *reference* now comes
from Figma. The verify layers compare Figma-derived reference vs real-component shipped
exactly as they compare HTML-derived reference vs shipped today.

### 2.4 Manifest changes

`screens.config.ts` entries gain a Figma coordinate instead of (or alongside) `designPath`:

```ts
{
  name: 'signin-fresh',
  figma: { fileKey: 'AbC123…', nodeId: '42:1337' },   // replaces designPath as the design source
  shippedSetup: reachSignIn,                            // unchanged — drives the real component
  masks: [scrollbarMask]                                // unchanged
}
```

The design side no longer needs a `designSetup(page)` for *most* screens, because Figma
state is static per node — you point at the frame variant that represents the state
(e.g. a "SignIn / Atlassian authenticated" frame) rather than scripting a browser into
that state. (For shipped, `shippedSetup` still drives the real app into the matching state.)
This is actually simpler than today: design states become *named Figma frames* instead of
imperative setup scripts.

---

## 3. App → Figma (the reverse direction) — feasibility, lower value

Figma shipped an official **"code to canvas"** capability via the MCP tool
`generate_figma_design`: it turns a live, running interface (production, staging, or
localhost) into fully editable Figma frames. Figma's own blog documents a Claude-Code → Figma
flow built on exactly this. So the reverse is **technically real and supported**, not
hypothetical.

What it would mean for this harness: after the shipped app reaches a state, push that
rendered UI back to a Figma page as frames (via `generate_figma_design`, or by uploading
the shipped screenshot as an image fill via the MCP `upload_assets` tool, or via REST
`POST` of created nodes). Possible uses: giving designers a canvas snapshot of "what
actually shipped" for side-by-side review, or seeding a Figma file from an existing app.

**Assessment: low value as a fidelity gate.** The harness's job is to verify shipped
*against* an authoritative design; pushing shipped *into* Figma does not gate anything — it
produces a comparison artifact at best, and a noisy auto-generated frame at worst. It also
inverts the source of truth (designers, not the app, own the Figma file). Recommendation:
**out of scope for the fidelity gate**; keep `generate_figma_design` available as an
optional "snapshot shipped state to a review page" convenience for designers, decoupled
from the pass/fail pipeline. Effort if ever wanted: small (it is one MCP tool call), but
deprioritize.

---

## 4. Use Cases (the automatic UI/UX → implementation workflow)

Enumerated from the capability set above:

1. **Handoff auto-contract.** Designer finishes a Figma frame → harness reads the node
   tree → auto-generates the fidelity `.contract.json` (text, bounds, colors, type baked
   in) → dev implements the React component → harness verifies the shipped component 1:1
   against the Figma source. The contract is generated, not hand-written.
2. **Design-system-to-implementation pipeline.** `get_variable_defs` / file styles expose
   the design tokens (color, spacing, typography) as *named* values. Style-sample
   assertions can be generated per token, so the gate enforces "shipped uses the design
   system's actual radius/teal/spacing," not an approximation.
3. **Regression-catching on design change.** Because the contract carries the Figma file
   `version` (or a content hash), when a designer edits the frame, re-running the generator
   produces a new contract; the diff between old and new contract is a precise changelog of
   "what the design now requires," and the shipped app is re-gated against it. Conversely,
   pinning the version makes the gate stable until a design change is intentionally adopted.
4. **PR fidelity gate.** Wire `figma:loop` into CI: a PR that touches a covered component
   must pass the four layers against the pinned Figma frame, or it fails — the same gate
   that exists today, now sourced from the client's own Figma.
5. **New-screen onboarding at design time.** The moment a frame exists in Figma, a screen
   can be added to the manifest by node ID and get a generated contract — no waiting for an
   HTML prototype handoff. Design and the fidelity contract are created together.
6. **Drift audit across a file.** Walk every top-level frame in a Figma page, generate
   contracts, and report which shipped components exist / are missing / have drifted —
   a coverage map of "how much of the Figma file is faithfully implemented."
7. **Multi-state coverage from frame variants.** Figma component variants (idle / running /
   done, or auth states) map directly to the harness's per-state screens — each variant
   frame becomes one contract, replacing imperative `designSetup` scripting.

---

## 5. Concrete Architecture Sketch

New + changed files, keeping the existing verify/report/loop spine untouched:

```
e2e/visual-diff/harness/
  capture/
    captureFigmaDesign.ts     # NEW — REST adapter: nodes→artifacts, images→png (drop-in for captureDesign.ts)
    figmaClient.ts            # NEW — token auth (X-Figma-Token), GET files/nodes/images, retry on 429 w/ Retry-After
    figmaToDom.ts             # NEW — Figma node tree → DomNode (name→marker, type→tag, characters→text)
    figmaToAom.ts             # NEW — Figma node tree → AomNode (TEXT→text, button-ish→button, heading-ish→heading)
    figmaStyles.ts            # NEW — fills/style/cornerRadius/effects → CapturedStyleSample (same shape as snapshotStyles)
    captureShipped.ts         # UNCHANGED
    snapshot*.ts, screenshot.ts  # UNCHANGED (reused by shipped side)
  contract/
    generateFigmaContract.ts  # NEW — node tree → VisualDiffContract (analog of extractContractFromSource), bakes expected values
    generateContract.ts       # UNCHANGED (HTML path stays for the existing app)
    loadContract.ts, normalize*.ts  # UNCHANGED
  verify/                     # UNCHANGED (all four layers + score)
  report/                     # UNCHANGED
  dev/                        # UNCHANGED logic; cache key hashes Figma {fileKey,version} instead of design/** (one-line swap in cache.ts)
  screens.config.ts           # CHANGED — entries carry { figma: { fileKey, nodeId } }; designSetup optional
  figma.config.ts             # NEW — fileKey, default scale, token env var name, per-file version pin
```

New npm scripts mirroring the existing ones (the existing `vd:*` stay for the HTML app):

```
"figma:generate-contract": "vite-node …/contract/generateFigmaContract.ts",
"figma:capture":  "… build electron && vite-node …/capture/captureFigmaDesign.ts \"$@\" && vite-node …/capture/captureShipped.ts \"$@\"",
"figma:diff":     "vite-node …/harness/diff.ts",          # identical verifier
"figma:report":   "vite-node …/harness/report.ts",        # identical report
"figma:loop":     "npm run figma:capture && npm run figma:diff && npm run figma:report",
"figma:dev":      "vite-node …/harness/dev/runDevLoop.ts" # same warm loop, Figma-keyed cache
```

`vd:diff`/`vd:report` and `figma:diff`/`figma:report` are literally the same files —
`diff.ts` already takes screen names and reads the committed contract + captured artifacts;
it does not care whether the reference came from HTML or Figma. That is the payoff of the
adapter boundary.

### How it plugs in

```
        ┌─────────────── DESIGN SOURCE ADAPTER (the only new part) ───────────────┐
Figma → │ figmaClient (REST/X-Figma-Token)  →  nodes JSON  →  figmaToDom/Aom/Styles │ → design.dom/aom/styles.json
file    │                                   →  images PNG   →  download             │ → design.png
        └──────────────────────────────────────────────────────────────────────────┘
                                              │ (same four artifacts as today)
                                              ▼
  Electron shipped capture (UNCHANGED) ─────► shipped.dom/aom/styles.json + shipped.png
                                              │
                                              ▼
  verifyScreen → 4 layers (UNCHANGED) ──► score (UNCHANGED) ──► JSON + MD report (UNCHANGED)
                                              │
                                              ▼
                              figma:dev warm loop / figma:loop gate (UNCHANGED logic)
```

---

## 6. Auth / API Specifics

**Authentication.**
- Personal access token: Figma → Settings → Security → "Generate new token." Pass it in the
  **`X-Figma-Token`** request header. Scope the token to `file_content:read` (Tier-1 file
  endpoints require it). Store as an env var (e.g. `FIGMA_TOKEN`), never commit.
- OAuth is an option for a multi-user/server deployment; PAT is sufficient for a CI gate.
- A PAT acts as the user who generated it; rate limits are charged against that identity.

**Endpoints used.**
- `GET /v1/files/:key` — onboarding discovery of frame node IDs/names (Tier 1).
- `GET /v1/files/:key/nodes?ids=…&geometry=paths` — per-frame structured tree (Tier 1).
- `GET /v1/images/:key?ids=…&format=png&scale=2&use_absolute_bounds=true` — rendered PNG
  map; image URLs **expire after 30 days**, 32 MP max, then fetch the signed URL (Tier 1).
- (`GET /v1/files/:key/images` exists for image *fills*, Tier 2 — not needed for frame render.)

**Rate limits (post-Nov-2025 update).** Figma uses a leaky-bucket algorithm; limits depend
on **plan × seat × file location**. The file/nodes/images endpoints are **Tier 1** (the most
restrictive):
- **Dev/Full seat:** ~10/min (Starter file) to ~15/min (Pro) to ~20/min (Org) for Tier 1.
- **View/Collab seat:** as low as **6 per *month*** for Tier-1 file content — effectively
  unusable for a CI gate, so the token's seat **must be Dev or Full**.
- File metadata (`GET /v1/files/:key/meta`) is **Tier 3** (50-150/min) — cheap, good for
  the cache-key version check.
- 429 responses carry `Retry-After` (seconds), `X-Figma-Rate-Limit-Type` (`low`/`high`),
  `X-Figma-Plan-Tier`, and `X-Figma-Upgrade-Link`. The client must honor `Retry-After`.

**Rate-limit design implications (important):**
- Tier-1 budgets are small, so the adapter must **cache aggressively**. Reuse the existing
  `dev/cache.ts` pattern: key on Figma `{fileKey, version}` (or the file `lastModified` /
  `version` from a cheap Tier-3 metadata call) and **skip re-fetch when unchanged** —
  exactly as `vd:dev` skips design re-capture today. A full-suite `figma:loop` should fetch
  each frame's nodes + image once and cache, not per inner-loop iteration.
- Batch node fetches: `GET /v1/files/:key/nodes?ids=a,b,c` and
  `GET /v1/images/:key?ids=a,b,c` accept multiple IDs, so one request can cover many
  screens that share a file — collapse per-screen calls into per-file calls.
- The community has reported the **images endpoint 429-ing after ~10 requests** behind
  CloudFront, so render PNGs in small batches with backoff. This is the single most likely
  operational friction point.

**MCP server option.** The official Figma Dev Mode MCP server (remote or desktop) is
compatible with Claude Code/Codex/Cursor/VS Code and exposes `get_metadata`,
`get_variable_defs`, `get_screenshot` (plus code-gen and write tools). It is currently free
during beta, slated to become usage-based paid. For a *deterministic CI gate* prefer REST
(no editor session, no model in the loop); for the *interactive authoring loop* the MCP
server is ergonomic. Both read the same underlying file, so contracts are interchangeable.

---

## 7. Honest Assessment

**Easy (low risk):**
- The entire verify → score → report → loop spine is reused **unchanged**; this is proven
  code with tests. No schema change.
- REST auth + the three endpoints are simple, well-documented HTTP. A thin client with
  `X-Figma-Token` + JSON parsing is a day's work.
- Color/typography/bounds mapping is mechanical: Figma floats → rgb, `style` → font props,
  `absoluteBoundingBox` → geometry. These land in the existing normalized string space.
- The pixel layer is unchanged — Figma just supplies the reference PNG instead of Playwright.

**Medium (needs care):**
- The **Figma-node-tree → contract generator** is the real new logic: deciding what counts
  as a heading vs body text, a button vs a labeled rectangle, a meaningful style-sample node
  vs noise. Figma frames are deeply nested and auto-layout-heavy, so the walker needs
  heuristics (font-size thresholds, component-name patterns like `*/Button`, variant names)
  and — per the honesty disciplines — a human review pass before commit. This is the analog
  of removing JSX extraction noise today, just over a richer tree.
- **Selector mapping.** Today design selectors are CSS classes; Figma "selectors" are node
  IDs / names. The shipped side still needs `data-vd-role` hooks for markers and style
  samples, and the contract must carry the Figma-node-ID → shipped-`data-vd-role` mapping.
  This is the same `designSelector`/`shippedSelector` split the schema already supports,
  populated differently.
- **Rate limits.** Tier-1 budgets are tight (and View/Collab seats are unusable); the gate
  must use a Dev/Full-seat token and cache on file version. Solvable with the existing cache
  pattern, but it must be built in from day one, not bolted on.
- **State coverage.** Each UI state must exist as a distinct Figma frame/variant. If the
  client's Figma file doesn't enumerate states (e.g. only a happy-path frame), some states
  can't be sourced from Figma and fall back to the HTML/manual path. This is a *design-file
  completeness* dependency, not a harness limitation.

**Uncertain / to de-risk with a spike:**
- **Render-vs-DOM crop alignment.** The Figma PNG is rendered by Figma's engine; the shipped
  PNG is rendered by Chromium/Electron. Fonts, antialiasing, and sub-pixel hinting differ
  (the same font-subpixel issue today's harness masks). Expect the pixel layer to need
  per-screen masks and honest single-digit thresholds, same as now — the semantic layers
  carry the real weight, so this is tolerable, but the exact residual baseline is unknown
  until measured.
- **`use_absolute_bounds` / scale** must be tuned so the Figma crop matches the shipped
  element box closely enough for `pixelmatch` (which crops to the min width/height of the
  two images). A scale-2 render vs a 1280×720 viewport capture will need a normalization
  step (downscale, or capture shipped at matching DPR).
- **Auto-layout / responsive frames.** A Figma frame is a fixed snapshot at one size; the
  shipped component is responsive. Pin the harness viewport to the frame's design size
  (as today's fixed 1280×720), and gate at that size.

**Rough effort.**
- **Figma-capture adapter MVP** (REST client + `captureFigmaDesign.ts` emitting the four
  artifacts for one pinned frame, wired to the existing verifier, one screen passing
  end-to-end): **~2-3 focused days.** This proves the whole spine works against Figma.
- **Contract generator** (`generateFigmaContract.ts` with heading/button/marker/style
  heuristics + value baking + review workflow): **~3-5 days**, because the heuristics and
  noise-stripping are where the iteration lives (mirrors how long contract authoring took
  for the HTML app).
- **Rate-limit-aware caching + multi-screen batching + `figma:dev`/`figma:loop` scripts:**
  **~2-3 days**, mostly reusing `dev/cache.ts` with a Figma-version key.
- **App → Figma (`generate_figma_design` snapshot):** **~1 day** if wanted, but
  deprioritized — it does not gate fidelity.

Net: a believable **~1.5-2 week** path to a Figma-sourced fidelity gate covering a first
batch of screens, dominated by the contract-generator heuristics and rate-limit caching —
**not** by the verify core, which is reused wholesale.

---

## 8. One-Line Recommendation

Build a **Figma design-source adapter** (REST `files/nodes` + `images` → the same four
capture artifacts, plus a node-tree→contract generator that bakes Figma's exact text /
bounds / colors / type into the existing contract schema), keep the entire four-layer
verify → score → report → warm/gate-loop core **unchanged**, source the gate from a
Dev/Full-seat token with file-version caching to stay inside Tier-1 limits, and treat
app→Figma (`generate_figma_design`) as an optional designer-snapshot convenience outside
the pass/fail pipeline.

---

## Sources

- [Figma REST API — File endpoints](https://developers.figma.com/docs/rest-api/file-endpoints/)
- [Figma REST API — File node types](https://developers.figma.com/docs/rest-api/file-node-types/)
- [Figma REST API — Rate limits](https://developers.figma.com/docs/rest-api/rate-limits/)
- [Figma REST API — Personal access tokens](https://developers.figma.com/docs/rest-api/personal-access-tokens/)
- [Figma Dev Mode MCP server — Introduction](https://developers.figma.com/docs/figma-mcp-server/)
- [Figma Dev Mode MCP server — Tools and prompts](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/)
- [Figma Dev Mode MCP server — Code to canvas](https://developers.figma.com/docs/figma-mcp-server/code-to-canvas/)
- [Figma Blog — Introducing the Dev Mode MCP server](https://www.figma.com/blog/introducing-figma-mcp-server/)
- [Figma Blog — From Claude Code to Figma (code to canvas)](https://www.figma.com/blog/introducing-claude-code-to-figma/)
- [Figma Learn — Guide to the Figma MCP server](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server)
