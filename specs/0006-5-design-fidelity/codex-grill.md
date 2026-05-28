# Run 6.5 Design-Fidelity Grill

Phase 1 read-only grill for `chore/0006-5-design-fidelity`. Source files read: `design/v3-fetch/README.md`, `design/v3-fetch/chats/chat1.md`, the requested design JSX files, `design/v3-fetch/project/styles.css`, `ROADMAP_DECISIONS.md` lines 580-750, `.specify/memory/constitution.md`, `src/renderer/styles/index.css`, and the shipped renderer components under `src/renderer/components/`. `specs/0006-5-design-fidelity/` did not exist before this report.

## Section 1: Surfaces — Design Intent Summary

**AppShell**: The design wants the app to feel like a dense, local desktop workbench: a 44px Electron titlebar over a two-column body where the workspace is primary and the activity rail can attach to the right or left, or disappear (`design/v3-fetch/project/styles.css:1707`, `design/v3-fetch/project/styles.css:1712`, `design/v3-fetch/project/app.jsx:370`, `design/v3-fetch/project/app.jsx:433`). The visual hook is layered near-black chrome rather than a page layout: `--bg`, `--bg-2`, `--surface`, and `--surface-2` create subtle depth, while the current implementation is only a one-div wrapper with class `app-shell` (`src/renderer/components/AppShell.tsx:7`).

**Titlebar**: The titlebar is the command center, not decorative header text. The design combines repo, branch/session, auth, model, gear, about, request, and activity affordances into compact chips with dropdown menus, status dots, caret chevrons, and mono metadata (`design/v3-fetch/project/topbar.jsx:14`, `design/v3-fetch/project/topbar.jsx:109`, `design/v3-fetch/project/topbar.jsx:200`, `design/v3-fetch/project/topbar.jsx:345`). It should feel like a restrained IDE toolbar: tiny, inspectable, and stateful; the shipped titlebar is plain text spans and three text buttons (`src/renderer/components/Titlebar.tsx:17`).

**SignInScreen**: The sign-in surface should feel like a focused access gate with calm hero-card chrome, provider iconography, and status pills. The design centers a card, uses a pulsing ring mark, and presents GitHub CLI, Copilot CLI, and Atlassian MCP as rows with icons, subtext, connected pills, and disabled states (`design/v3-fetch/project/signin.jsx:12`, `design/v3-fetch/project/signin.jsx:14`, `design/v3-fetch/project/signin.jsx:27`, `design/v3-fetch/project/styles.css:915`). The shipped screen is functionally similar but visually flat, and still says "Atlassian optional stub", which conflicts with the Run 6 direction not to label that path optional (`src/renderer/components/SignInScreen.tsx:20`, `src/renderer/components/SignInScreen.tsx:29`).

**RepoBrowseScreen**: The design's repo picker is a dense command palette/list hybrid, not a card grid. It searches repos, groups recent and all repos, shows repo metadata and branch/session counts in compact rows, and switches to a branch/session picker only after a repo is selected (`design/v3-fetch/project/repo-browse.jsx:20`, `design/v3-fetch/project/repo-browse.jsx:35`, `design/v3-fetch/project/repo-browse.jsx:79`, `design/v3-fetch/project/repo-browse.jsx:104`). The shipped surface uses a wide hero card plus responsive repo cards (`src/renderer/components/RepoBrowseScreen.tsx:18`, `src/renderer/components/RepoBrowseScreen.tsx:23`), so the feel is much more landing-page than operator console.

**Stepper**: The stepper is the visual centerpiece: an orb timeline with circular nodes, connector lines, a track fill, current-step glow/pulse, and explicit done/current/locked states (`design/v3-fetch/project/app.jsx:451`, `design/v3-fetch/project/app.jsx:459`, `design/v3-fetch/project/styles.css:2545`, `design/v3-fetch/project/styles.css:2632`). It should feel like a precise stage rail for a long-running pipeline. The shipped stepper is a tablist of rectangular buttons showing raw state words (`src/renderer/components/Stepper.tsx:12`, `src/renderer/components/Stepper.tsx:25`).

**SpecifyStep**: The design splits Specify into three moods: an initial prompt input card, a running state with centered spinner and explanatory activity-stream cue, and a completed `spec.md` review panel with preview/edit tabs, pop-out editor, read-progress bar, and scroll-to-unlock gate (`design/v3-fetch/project/steps.jsx:22`, `design/v3-fetch/project/steps.jsx:58`, `design/v3-fetch/project/steps.jsx:83`, `design/v3-fetch/project/steps.jsx:104`). Its hook is the "read before advancing" interaction made visible as a slim progress bar and gate row. The shipped version has the basic mode switch and modal, but no actual scroll progress calculation or visual gate behavior (`src/renderer/components/SpecifyStep.tsx:25`, `src/renderer/components/SpecifyStep.tsx:62`).

**Activity**: The activity rail is terminal-like operational telemetry. The design uses a fixed-width stream, timestamp/glyph/message columns, a sticky current-status block, level-colored glyphs, and auto-scroll footer metadata (`design/v3-fetch/project/activity.jsx:13`, `design/v3-fetch/project/activity.jsx:25`, `design/v3-fetch/project/activity.jsx:33`, `design/v3-fetch/project/styles.css:3486`). It should feel like a live local log, not a notification list. The shipped rail keeps semantic `aside` and live regions, but only renders plain list items and does not expose glyph/timestamp/message structure (`src/renderer/components/Activity.tsx:14`, `src/renderer/components/Activity.tsx:16`).

**ActivityPill**: The design's activity pill is an always-visible terminal toggle with a left terminal icon, divider, and right Pixel-C spinner; it changes chrome for open and busy states (`design/v3-fetch/project/activity-pill.jsx:33`, `design/v3-fetch/project/activity-pill.jsx:39`, `design/v3-fetch/project/styles.css:1498`, `design/v3-fetch/project/styles.css:1517`). The shipped pill puts spinner plus status text in a simple button (`src/renderer/components/ActivityPill.tsx:11`), so it lacks the compact morphing chip feel and chevron/open-state language.

**CustomizeModal**: The design consolidates customization into a gear-menu modal, not a persistent tweaks panel. It uses section blocks, swatch buttons with a dim accent strip, segmented controls, and a real switch for the scroll gate (`design/v3-fetch/project/customize-modal.jsx:4`, `design/v3-fetch/project/customize-modal.jsx:15`, `design/v3-fetch/project/customize-modal.jsx:17`, `design/v3-fetch/project/customize-modal.jsx:121`). The shipped modal is accessible but raw: a text input for accent, a native select for density, left/right/hidden activity buttons, and a text switch button (`src/renderer/components/CustomizeModal.tsx:20`, `src/renderer/components/CustomizeModal.tsx:22`, `src/renderer/components/CustomizeModal.tsx:29`). Run 6.5 should keep the single teal theme, so swatches become either hidden/deferred or reduced to a teal-only preview.

**AboutModal**: The design treats About as app-about chrome with brand, version, org, repo, branch, model, spec-kit version, and team metadata (`design/v3-fetch/project/topbar.jsx:257`, `design/v3-fetch/project/topbar.jsx:263`, `design/v3-fetch/project/topbar.jsx:272`). It should feel like a compact desktop about panel. The shipped modal is a minimal dialog with only repo/branch and close (`src/renderer/components/AboutModal.tsx:3`), so this is an easy visual/content port as long as build SHA/version values have an existing source.

**RequestModal**: The design has a full "file a request" modal with feature/bug segmented control, title/body fields, bug severity, auto-attached context chips, and a sent state (`design/v3-fetch/project/request-modal.jsx:3`, `design/v3-fetch/project/request-modal.jsx:45`, `design/v3-fetch/project/request-modal.jsx:81`, `design/v3-fetch/project/request-modal.jsx:93`). Run 6.5 scope explicitly defers RequestModal to Run 12, so the design intent should be recorded but not built now. The shipped stub correctly says request capture is later (`src/renderer/components/RequestModal.tsx:3`).

**Markdown**: The design's markdown viewer is a hand-rolled renderer with styling for headings, lists, code, blockquotes, tables, frontmatter, and preview/editor chrome (`design/v3-fetch/project/md.jsx:3`, `design/v3-fetch/project/md.jsx:43`, `design/v3-fetch/project/styles.css:3048`, `design/v3-fetch/project/styles.css:3061`). The feel is reviewable spec evidence inside the workbench, not a document page. Run 6.5 should restyle current output only; the shipped renderer is intentionally small and misses tables, blockquotes, ordered lists, frontmatter, and inline code styling breadth (`src/renderer/components/Markdown.tsx:10`).

**Icons**: The design depends on a compact currentColor icon set covering GitHub, Copilot, search, check, x, plus, edit, eye, pop-out, arrows, send, bug, sparkles, file, folder, Atlassian, Jira, command, refresh, gear, download, info, branch, mail, clock, and terminal (`design/v3-fetch/project/icons.jsx:1`, `design/v3-fetch/project/icons.jsx:3`, `design/v3-fetch/project/icons.jsx:46`, `design/v3-fetch/project/icons.jsx:94`). The shipped set has only Spark, Gear, and Repo (`src/renderer/components/Icons.tsx:14`). Visual fidelity depends on porting these before most surface work.

## Section 2: Token System Proposal

Use hex tokens, not OKLCH, for the first pass. The design source uses OKLCH, but Run 6.5 is a fidelity catch-up inside an Electron app with axe gates and a locked teal source-of-truth from `ROADMAP_DECISIONS.md` line 593 (`ROADMAP_DECISIONS.md:592`). Hex is easier to audit quickly in Playwright/axe output, easier to compare against the known `#3a7e9a` / `#132f3b` mandate, and avoids subtle compatibility differences in older embedded Chromium builds. CSS can still use alpha via `rgb(var(--accent-rgb) / <alpha-value>)`.

```css
:root {
  color-scheme: dark;

  --font-sans: "Geist", "Geist Sans", Inter, ui-sans-serif, system-ui, sans-serif;
  --font-mono: "Geist Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;

  --bg: #0b0d10;
  --bg-2: #101419;
  --surface: #171c22;
  --surface-2: #202732;
  --surface-raised: #242d38;

  --text: #f2f5f7;
  --text-dim: #b5c0c8;
  --text-faint: #77838d;

  --line: #29323c;
  --line-strong: #3a4653;

  --accent: #3a7e9a;
  --accent-rgb: 58 126 154;
  --accent-dim: #132f3b;
  --accent-bg: rgb(var(--accent-rgb) / 0.16);
  --accent-ink: #061017;

  --good: #70d58a;
  --good-rgb: 112 213 138;
  --good-bg: rgb(var(--good-rgb) / 0.14);
  --warn: #e2b84f;
  --warn-rgb: 226 184 79;
  --warn-bg: rgb(var(--warn-rgb) / 0.14);
  --bad: #ef6f6c;
  --bad-rgb: 239 111 108;
  --bad-bg: rgb(var(--bad-rgb) / 0.14);
  --info: #7aa7ff;
  --info-rgb: 122 167 255;
  --info-bg: rgb(var(--info-rgb) / 0.14);

  --shadow-1: 0 1px 0 rgb(255 255 255 / 0.04) inset, 0 1px 2px rgb(0 0 0 / 0.42);
  --shadow-2: 0 18px 42px -18px rgb(0 0 0 / 0.72), 0 0 0 1px var(--line);
  --shadow-3: 0 28px 72px -24px rgb(0 0 0 / 0.78), 0 0 0 1px var(--line-strong);

  --radius-xs: 3px;
  --radius-sm: 4px;
  --radius: 6px;
  --radius-lg: 10px;
  --radius-pill: 999px;

  --focus-ring: 0 0 0 3px rgb(var(--accent-rgb) / 0.28);
  --focus-outline: 2px solid var(--accent);
}
```

Important caveat: the roadmap locks `--accent-dim: #132f3b`, but that value is too dark for text or a thin border when placed on near-black. It should be treated as a dark companion/background boundary token, not as foreground text.

## Section 3: Per-Surface Execution Order

1. **Tokens + base CSS reset first**. Everything else depends on replacing the current purple `--accent: #8b5cf6` and 80-line stylesheet foundation (`src/renderer/styles/index.css:1`). This pass establishes global font, focus, buttons, fields, modal shell, tags, and utility classes before JSX churn starts.

2. **Icons second**. Titlebar, SignInScreen, RepoBrowseScreen, SpecifyStep, Activity, CustomizeModal, AboutModal, and RequestModal design references all import icons. Porting the icon library early avoids repeated local stubs and keeps JSX diffs smaller (`design/v3-fetch/project/icons.jsx:1`, `src/renderer/components/Icons.tsx:14`).

3. **AppShell + WorkspaceContainer layout third**. The titlebar, stepper, workspace body, activity rail, and activity pill need the same grid and layering assumptions. This blocks Stepper, Activity, and ActivityPill sizing because the design's grid sets a 44px titlebar and 360px activity rail (`design/v3-fetch/project/styles.css:1707`, `design/v3-fetch/project/styles.css:1712`).

4. **Titlebar fourth**. Once icons and app grid exist, port chip chrome and menus. Titlebar also determines the anchor positions for gear, about, request, model, and activity controls (`design/v3-fetch/project/app.jsx:378`, `design/v3-fetch/project/app.jsx:412`).

5. **Stepper fifth**. The orb stepper should land after the app grid/titlebar because its horizontal track and workspace header padding depend on the workspace chrome (`design/v3-fetch/project/styles.css:2525`, `design/v3-fetch/project/styles.css:2545`). It is high-value and test-sensitive, so isolate it.

6. **SignInScreen and RepoBrowseScreen sixth, parallelizable**. Both are gate surfaces using the same card, row, search, icon, and status-pill primitives. They can be split between two workers after tokens/icons are stable. RepoBrowse has more logic questions because the current implementation uses selectedRepo-plus-session state instead of the design's two-view `pickedRepo` local state (`src/renderer/components/RepoBrowseScreen.tsx:14`).

7. **SpecifyStep + Markdown seventh**. Specify depends on base panel/tab/button/modal styles and the markdown style layer. Keep engine behavior unchanged, but add the visual progress and prompt-card chrome carefully (`design/v3-fetch/project/steps.jsx:83`, `design/v3-fetch/project/styles.css:3009`).

8. **Activity + ActivityPill eighth, parallelizable with Specify if shared tokens are done**. Activity rail and pill share terminal styling and Pixel-C spinner assumptions. Activity should preserve live-region semantics from the shipped component while gaining the timestamp/glyph/message grid (`src/renderer/components/Activity.tsx:15`, `design/v3-fetch/project/styles.css:3497`).

9. **CustomizeModal ninth**. It depends on Titlebar/gear entry and token decisions. Because Run 6.5 is teal-only, this surface should be reduced to density, activity off/right, and scroll gate unless the user explicitly wants a dormant swatch preview.

10. **AboutModal tenth**. Low risk visually, but exact version/build SHA source may need a non-visual data decision. If no existing build metadata exists, keep static visible fields limited to known safe values and ask later.

11. **RequestModal eleventh**. Do not port the full request flow in Run 6.5. Restyle the existing stub only enough that the deferred modal does not look broken.

12. **Acceptance gates last**. Screenshot regression, manual verification, and axe should run after all surfaces are stable. Axe must be final because the teal swap can invalidate contrast across many states. Screenshot tests should be added per surface, not one giant golden test.

Parallelizable sets after tokens/icons: SignInScreen + RepoBrowseScreen; Activity + ActivityPill; AboutModal + RequestModal stub; Markdown styling can run beside Specify only if ownership is split between CSS-only markdown selectors and Specify JSX.

## Section 4: Ambiguities Surfaced (THE GRILL)

**Stepper Q1 — Orb state transitions**: Does the user want the orb stepper to animate state transitions or be static?
  A) Animated CSS transitions and pulse for current state. Cost: medium, about 2h; no new Redux state; must add reduced-motion CSS.
  B) Static swaps only. Cost: low, about 45m; simpler screenshots; lower visual richness.
  C) Animated with `prefers-reduced-motion` fallback plus screenshot variants. Cost: medium-high, about 3h; strongest accessibility posture.

**Activity Q1 — Terminal font scope**: Should the activity-rail terminal styling use a fixed-pitch font for all entries or only for the prefix glyph plus timestamp?
  A) All entries fixed-pitch. Cost: low; matches design CSS at `styles.css:3486`; can feel technical and log-like.
  B) Timestamp/glyph fixed-pitch, message sans. Cost: low-medium; improves long prose readability; deviates from design.
  C) Fixed-pitch for command and structured rows only. Cost: medium; needs per-entry class rules and screenshot coverage.

**RepoBrowse Q1 — Default layout**: The design's RepoBrowseScreen — which view is the v1 default if both card grid and dense list are present?
  A) Dense list default. Cost: medium; matches `repo-browse.jsx`; best for many repos.
  B) Card grid default. Cost: low; closer to shipped component; weaker fidelity.
  C) Recent dense list above optional cards. Cost: high; more layout/test work and not directly evidenced in the fetched design.

**Palette Q1 — Teal contrast failure**: axe-core will flag teal `#3a7e9a` against `#132f3b` for AA 4.5:1 contrast ratio — accepted or shift one value?
  A) Keep both exact values, never use them as foreground/background text pair. Cost: low; preserves roadmap source-of-truth; requires careful token semantics.
  B) Lighten `--accent` for foreground text while keeping `#3a7e9a` as brand/accent fill. Cost: medium; introduces `--accent-text`; better contrast.
  C) Shift `--accent-dim` lighter/darker per measured pairings. Cost: medium; risks contradicting the locked line 593 decision.

**Customize Q1 — Teal-only vs swatches**: Should Run 6.5 remove all non-teal swatches from CustomizeModal, or show a disabled "future themes" preview?
  A) Teal-only, no swatches. Cost: low; exactly matches locked single-theme scope.
  B) Teal swatch only, read-only. Cost: low-medium; keeps visual affordance without theme choice.
  C) Keep prototype swatches disabled with labels. Cost: medium; risks re-litigating Vampyr/multi-theme.

**Activity Placement Q1 — Right/off only**: Current code and prototype support left/right/hidden, but settled Run 6.5 scope says right-side or off. Should left be removed now?
  A) Remove left from UI, keep type internally until later cleanup. Cost: low; minimizes blast radius.
  B) Remove left from UI and types/selectors. Cost: medium; cleaner but more tests.
  C) Keep left visible. Cost: low; contradicts the active direction.

**Specify Q1 — Real scroll gate now or visual-only**: Should Run 6.5 implement the design's actual read-progress calculation, or only restyle the existing "Scroll review gate is enabled" hint?
  A) Implement real scroll progress. Cost: medium-high; logic change triggers TDD; closest design.
  B) Visual-only restyle of current hint. Cost: low; avoids logic; weaker fidelity.
  C) Add progress bar but leave unlock behavior unchanged. Cost: medium; visually close but semantically confusing.

**Titlebar Q1 — Dropdown behavior**: Should Run 6.5 port the design's click-outside dropdown behavior for repo/branch/auth/model menus?
  A) Yes, component-local state and click-outside hooks. Cost: medium; no Redux slice; needs tests for keyboard/click behavior.
  B) Visual static chips only. Cost: low; safer for Phase A/B, but not actually usable.
  C) Use native selects/menus behind chip styling. Cost: medium; accessibility easier, fidelity lower.

**About Q1 — Build metadata source**: What should populate version/build SHA/license in AboutModal?
  A) Static placeholders for Run 6.5. Cost: low; avoids build plumbing; less useful.
  B) Existing package/version plus current git SHA injected at build time. Cost: medium; may touch build config.
  C) Version only now, SHA/license deferred. Cost: low-medium; keeps scope tight.

**Markdown Q1 — Restyle only boundary**: How strict is "no engine swap" for missing markdown features like tables/blockquotes?
  A) Strict CSS-only restyle of current output. Cost: low; no parser logic; missing table/blockquote fidelity remains.
  B) Add small renderer cases to current hand-rolled renderer. Cost: medium; new logic requires TDD.
  C) Defer all Markdown changes except container chrome. Cost: low; least fidelity.

**PixelCSpinner Q1 — Dependency churn risk**: The shipped spinner effect depends on `pixelation` and `speed`, which can restart drawing on every smooth progress update (`src/renderer/components/PixelCSpinner.tsx:22`). Should Run 6.5 stabilize this while restyling ActivityPill/JIRA visuals?
  A) Fix spinner loop refs now with tests. Cost: medium; logic change but prevents visible flashing.
  B) Avoid smooth changing props in Run 6.5. Cost: low; visual less dynamic.
  C) Leave as-is until JIRA run. Cost: low now; likely visual bug later.

**Screenshot Gates Q1 — Golden scope**: Should screenshot regression tests target full windows or isolated surfaces?
  A) Isolated surface fixtures. Cost: medium; stable, easier diagnosis.
  B) Full-window screenshots only. Cost: low-medium; catches layout integration; more brittle.
  C) Both one smoke full-window plus isolated critical surfaces. Cost: high; strongest signal.

## Section 5: Risks

**Contrast failures from palette swap**: The roadmap locks teal `#3a7e9a` and dim `#132f3b` (`ROADMAP_DECISIONS.md:592`), but the design CSS frequently uses `--accent`, `--accent-dim`, and `--accent-bg` interchangeably for text, borders, fills, and glows (`design/v3-fetch/project/styles.css:217`, `design/v3-fetch/project/styles.css:218`, `design/v3-fetch/project/styles.css:3062`). If `--accent-dim` becomes text or the background behind teal text, axe failures are likely. Treat dim as border/background only and add `--accent-text` if needed.

**Rendered-DOM-change regressions**: Existing tests may rely on roles and visible text from simple components. The Stepper currently renders buttons with `role="tab"`, `aria-selected`, `disabled`, and `data-testid` (`src/renderer/components/Stepper.tsx:18`). Replacing those with divs to match the prototype would regress accessibility and tests. Port the orb design onto semantic buttons/tabs.

**Implicit overrides in the 80-line CSS**: The shipped stylesheet has broad global button/input/textarea/select rules, `.screen`, `.hero-card`, `.workspace`, `.modal`, and `.proof-badges` (`src/renderer/styles/index.css:22`, `src/renderer/styles/index.css:33`, `src/renderer/styles/index.css:41`, `src/renderer/styles/index.css:67`). A full design port can accidentally drop baseline sizing, disabled states, modal z-index, or hidden proof badges. Preserve or intentionally replace each broad selector.

**Logic touched by visual fidelity**: Specify scroll progress requires `useRef`, `onScroll`, and progress state like the prototype (`design/v3-fetch/project/steps.jsx:6`, `design/v3-fetch/project/steps.jsx:10`). Activity auto-scroll uses an effect on log length (`design/v3-fetch/project/activity.jsx:4`, `design/v3-fetch/project/activity.jsx:6`). ActivityPill speed derivation uses refs/effects (`design/v3-fetch/project/activity-pill.jsx:7`, `design/v3-fetch/project/activity-pill.jsx:10`). Customize focus management already uses an effect (`src/renderer/components/CustomizeModal.tsx:15`). Any behavior beyond pure class/markup changes triggers TDD under the constitution (`.specify/memory/constitution.md:566`).

**Pure/Effect and slice boundaries**: New animation/hover/open state must remain component-local or CSS-only. The constitution says renderer state uses Redux slices but new slices are not free-form, and workflow changes need impact notes (`.specify/memory/constitution.md:181`, `.specify/memory/constitution.md:601`). Run 6.5 should not add a ninth slice for visual behavior.

**FR-041 / no new dependency drift**: The design uses custom inline SVG icons and hand CSS, so no package is needed. Accidental dependency temptation points are icon libraries, markdown renderer swaps, focus-trap/dialog helpers, tooltip libraries, color/contrast packages, and animation libraries. Avoid all of them; use existing React, CSS, and current tests.

**Prototype inline styles leaking into production**: The design bundle contains inline styles in several places, such as flex spacers, modal width, and progress widths (`design/v3-fetch/project/steps.jsx:43`, `design/v3-fetch/project/steps.jsx:158`, `design/v3-fetch/project/steps.jsx:172`). Run 6.5 explicitly wants no inline color/radius/shadow/spacing values in JSX; dynamic widths may need CSS variables or carefully scoped style exceptions if unavoidable.

**Current order mismatch**: The prototype step order is Specify, Clarify, Plan, Analyze, Tasks, Review (`design/v3-fetch/project/app.jsx:3`), but shipped `stepOrder` is Specify, Clarify, Plan, Tasks, Analyze, Review (`src/renderer/components/Stepper.tsx:10`). If Run 6.5 only restyles, do not silently change process order; if this is a bug, it is logic and acceptance-scope work.

## Section 6: Cost Estimate

The user's 35-50 Premium-run estimate for the full port is plausible, but after reading the files I would calibrate Run 6.5 Phase 2 at **28-44 Premium runs** if tightly managed, or **35-52** if real scroll-gate behavior, click-outside menus, spinner stabilization, and robust screenshot fixtures are all included.

**Phase A — Token foundation: 8-13 Premium runs.** Token/CSS foundation is more than a variable swap because the current stylesheet is only 80 LOC and the design stylesheet is 3,646 LOC (`src/renderer/styles/index.css:1`, `design/v3-fetch/project/styles.css:1`). Expect 3-5 runs for tokens/base controls/modals, 3-5 for replacing inline values and broad CSS selectors safely, and 2-3 for the icon library.

**Phase B — Per-surface visual port: 15-23 Premium runs.** AppShell, Titlebar, Stepper, SignIn, RepoBrowse, Specify, Activity, ActivityPill, Customize, About, Request stub, and Markdown can be grouped, but Stepper/Titlebar/Specify/Activity are high attention. Estimate 2-3 runs each for Titlebar, Stepper, Specify, and Activity; 1-2 each for SignIn, RepoBrowse, Customize, Markdown, ActivityPill; 0.5-1 each for About and Request stub.

**Phase C — Acceptance gates: 5-8 Premium runs.** Screenshot regression fixtures, manual verification doc, and axe reruns need their own stabilization loop. If DOM roles remain stable and tests use accessible selectors as required (`.specify/memory/constitution.md:572`), this stays closer to 5. If screenshots are full-window and animation-sensitive, budget closer to 8.

The biggest cost reducers are: keep teal-only, do not port RequestModal functionality, avoid Markdown engine changes, preserve semantic roles while restyling, and treat animation as CSS-only with reduced-motion fallbacks.
