# Grill — Run 6: Specify Vertical

> Grill-with-docs session per Principle XVI. Resolves ambiguities in
> ROADMAP_DECISIONS Run 6 scope (lines 82-90) before `/speckit.specify`
> is invoked. Format mirrors `specs/0005-step-lifecycle-hooks/grill.md`.

**Scope (from ROADMAP_DECISIONS lines 82-90):**
> The user can: launch the app, sign into the three prerequisites,
> pick a repo, start a new session, type a specify prompt, click
> Begin, watch the Specify pipeline run, view the rendered spec.md.
> This slice exercises everything from auth UI → renderer → IPC →
> ACP → Step Lifecycle → factory → Step Commit.
> Depends on 3, 4, 5. Highest-value slice — first proof of
> integration. Blocks 7 from going first.

**Design source of truth:** `design/v3-fetch/project/` (the v3 design
bundle fetched 2026-05-27 from the user's Claude Design URL). The
canonical entry is `Spec-kit Concierge.html` which imports 12 .jsx
files + styles.css (3309 lines) + Google Fonts (Geist + Geist Mono).

**Constitutional state (locked, no relitigation):**
- 8 slices per constitution VI (`ui`, `preferences`, `auth`,
  `workspace`, `steps`, `session`, `activity`, `copilot`). Design's
  v2 CONSTITUTION.md proposing `org` as a 9th slice is STALE — we
  use our 8.
- Step ordering per spec-kit canonical: `specify → clarify → plan →
  tasks → analyze → review`. Design's `specify → clarify → plan →
  analyze → tasks → final` is a UI-label variant — `final` is our
  `review`, and the design's `plan → analyze → tasks` UI ordering is
  cosmetic. The HOOKS dispatcher still runs spec-kit canonical
  ordering under the hood; the renderer can DISPLAY a different
  visual progression if needed, but for Run 6 we adopt the spec-kit
  canonical visual order too.
- Activity ring buffer cap = 256 per Run 4 grill Q3 (NOT design's
  ~2000 suggestion).
- 3-state monotonic machine from ADR-0008.

**Inherited infra from Runs 2-5 (do NOT redo):**
- Run 2: data-layer (fs/git/agents/logging), pino, RTK Query baseQuery
- Run 3: ACP supervisor (Copilot bound CLI, transcripts, capabilities)
- Run 4: 8 typed slices, 6 listener middleware (empty bodies except
  stepLifecycle + transcriptCapture filled in Run 5), 9 IPC handlers
  + double trust boundary factories, RTK Query 8 tagTypes, store.ts +
  Provider mounted in renderer
- Run 5: 12 hooks + dispatcher + drift verifier, 6 Step Contract
  factories, Step Commit writer, in-flight marker primitives, hang
  detection (20 min), Clarify Re-ask wiring

---

## Q1 — Component inventory from design (locked)

**Question:** Which design components are IN scope for Run 6?

**Answer:** Run 6 implements EVERY component required to support the
Specify step end-to-end. Per the design bundle's import graph:

**IN SCOPE for Run 6 (Specify Vertical):**

- **App shell** (`app.jsx`) — `App` component with titlebar + workspace
  + activity rail + Customize modal + About modal + bug-report
  modal. The 6-step `STEPS` array + `ModeBadge` + `stepIndex`/
  `maxStepIndex` logic. The `handleResume` + `jumpToStep` plumbing
  (specify path only; clarify/plan/analyze/tasks/final paths exist
  as stubs that say "Not in Run 6 — see Run 7-9").
- **Titlebar** (`topbar.jsx`) — `AuthChip`, `RepoChip`, `BranchChip`,
  `ModelPicker`, `GearMenu`, `AboutModal`. The `useClickOutside`
  hook. All 6 dropdown menu components.
- **Sign-in** (`signin.jsx`) — `SignInScreen` with 3 prerequisite
  rows (GitHub, Copilot, Atlassian). Per v3 design line 386, the
  workspace gate is `auth.gh === "ok" && auth.copilot === "ok" &&
  auth.atlassian === "ok"` — ALL THREE required.
- **Repo picker** (`repo-browse.jsx`) — `RepoBrowseScreen` + nested
  `BranchPickerView`. Recent/All filtering with search box.
- **Specify step** (`steps.jsx`) — `SpecifyStep` (the only step
  component fully implemented in Run 6). The 3 phases: not-started
  prompt input, running spinner, complete spec.md viewer with
  preview/edit modes + scroll-progress gate + popped-out editor
  modal. NOTE: `steps.jsx` ALSO defines `ClarifyStep`, `StatusStep`,
  `FinalStep`, `ArtifactViewer`, `TaskViewer`, `JiraSyncedSplash` —
  those are placeholder-rendered as "Run 7-9 not implemented" in
  Run 6.
- **Markdown** (`md.jsx`) — `renderMarkdown` helper for rendering
  spec.md.
- **Activity rail** (`activity.jsx`) — `Activity` component (left/
  right/hidden positions per preferences slice).
- **Activity pill** (`activity-pill.jsx`) — `ActivityPill` toggle
  with pixel-C spinner. Replaces the v2 bare terminal-icon toggle.
- **Pixel-C spinner** (`pixel-c-spinner.jsx`) — Reusable canvas
  spinner. Used in ActivityPill (size 9, cell 2). Larger version
  for JIRA sync hero is Run 9 scope.
- **Customize modal** (`customize-modal.jsx`) — Accent picker (6
  swatches), density segmented control, activity-stream position
  segmented control, "require scroll" toggle. Replaces v2's
  floating TweaksPanel.
- **Bug-report modal** (`request-modal.jsx`) — `RequestModal`. UI
  scaffold only in Run 6; actual `concierge:report` IPC channel is
  Run 11 scope.
- **Icons** (`icons.jsx`) — `Ico.*` namespace with 30+ icon
  components. Inline SVG; no font dependency.
- **Data seeds** (`data.jsx`) — `REPOS`, `BRANCHES`, `SAMPLE_PROMPT`,
  `INITIAL_LOG`, `COPILOT_MODELS`, etc. Run 6 reads these from
  actual data sources where they exist (REPOS from `repos:list` Run
  4 handler; COPILOT_MODELS from `copilot:probeBoundCLI` Run 3) and
  uses static defaults for the rest in Run 6.
- **Styles** (`styles.css`) — All 3309 lines adopted verbatim. Run
  6 ports to `src/renderer/styles/index.css` (or split into
  per-component CSS modules — see Q4).
- **Fonts** — Geist + Geist Mono via Google Fonts CDN per design's
  HTML head.

**OUT of scope for Run 6 (deferred to Runs 7-9):**

- `ClarifyStep` body (Run 7)
- `StatusStep` body for Plan/Analyze/Tasks (Run 8)
- `FinalStep` body + `JiraSyncedSplash` (Run 9)
- `ArtifactViewer` modal (Run 8 or 9 depending on plan-viewer reuse)
- `TaskViewer` modal (Run 9)

**Out of scope but stubbed for hand-off:** The non-Specify step
components render a placeholder like "This step ships in Run N — see
specs/0007-*-vertical/spec.md" so the navigation never breaks.

**Reasoning:** Run 6's contract is "FIRST end-to-end integration
proof." The bar is the user can click Begin and watch spec.md
materialize on disk with a Concierge-Step trailer commit. Everything
else is plumbing for that journey.

**ADR candidate?** No (mechanical translation of the design import
graph against the ROADMAP scope).

---

## Q2 — Auth gate semantics (user decision 2026-05-27: "b" — soften gate)

**Question:** v3 design line 386 mandates all 3 (gh + copilot +
atlassian) to enter the workspace. But Runs 2-5 have zero Atlassian
integration; Run 11 is where Atlassian MCP lives.

**User decision (2026-05-27):** "b" — soften gate. Require GitHub +
Copilot to enter workspace. Atlassian is a per-step prerequisite that
only blocks JIRA sync (Runs 9 / 12). The titlebar AuthChip still
shows Atlassian status; just doesn't gate workspace entry.

**Implementation:** Run 6 wires `selectAuthGateOpen` to check only
gh + copilot:
```ts
export const selectAuthGateOpen = (state: RootState) =>
  state.auth.gh === 'ok' && state.auth.copilot === 'ok';
```
The SignInScreen still shows all 3 rows (per v3 design) so the user
can connect Atlassian early if they want. The "Connect" button for
Atlassian works (shows as Connected in titlebar AuthChip + Activity
log) but unconnected Atlassian does NOT block workspace entry.

**Locked sub-decisions:**
- GitHub login: real IPC call to `auth:gh:login` (NEW Run 6 channel;
  wires `gh auth login --web` shell-out)
- Copilot login: real IPC call to `auth:copilot:login` (NEW Run 6
  channel; wires `gh copilot auth` shell-out)
- Atlassian login: STUB in Run 6 — `auth:atlassian:login` channel
  exists, button works visually (flips state to "starting" → "ok"
  after 200ms simulated delay), but doesn't hit real OAuth. Real
  Atlassian MCP integration lands in Run 11. Button text in Run 6
  signin row reads "Connect (mock — real OAuth in Run 11)" to
  prevent user confusion.
- Hierarchical dependency: GitHub must succeed before Copilot button
  is enabled (signin.jsx line 76 `disabled={!ghOk}`). Atlassian is
  independent.

**Reasoning per user decision:**
- The Specify step doesn't need Atlassian. Atlassian only matters at
  JIRA sync (Run 9 / 12).
- v3 design's hard-gate was aspirational; v2 design was right that
  gh + copilot is enough for the workspace.
- Forcing Atlassian on Run 6 adds friction without value.

**ADR candidate?** Maybe — the deferred-prerequisite pattern (a
constitutional prereq from VII that's STUBBED at the IPC layer until
its owning run lands) is a generalizable pattern. Defer ADR to Run
11 when the stub is replaced with the real implementation.

---

## Q3 — Specify pipeline wiring (the load-bearing seam of Run 6)

**Question:** When the user clicks "Begin" in `SpecifyStep`, what
happens end-to-end?

**Answer:** Six layers fire in sequence:

1. **Renderer dispatch.** SpecifyStep's `onBegin` callback dispatches
   an RTK Query mutation `specifyApi.runSpecify({prompt})`. Pessimistic
   UI state transitions to `started=true, complete=false, busy=true`.
2. **IPC bridge.** `runSpecify` mutation invokes preload bridge
   `window.electronAPI.invoke('copilot:specify', {prompt, repo,
   branch})`. This is a NEW IPC channel in Run 6 (Run 4 handlers
   were workspace/git/steps/preferences/auth/session/activity reads
   only; Run 6 adds the streaming `copilot:specify` mutation).
3. **Main process dispatcher.** `src/main/hooks/dispatcher.ts`
   (Run 5) routes the `copilot:specify` invocation to the
   `before_specify` hook from `.specify/extensions.yml` (Run 5).
4. **before_specify hook.** Validates prerequisites (auth + workspace
   per R5-C02 + prior Concierge-Step trailer history). On pass,
   writes in-flight marker (Run 5 inFlightMarker) and emits
   `step-pending` event. Returns `{state: 'pending'}`.
5. **ACP session.** Run 3's `BoundCLISupervisor` starts a new ACP
   session via `session/new`, then dispatches the user's prompt as
   a `session/prompt` request. ACP stream events flow back; Run 5's
   `transcriptCapture.listener.ts` writes each event to the
   sanitized JSONL transcript + appends to the activity slice.
6. **after_specify hook.** When ACP stream returns `done`, runs the
   `specify.factory.ts` (Run 5) against the on-disk spec.md.
   - On factory success: calls `commitWithTrailer('specify', 'pass',
     ['spec.md'])` (Run 5 git extension), removes in-flight marker,
     emits `step-commit-written` + `step-complete` events, dispatches
     `steps/complete` to the renderer slice.
   - On factory failure: dispatches the Step Escape Hatch (Run 5)
     with reason `factory-rejection`, reverts the partial spec.md
     via `git checkout HEAD --`, resets `steps` slice to
     `not_available`.

When the renderer sees `steps.specify === 'complete'` AND the
`getSpec.md` RTK Query has new content, SpecifyStep transitions to
the third phase (spec.md viewer).

**New IPC channels added in Run 6:**
- `copilot:specify` (streaming mutation; emits info/ok/err events
  during the run, one `done` event at the end carrying spec.md
  contents + commit SHA)
- `auth:gh:login` (mutation, shell-out to `gh auth login --web`)
- `auth:copilot:login` (mutation, shell-out to `gh copilot auth`)
- `auth:atlassian:login` (mutation, wires the OAuth flow via the
  concierge-jira extension's existing pattern)
- `repos:list` (query, `gh repo list collette-travel --json
  name,defaultBranchRef,pushedAt,diskUsage,primaryLanguage`)
- `branches:sessions` (query for a given repo, lists branches
  matching `spec/*` with their step state via Run 2 trailers
  reader)
- `git:checkout` (mutation, wraps `git checkout`)
- `git:createDraft` (mutation, creates `spec/draft-<slug>` branch
  per design's app.jsx line 155-157)
- `artifacts:read` (query, returns text + size + mtime for a given
  feature-dir path)

Total new IPC channels: 9. Run 6 adds 9 main IPC handlers + 9
renderer-entry factories (constitution IV double trust boundary per
Run 3 lesson).

**Reasoning:**
- This wires the full Run 2→3→4→5 stack into the user-visible flow
  for the FIRST time. The design's `runSpecifyPipeline` function
  in app.jsx lines 147-176 is a mock; Run 6 replaces it with the
  real RTK Query streaming mutation.
- Each new IPC channel ships with structured pino logging (Run 4 +
  Run 5 conventions).

**ADR candidate?** Probably yes — the streaming-mutation pattern
for `copilot:specify` is novel and Runs 7-9 will copy it. **→
Tentative ADR-0010 during Plan step: "Streaming mutation pattern for
spec-kit step pipelines."**

---

## Q4 — CSS architecture: monolith vs modules

**Question:** Design's `styles.css` is 3309 lines covering everything.
Port as one monolith OR split into per-component CSS modules?

**Answer:** Single CSS file at `src/renderer/styles/index.css`,
imported once from `src/renderer/index.tsx`. Match the design's
single-stylesheet pattern.

**Reasoning:**
- The design's classes use BEM-ish naming with no collisions
  (`signin-row`, `tb-chip`, `step-orb`, etc.). No need for CSS
  modules' scoping.
- 3309 lines is small enough to ship as one file (88KB unminified).
- Vite will bundle + minify regardless.
- Per-component CSS modules would require renaming every class
  reference in the .jsx → .tsx ports. Cost outweighs benefit for
  Run 6.
- Future runs CAN extract per-component CSS files if a component
  needs theming variants; not required for Run 6.

**ADR candidate?** No.

---

## Q5 — JSX → TSX porting strategy

**Question:** Design files are `.jsx` with no types. How do we port
to `.tsx` with strict TypeScript?

**Answer:** Port file-by-file, adding TypeScript types as we go. Each
ported component gets:
- Component-level Props type: `type SignInScreenProps = { auth:
  AuthState; setAuth: (next: AuthState) => void }`
- State types via `React.useState<T>(...)` where useful
- Hook types via `React.useRef<HTMLDivElement | null>(null)`
- Event handler types: `(e: React.ChangeEvent<HTMLInputElement>) =>
  void`

Run 4's existing renderer types (slice types, RTK Query types) are
the foundation. New types added by Run 6:
- `AuthState`, `AuthRowState`, `AuthLoginMethod`
- `RepoSummary`, `BranchSession`
- `ModelOption`
- `LogEntry` (the activity log's row shape)
- `StepName` (already exists from Run 5)
- `StepUiState` (the design's `done | active | wait | fail` per
  StatusStep row — Run 8 will use this; Run 6 just declares the
  type)

**Component file naming convention:**
- `src/renderer/components/SignInScreen.tsx`
- `src/renderer/components/RepoBrowseScreen.tsx`
- `src/renderer/components/Titlebar.tsx` (consolidates AuthChip,
  RepoChip, BranchChip, ModelPicker, GearMenu into one file since
  they all share `useClickOutside`)
- `src/renderer/components/SpecifyStep.tsx`
- `src/renderer/components/Activity.tsx`
- `src/renderer/components/ActivityPill.tsx`
- `src/renderer/components/PixelCSpinner.tsx`
- `src/renderer/components/CustomizeModal.tsx`
- `src/renderer/components/AboutModal.tsx`
- `src/renderer/components/RequestModal.tsx`
- `src/renderer/components/Icons.tsx` (exports `Ico` namespace)
- `src/renderer/components/Markdown.tsx` (exports `renderMarkdown`)
- `src/renderer/components/Stepper.tsx` (extracted from app.jsx's
  inline JSX since it's its own concern)

**Reasoning:**
- Single-file-per-component matches constitution V (effects in
  named files; pure components in named files too).
- Group only when components share private helpers (Titlebar group).

**ADR candidate?** No (mechanical naming).

---

## Q6 — Smart vs Dumb component split per constitution

**Question:** Which components are SMART (access store via typed
hooks) vs DUMB (props-only)?

**Answer:**

**SMART components** (use `useAppSelector`/`useAppDispatch`/RTK Query
hooks):
- `SignInScreenContainer` — reads auth slice + dispatches login
  mutations
- `RepoBrowseScreenContainer` — reads workspace + reposApi + branchesApi
- `WorkspaceContainer` (top-level smart container hosting the active
  step component) — reads workspace.step, dispatches step actions
- `SpecifyStepContainer` — reads session.prompt + session.specMd +
  steps.specify, dispatches `specifyApi.runSpecify` + `session/setPrompt`
- `TitlebarContainer` — reads auth + workspace + copilot slices,
  dispatches login/logout/setModel
- `ActivityRailContainer` — reads activity slice
- `ActivityPillContainer` — reads activity slice (for log-rate
  calculation in PixelCSpinner)
- `CustomizeModalContainer` — reads preferences slice + dispatches
  setTweak

**DUMB components** (pure, props-only):
- `SignInScreen` (props: `auth`, `onLogin`)
- `SignInRow` (props: `icon`, `title`, `sub`, `state`, `onClick`)
- `RepoBrowseScreen` (props: `repos`, `branches`, `recent`,
  `onPick`, `onResume`, `onNewSession`)
- `BranchPickerView` (props: `repo`, `branches`, `onBack`,
  `onResume`, `onNewSession`)
- `Stepper` (props: `steps`, `currentStep`, `maxStep`, `onJump`)
- `ModeBadge` (props: `mode`, `busy`)
- `SpecifyStep` (the existing 3-phase component — all props per
  design)
- `Activity` (props: `log`, `busy`, `current`, `onClear`)
- `ActivityPill` (props: `open`, `busy`, `log`, `step`, `maxStep`,
  `onToggle`)
- `PixelCSpinner` (props: `size`, `cell`, `pixelation`, `color`,
  `busy`, `speed`, `perfect`)
- `CustomizeModal` (props: `t`, `setTweak`, `onClose`)
- `AboutModal` (props: `model`, `repo`, `branch`, `onClose`)
- `RequestModal` (props: `onClose`)
- `AuthChip`, `RepoChip`, `BranchChip`, `ModelPicker`, `GearMenu`
  (props: state + callbacks)
- `Ico.*` (pure SVG)
- `renderMarkdown` (pure helper)

**Reasoning:**
- Smart containers are the ONLY components that touch the store.
  Dumb components receive everything via props.
- Constitution VII line ~404: "Smart components own data fetching
  (via RTK Query hooks), store access (via typed selectors),
  dispatch, workflow branching."
- Per role file #41 (PINO DISCIPLINE): every smart container that
  dispatches has tests mocking the dispatch + asserting it was
  called with expected payload.

**ADR candidate?** No (constitution VI consequence).

---

## Q7 — Activity pill PixelCSpinner: keep the canvas animation?

**Question:** The design's `PixelCSpinner` is a canvas-rendered
generative pixel-C with breath/refinement cycles, log-rate-driven
speed, step-derived pixelation. ~140 lines of generative animation
code. Keep it intact for Run 6?

**Answer:** Yes, port verbatim. Worth every line.

**Reasoning:**
- It IS the visual identity of the app per the design.
- The `pixelation` parameter decreasing per step (`specify: 1.0,
  clarify: 0.85, plan: 0.7, analyze: 0.55, tasks: 0.4, final: 0.2`)
  gives users a visual progress signal at the activity-pill level.
- Speed adapts to log-rate over a 6-second sliding window — that's
  the diegetic "you can FEEL the work happening" affordance the
  user explicitly called out wanting.
- Canvas + requestAnimationFrame is the right primitive; no React
  reconciliation overhead.
- Porting to TSX requires only typing the `liveRef.current` shape +
  the canvas context typing.

**ADR candidate?** No.

---

## Q8 — Customize modal (gear menu → "Customize" → modal)

**Question:** The v3 design replaced the floating TweaksPanel with a
modal accessed from the gear menu. User explicitly said "if you can
throw a color picker in the gear menu for accent color or something
awesome." Locked.

**Answer:** Ship the CustomizeModal exactly per v3 design. Gear menu
adds a "Customize" item between "Report a bug" and "Export activity
log." Clicking it opens CustomizeModal.

**Modal contains:**
- **Theme section:**
  - Accent (6 swatch buttons with hover ring) — sets
    `preferences.accent` (a tuple `[hero, dim]`)
  - Density (segmented Compact / Regular / Comfy)
- **Layout section:**
  - Activity stream position (segmented Left / Right / Off)
- **Flow section:**
  - "Require scroll to unlock Clarify" toggle (sets
    `preferences.requireScrollToUnlock`)

All settings persist to disk via `preferencesPersistence.listener.ts`
(Run 4 empty body → Run 6 fills it). Persistence target:
`<userData>/preferences.json` written via Run 2's safeWrite.

**Reasoning:**
- Direct user ask: "throw a color picker in the gear menu for
  accent color."
- v3 design already implemented exactly this. Run 6 ports verbatim.
- Other Tweaks (density, layout, flow toggle) are zero-additional-
  cost since CustomizeModal already has them. No reason to skip them.

**ADR candidate?** No.

---

## Q9 — Sample prompt seed: keep design's, or strip to empty?

**Question:** Design's `SAMPLE_PROMPT` (in data.jsx) is a multi-
paragraph "Self-serve flight-change for loyalty guests..." prompt that
serves as the textarea's initial value. Run 6 question: do we
prepopulate this on first launch, or start with an empty textarea?

**Answer:** Empty textarea. Placeholder text only (`"What do you want
to build today?"`). Drop the SAMPLE_PROMPT seed.

**Reasoning:**
- A pre-filled prompt is a footgun: users might accidentally hit
  "Begin specify" with the demo prompt and spec the wrong thing.
- The placeholder gives enough hint about what to type.
- The sample is great for design mockups, bad for real first
  launches.
- We CAN add a "Load sample prompt" link in the empty state if
  users want a starting point (deferred to Run 7+ if requested).

**ADR candidate?** No.

---

## Q10 — TDD vertical tracer bullet for Run 6

**Question:** Per Pocock TDD discipline + the Q9 grill pattern from
Run 5, what's the FIRST test for Run 6?

**Answer:** An end-to-end integration test in `e2e/specify-vertical.spec.ts`
asserting:

> Given a fresh user, when they: sign into all 3 prerequisites, pick
> a repo from the workspace, type "Build a hello-world feature" in
> the SpecifyStep textarea, click "Begin specify", wait for the
> Specify pipeline to complete, then: (a) `git log -1 --format=%B` on
> the active branch shows a `Concierge-Step: specify:pass` trailer,
> (b) the rendered spec.md viewer shows non-empty markdown, (c) the
> stepper shows specify=complete and clarify=pending.

This is the FULL Run 6 contract reduced to one Playwright test.
Cascade vertical slices from there: each component's unit test, each
RTK Query endpoint's test, each new IPC handler's factory test,
listener middleware test for `branchCreator` + `pipelineProgressLogger`,
etc.

**Reasoning:**
- Per Pocock SKILL.md: "Tracer bullet proves the path works
  end-to-end."
- Run 6's value IS the end-to-end integration. Anything that
  doesn't make this test green is overhead.
- After this test green, expand to: SignInScreen rendering tests,
  RepoBrowseScreen filter tests, SpecifyStep phase-transition tests,
  ActivityPill rate-tracking tests, etc.

**ADR candidate?** No (workflow guidance).

---

## Q11 — Cost lever per role file #44

**Question:** Per role file pattern #44, Runs 6-9 should drop to
gpt-5.4 medium for specify+clarify+plan+tasks because they're
decompression-shaped (assembling existing primitives), not
architecture-shaped. User explicitly chose "55" (gpt-5.5 high) for
Run 6 anyway.

**Answer:** Per user explicit choice (2026-05-27 "55"), Run 6 uses
gpt-5.5 high for the full spec-kit pipeline. Cost projection per the
role file estimate: ~60-75 Premium.

**Reasoning:**
- User decision is canonical.
- Run 6 IS the highest-value vertical (per ROADMAP "first proof of
  integration") — premium model headroom is defensible.
- We can drop to gpt-5.4 medium for Runs 7-9 if Run 6's cost is
  validated as defensible.

**ADR candidate?** No.

---

## User decisions captured (2026-05-27)

- Q2 auth gate: **3 prerequisites required** (per v3 design + user
  explicit message).
- Q7 customize gear: user message: "throw a color picker in the gear
  menu for accent color or something awesome. if it's at all complex
  skip it." Decision: ship the CustomizeModal verbatim because it's
  NOT complex (the v3 design already implemented it).
- Q9 sample prompt: user implicit preference for "first-end-to-end
  must work cleanly" → empty textarea.
- Q11 model: gpt-5.5 high (user "55").

Q1 + Q3 + Q4 + Q5 + Q6 + Q8 + Q10 are constitutional, design-locked,
or Pocock-TDD consequence. No user input needed.

## Codex collaboration log

(Codex collaborative grill was run earlier in this session against the
v2 design before the v3 update arrived. Codex's findings about
component inventory, smart/dumb split, and tracer bullet remain valid
under v3. The v3 deltas — CustomizeModal, ActivityPill, PixelCSpinner,
3-prerequisite auth — are additive and don't invalidate codex's prior
guidance.)
