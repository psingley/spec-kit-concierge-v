**Historical provenance note:** This file preserves the original prompt for provenance. Implementation follows spec.md + plan.md + tasks.md (current); see spec.md for current font choice (npm @fontsource/*) — Google Fonts CDN references below are from the original prompt and are superseded.

# /speckit.specify input — Run 6: Specify Vertical

> Passed to /speckit.specify via copilot --model gpt-5.5 --effort high.
> All 11 grill questions resolved in `specs/0006-specify-vertical/grill.md`.

---

## Spec subject

Build Run 6 (Specify Vertical) of the Concierge Electron desktop app.
This is the FIRST user-facing vertical slice — the first run where
users see Concierge actually working end-to-end. After Run 6, the
user can: launch the app, sign into GitHub + Copilot CLI (Atlassian
stubbed for Run 11), pick a repo, start a new session, type a specify
prompt, click Begin, watch the Specify pipeline run, view the
rendered spec.md.

Runs 2-5 are complete on main. Run 6 wires their primitives into a
working UI for the FIRST time.

**Design source of truth:** `design/v3-fetch/project/` — the v3
design bundle. Port `Spec-kit Concierge.html` and its 12 imported
.jsx files + styles.css + Google Fonts (Geist + Geist Mono) into our
React + TypeScript + Redux Toolkit renderer.

## Constitutional grounding

- Constitution v1.0.4 (unchanged in Run 6).
- 8 slices per constitution VI (`ui`, `preferences`, `auth`,
  `workspace`, `steps`, `session`, `activity`, `copilot`).
- Pocock TDD vertical tracer bullets per `.agents/skills/tdd/SKILL.md`.
- ROADMAP_DECISIONS lines 82-90 (Run 6 scope).
- Design v3 (`design/v3-fetch/project/`) is canonical for renderer
  shape, styling, interaction patterns, component inventory.

## Tech-stack delta from Run 5

NEW runtime dependencies:
- Google Fonts: Geist + Geist Mono (loaded via `<link>` in index.html
  per design)
- Geist fonts can ship via npm `@fontsource/geist-sans` +
  `@fontsource/geist-mono` for offline reliability (preferred) OR the
  CDN link (matches design exactly). Pick the npm route to keep the
  app offline-capable.

NEW deps in package.json:
- `@fontsource/geist-sans` (latest stable)
- `@fontsource/geist-mono` (latest stable)

No other new deps. Markdown rendering is via the design's existing
`md.jsx` helper (`renderMarkdown` — ported as `src/renderer/components/Markdown.tsx`),
not a new library.

## Locked decisions from grill (specs/0006-specify-vertical/grill.md)

### Q1 — Component inventory (locked from design import graph)

IN scope for Run 6: App shell, Titlebar (Auth/Repo/Branch/Model/Gear
chips), SignInScreen (3 prereq rows, gh+copilot required), RepoBrowseScreen
+ BranchPickerView, Stepper (6 steps shown, only Specify unlocked
visually), SpecifyStep (3 phases), Activity, ActivityPill, PixelCSpinner,
CustomizeModal, AboutModal, RequestModal, Icons, Markdown helper,
data seeds (mapped to real IPC sources where possible).

OUT of scope (placeholder-rendered): ClarifyStep body, StatusStep
body, FinalStep body, ArtifactViewer, TaskViewer, JiraSyncedSplash.

### Q2 — Auth gate (user decision: "b" — soften)

Require GitHub + Copilot to enter workspace. Atlassian stays as
visible row in SignInScreen and titlebar AuthChip, but doesn't gate
workspace entry. Real Atlassian OAuth lands in Run 11; Run 6 ships a
visual stub.

### Q3 — Specify pipeline wiring

`SpecifyStep.onBegin` → `specifyApi.runSpecify({prompt})` → IPC
`copilot:specify` (streaming mutation, NEW) → dispatcher routes to
`before_specify` → in-flight marker + step-pending → ACP session/new
+ session/prompt → ACP stream → after_specify → `specify.factory.ts`
validation → `commitWithTrailer` → marker removal → step-complete →
renderer sees spec.md viewer.

9 new IPC channels total:
- `copilot:specify` (streaming mutation; emits info/ok/err during
  run, one `done` event at end with spec.md contents + commit SHA)
- `auth:gh:login` (mutation, wraps `gh auth login --web`)
- `auth:copilot:login` (mutation, wraps `gh copilot auth`)
- `auth:atlassian:login` (STUB in Run 6; channel exists but no real
  OAuth — flips state to "ok" after 200ms; real OAuth in Run 11)
- `repos:list` (query, wraps `gh repo list collette-travel --json
  name,defaultBranchRef,pushedAt,diskUsage,primaryLanguage`)
- `branches:sessions` (query for given repo, lists `spec/*` branches
  with their step state via Run 2 trailers reader)
- `git:checkout` (mutation, wraps `git checkout`)
- `git:createDraft` (mutation, creates `spec/draft-<slug>` branch)
- `artifacts:read` (query, returns text + size + mtime for a feature
  dir path)

Each new handler: trust-boundary factory (Run 2-3 pattern), structured
pino log per invocation (Run 4 + Run 5 PINO DISCIPLINE rider),
co-located test, renderer-entry factory (constitution IV double trust
boundary).

Produces ADR-0010 ("Streaming mutation pattern for spec-kit step
pipelines") during Plan step.

### Q4 — CSS architecture

Single monolithic stylesheet at `src/renderer/styles/index.css`,
imported from `src/renderer/index.tsx`. Port the design's
`styles.css` (3309 lines) verbatim. Match the design's
single-stylesheet pattern.

### Q5 — JSX → TSX port

Port file-by-file with strict TS types. Component naming:
`src/renderer/components/<ComponentName>.tsx`. Group only when
components share private helpers (Titlebar.tsx consolidates the
chip family with their shared `useClickOutside` hook).

### Q6 — Smart vs Dumb split

Smart containers: `SignInScreenContainer`, `RepoBrowseScreenContainer`,
`WorkspaceContainer`, `SpecifyStepContainer`, `TitlebarContainer`,
`ActivityRailContainer`, `ActivityPillContainer`, `CustomizeModalContainer`.

Dumb components: every other component listed in grill Q6. Props-only,
zero store access.

### Q7 — PixelCSpinner

Ship verbatim canvas-based generative spinner per design's
`pixel-c-spinner.jsx`. ~140 lines TSX. Step-derived pixelation gives
visual progress signal; log-rate-driven speed gives "feel the work
happening" diegesis.

### Q8 — CustomizeModal

Ship verbatim per design's `customize-modal.jsx`. Accent picker (6
swatches), density (compact/regular/comfy), activity-stream position
(left/right/hidden), "require scroll" toggle. Accessed via gear menu
→ "Customize" item. All settings persist to
`<userData>/preferences.json` via Run 2's safeWrite, triggered by
`preferencesPersistence.listener.ts` (Run 4 empty body — Run 6 fills).

### Q9 — Sample prompt seed

Empty textarea on first launch. Drop the design's `SAMPLE_PROMPT`
seed. Placeholder text only: "What do you want to build today?"

### Q10 — TDD first tracer bullet

Playwright e2e test at `e2e/specify-vertical.spec.ts`:

> Given a fresh user, when they: sign into GitHub + Copilot (mocking
> the underlying shell-out for test determinism), pick a repo from the
> workspace, type "Build a hello-world feature" in the SpecifyStep
> textarea, click "Begin specify", wait for the Specify pipeline to
> complete, then: (a) `git log -1 --format=%B` on the active branch
> shows a `Concierge-Step: specify:pass` trailer, (b) the rendered
> spec.md viewer shows non-empty markdown, (c) the stepper shows
> specify=complete and clarify=pending.

This is THE first test. Cascade vertical slices from there.

### Q11 — Cost lever

User decision: gpt-5.5 high for full pipeline (despite Run 6 being
decompression-shaped — user's explicit "55" call). Cost projection
~60-75 Premium.

## Run 6 deliverables (in dependency order)

1. **Font deps:** add `@fontsource/geist-sans` + `@fontsource/geist-mono`
   to package.json dependencies.

2. **`src/renderer/styles/index.css`** — port `design/v3-fetch/project/styles.css`
   verbatim (3309 lines).

3. **`src/renderer/components/Icons.tsx`** — port `icons.jsx` Ico
   namespace (30+ inline SVG components).

4. **`src/renderer/components/Markdown.tsx`** — port `md.jsx`
   `renderMarkdown` helper.

5. **`src/renderer/components/PixelCSpinner.tsx`** — port
   `pixel-c-spinner.jsx` canvas spinner.

6. **`src/renderer/components/SignInScreen.tsx` + `SignInScreenContainer.tsx`**
   — dumb component (3 rows: gh, copilot, atlassian) + smart
   container reading auth slice + dispatching login mutations.

7. **`src/renderer/components/RepoBrowseScreen.tsx` +
   `BranchPickerView.tsx` + their containers** — repo picker flow
   reading reposApi + branchesApi.

8. **`src/renderer/components/Titlebar.tsx`** — consolidates
   AuthChip, RepoChip, BranchChip, ModelPicker, GearMenu with shared
   `useClickOutside`. Plus AboutModal + RequestModal (modal renders
   outside titlebar but is wired here).

9. **`src/renderer/components/Stepper.tsx`** — extracted from
   app.jsx's inline JSX. Renders 6 steps with orb visuals, mode
   badges, read-only state for steps < maxStep.

10. **`src/renderer/components/SpecifyStep.tsx` + container** — 3-phase
    component:
    - Phase 1 (not started): prompt textarea + Begin button
    - Phase 2 (running): spinner + "Specifying..." copy
    - Phase 3 (complete): spec.md viewer with Preview/Edit modes +
      scroll-progress gate + popped-out editor modal
    - Smart container reads session.prompt + session.specMd +
      steps.specify + dispatches specifyApi.runSpecify
      + session/setPrompt

11. **`src/renderer/components/Activity.tsx` + container** — activity
    rail (left/right/hidden positions per preferences slice).

12. **`src/renderer/components/ActivityPill.tsx` + container** — toggle
    pill with PixelCSpinner. Speed/pixelation per design.

13. **`src/renderer/components/CustomizeModal.tsx` + container** —
    accent picker, density, activity position, scroll-unlock toggle.

14. **`src/renderer/components/AboutModal.tsx`** — about modal (props
    only).

15. **`src/renderer/components/RequestModal.tsx`** — bug-report modal
    UI scaffold only.

16. **`src/renderer/App.tsx`** — root component composing all of the
    above. Replaces Run 4's proof-only `src/renderer/index.tsx`
    proof-div. Provider mount stays in `index.tsx`; App.tsx is the
    smart workspace orchestrator.

17. **Auth slice extension** at `src/renderer/slices/auth.ts` — Run 4
    has `{copilotLoggedIn, githubLoggedIn}`. Run 6 expands to design
    shape: `{gh: 'unknown'|'out'|'starting'|'ok'|'error', copilot:
    'unknown'|'out'|'starting'|'locked'|'ok'|'error', atlassian:
    'unknown'|'out'|'starting'|'ok'|'error', identity: {username,
    avatarUrl}, lastError}`.

18. **Workspace slice extension** — Run 4's
    `{activeRepoPath, agents, branch, ahead, behind, dirty}` gets:
    `{step: StepName | null, maxStep: StepName | null, viewing:
    StepName | null}` added.

19. **Session slice extension** — Run 4 has session as empty. Run 6
    fills with `{prompt: string, started: boolean, specMd: string,
    specScrollProgress: 0-100, clarify: {answers: {}, extraQuestions:
    []}, pipelines: {plan, analyze, tasks: empty placeholders for
    Run 7-9}}`.

20. **Preferences slice extension** — Run 4 has `{hydratedFromDisk:
    false, theme: 'system'}`. Run 6 adds: `{accent: [string, string],
    density: 'compact'|'regular'|'comfy', activitySide: 'left'|'right'|'hidden',
    requireScrollToUnlock: boolean, lastUsedRepos: [{repo, at}], copilotModel:
    string}`.

21. **Activity slice extension** — Run 4 has `{entries, cap: 256}`.
    Run 6 keeps the cap at 256 (NOT design's 2000) per Run 4 grill
    decision. Adds `current: string` (HTML status line) and `busy:
    boolean`.

22. **9 new IPC handlers** under `src/main/ipc/`:
    - `specify.ts` (streaming mutation `copilot:specify` —
      orchestrates Run 5 dispatcher invocation; emits events back to
      renderer via `event.sender.send(channel, payload)`)
    - `authGh.ts` (`auth:gh:login` shell-out)
    - `authCopilot.ts` (`auth:copilot:login` shell-out)
    - `authAtlassian.ts` (`auth:atlassian:login` STUB in Run 6)
    - `repos.ts` (`repos:list` wraps gh CLI)
    - `branches.ts` (`branches:sessions` reads Run 2 trailers)
    - `gitCheckout.ts` (`git:checkout` mutation)
    - `gitCreateDraft.ts` (`git:createDraft` mutation)
    - `artifacts.ts` (`artifacts:read` query)

    Each ships with: factory at IPC entry, structured pino log,
    co-located test, renderer-entry factory at preload bridge exit
    (constitution IV double trust boundary).

23. **Preload bridge extension** at `src/preload/index.ts` — exposes
    the 9 new channels via `electronAPI.invoke` and
    `electronAPI.subscribe` (the streaming pattern for `copilot:specify`).

24. **Renderer API slice extensions** at `src/renderer/api/index.ts` —
    add new RTK Query endpoints: `runSpecify` (streaming mutation),
    `loginGh`/`loginCopilot`/`loginAtlassian` mutations,
    `listOrgRepos`/`listSessions` queries, `checkout`/`createDraft`
    mutations, `readArtifact` query.

25. **Listener middleware bodies filled** at
    `src/renderer/listeners/`:
    - `preferencesPersistence.listener.ts` — debounced (250ms) write
      via existing Run 4 `preferences:write` IPC handler (NOT a new
      channel; reuses the established preferences-persist contract).
      Run 4 empty → Run 6 fills.
    - The remaining 3 listener bodies stay empty until their
      dispatching runs land (Runs 7-9). For accounting: of 6 listener
      middleware files, Run 5 filled stepLifecycle.listener.ts +
      transcriptCapture.listener.ts; Run 6 fills
      preferencesPersistence.listener.ts; remaining empty bodies:
      acpStreamSubscription, sessionLifecycle, workspaceChange.

26. **ADR-0010** at `docs/adr/0010-streaming-mutation-pattern.md` —
    documents the streaming-mutation pattern for spec-kit step
    pipelines (Run 6 first use; Runs 7-9 will copy).

27. **`.github/copilot-instructions.md`** — Run 6 conventions block:
    component file naming, smart/dumb split, single CSS file,
    canvas-spinner pattern, font deps, IPC channel naming for step
    pipelines.

28. **`e2e/specify-vertical.spec.ts`** — first vertical tracer bullet
    test per Q10.

29. **Final verification tasks** extending Run 4-5 T-series pattern.

## Acceptance criteria

- `npm run lint` exit 0
- `npm run typecheck` exit 0
- `npm run test:coverage` exit 0; test count grows substantially
  above Run 5's 513. Approximate floor: 700+ (Run 6 adds ~50 component
  tests + ~30 container tests + ~50 IPC handler/factory tests + ~30
  endpoint/factory tests + 1 e2e).
- `npm run e2e` exit 0; the new `specify-vertical.spec.ts` passes
  AND the existing `smoke.spec.ts` still passes.
- `npm run dev` launches the app; user sees the SignInScreen on
  first run; clicking through GitHub + Copilot enters the
  RepoBrowseScreen; picking a repo enters the workspace with the
  6-step stepper visible and SpecifyStep in the prompt-input phase;
  typing a prompt + clicking Begin runs the real Specify pipeline
  via the real ACP supervisor, eventually showing the rendered
  spec.md.
- Constitution VI satisfied: 8 slices, all extended per Run 6 needs;
  no 9th slice introduced.
- Constitution V satisfied: every Effect lives in a named file;
  ESLint Pure/Effect boundary holds.
- All 9 new IPC handlers ship with double trust boundary factories +
  structured pino logging.
- Run 5's stepLifecycle + transcriptCapture listener bodies remain
  intact; Run 6 only fills `preferencesPersistence` body among the
  6.
- The first vertical tracer bullet test (Q10) is the FIRST test
  written by /speckit.implement.

## What this run does NOT introduce

- NO ClarifyStep body (Run 7 — placeholder rendered)
- NO StatusStep body for Plan/Analyze/Tasks (Run 8 — placeholder)
- NO FinalStep body or JiraSyncedSplash (Run 9 — placeholder)
- NO ArtifactViewer or TaskViewer modals (Runs 8-9)
- NO real Atlassian MCP integration (Run 11; Run 6 ships visual
  stub)
- NO HTTP server (Run 10)
- NO JIRA submission (Run 12)
- NO Windows packaging changes (Run 13)
- NO 9th slice `org` (constitution VI lock)
- NO change to activity ring buffer cap (stays 256 per Run 4 grill)

## Rationale for any deviation

If /speckit.specify finds a deliverable above that it believes should
be deferred or split, it MUST flag the deviation explicitly in
spec.md under a "Deviations from grill" section. The grill is the
source of truth.

The v3 design at `design/v3-fetch/project/` is canonical for renderer
shape; deviations from the design require explicit user re-approval.
