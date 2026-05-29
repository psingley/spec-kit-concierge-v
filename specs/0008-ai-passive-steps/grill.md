# Grill - Run 8 AI-Passive Steps Vertical

## Section 1 - Run 8 Scope Distilled

Run 8 is the Plan, Tasks, and Analyze watching surface: the user is no longer authoring prose as in Specify or answering HITL questions as in Clarify; they are watching the Bound CLI produce and validate step artifacts. The roadmap names this as "the three middle steps that the user watches rather than drives" and explicitly includes `StatusStep` rendering, per-row evidence pills, an evidence-viewer modal, pipeline streaming, 20-minute silence hang detection, and per-step factory validation (`ROADMAP_DECISIONS.md:100-105`).

The lifecycle boundary is not optional. Every step still enters through `before_<step>` and exits through `after_<step>`; the after hook reads expected artifacts, validates them through the step factory, and emits the Step Commit trailer only on pass (`.specify/memory/constitution.md:222-270`). The artifact sets are also already constrained: Plan owns `plan.md`, `research.md`, optional contracts/quickstart, and the `.github/copilot-instructions.md` context-file exception; Tasks owns `tasks.md`; Analyze may remediate `spec.md`, `plan.md`, and `tasks.md` and must allow an empty trailer commit when there is no diff (`ROADMAP_DECISIONS.md:165-170`; `.specify/memory/constitution.md:240-247`).

The renderer work must stay inside the existing architecture. Smart containers live under `src/renderer/components/`, presentational components receive props only, and the older `features/` plus `ui/` split is superseded (`ROADMAP_DECISIONS.md:241-246`). Stream subscriptions belong to RTK Query/listener infrastructure rather than components, and components must not subscribe to ACP directly (`.specify/memory/constitution.md:431-457`). New UI must meet WCAG 2.1 AA, including keyboard operation, focus, live status announcements, and no color-only state (`.specify/memory/constitution.md:463-491`). Observability must record IPC handlers, ACP turns, lifecycle transitions, errors, and local transcripts (`.specify/memory/constitution.md:496-518`).

Out of scope: redoing Run 6 shell/auth/repo selection, redoing Run 7 Clarify, changing the three-state step model, creating a ninth renderer slice, bypassing factories with schema libraries, implementing Review/JIRA, broad HTTP API finalization, packaging work, or modifying the Step Agent files. Run 8 should replace Run 7 placeholders for Plan/Tasks/Analyze only; Review remains later.

## Section 2 - Inheritance Audit

### 1. `PlanStep.tsx` + container + view

Already exists: no Plan component or container exists. `find src/renderer -path '*Plan*' -o -path '*Tasks*' -o -path '*Analyze*' -o -path '*StatusStep*'` returned no files. The workspace currently renders a Run 8-9 placeholder for every post-Clarify body except Specify/Clarify (`src/renderer/components/WorkspaceContainer.tsx:34`).

Delta: add `PlanStep.tsx` and `PlanStepContainer.tsx` under `src/renderer/components/`, mirroring the Run 6/7 smart-container pattern. The body should use a shared `StatusStep` presentational component rather than a Plan-specific status board.

### 2. `TasksStep.tsx` + container + view

Already exists: no Tasks step body exists. The manifest and factory know that Tasks owns only `tasks.md` (`src/main/hooks/manifest.ts:26-28`; `src/main/domain/factories/tasks.factory.ts:5-15`), but the renderer only has the placeholder.

Delta: add `TasksStep.tsx`/`TasksStepContainer.tsx`, reuse `StatusStep`, and decide whether its row model is artifact-centric, task-centric, or both. Tasks is also the first Run 8 step that likely needs `tasks:detail`.

### 3. `AnalyzeStep.tsx` + container + view

Already exists: no Analyze step body exists. The current manifest says Analyze requires `analyze.md` and supports empty commits (`src/main/hooks/manifest.ts:30-33`), while the roadmap says Analyze may instead modify `spec.md`, `plan.md`, and `tasks.md` and commit empty if no diff (`ROADMAP_DECISIONS.md:169-170`).

Delta: add `AnalyzeStep.tsx`/`AnalyzeStepContainer.tsx`, but first reconcile the artifact contract mismatch: current code expects `analyze.md`; roadmap says Analyze remediates existing spec artifacts. This is a real grill finding, not a cosmetic issue.

### 4. Shared `StatusStep.tsx`

Already exists: only the design prototype has `StatusStep`. It renders a progress heading, status rows, evidence buttons, and inline ArtifactViewer state (`design/v3-fetch/project/steps.jsx:299-348`). No shipped component exists.

Delta: add a shipped presentational `StatusStep` that accepts all data/callbacks via props. It should not own artifact fetches, RTK Query hooks, or stream subscriptions. It should emit user intent such as "view artifact", "continue", or "open task".

### 5. Three new IPC channels: `copilot:plan`, `copilot:tasks`, `copilot:analyze`

Already exists: `copilot:specify` and `copilot:clarify` exist as concrete main IPC handlers and renderer RTK Query mutations (`src/main/ipc/copilotSpecify.ts:18-172`; `src/main/ipc/copilotClarify.ts:21-156`; `src/renderer/api/copilotClarify.endpoint.ts:24-109`). The shared `StepStreamEvent` already accepts all six step names on both main and renderer sides (`src/main/ipc/stepStreamEvent.factory.ts:3-30`; `src/renderer/api/stepStreamEvent.ts:3-30`).

Delta: add the three passive pipeline handlers as the third copy-shape, ideally through a small shared helper before duplication hardens. These handlers should run `beforePlan`/`afterPlan`, `beforeTasks`/`afterTasks`, and `beforeAnalyze`/`afterAnalyze`, emit progress events, enforce exactly one terminal event, and read back the relevant artifact summary. Avoid a new event union unless the grill chooses richer per-step payloads.

### 6. Plan/tasks/analyze factory bodies

Already exists: all three factories exist but are very thin. Plan validates only `plan.md` and `research.md` with regex sentinels (`src/main/domain/factories/plan.factory.ts:5-15`). Tasks validates `tasks.md` with `bad-task|MALFORMED|partial` sentinels (`src/main/domain/factories/tasks.factory.ts:5-15`). Analyze validates `analyze.md` with similar sentinel checks (`src/main/domain/factories/analyze.factory.ts:5-15`).

Delta: Run 8 should harden these into real Step Contracts. Plan needs roadmap-aligned optional artifacts and context-file exception behavior. Tasks needs task-list structure validation, stable task ids, dependency references, and enough parsing to power `TaskViewer`. Analyze needs the artifact-manifest correction above before implementation.

### 7. `react-markdown` + `rehype-sanitize`

Already exists: roadmap now names `react-markdown` + `rehype-sanitize` as the markdown viewer borrow (`ROADMAP_DECISIONS.md:588`; `ROADMAP_DECISIONS.md:637-645`). `package.json` does not include either dependency (`package.json:28-37`). The shipped `Markdown.tsx` is a hand-rolled block splitter that only handles headings, code fences, unordered lists, and escaped paragraphs, while using `dangerouslySetInnerHTML` for paragraph output (`src/renderer/components/Markdown.tsx:7-36`).

Delta: add pinned exact dependencies and replace `Markdown.tsx` with the real renderer. Re-verify Specify because `SpecifyStep` consumes the same component for `spec.md` preview (`src/renderer/components/SpecifyStep.tsx:113-117`). The engine choice should be GFM-capable because Run 8 artifacts will contain tables, task lists, links, inline code, blockquotes, and nested lists.

### 8. `tasksDetailApi` / `tasks:detail`

Already exists: roadmap names `tasksDetailApi` as `tasks:detail` (`ROADMAP_DECISIONS.md:340-345`). Live search found no implementation. There is no `TaskViewer` in shipped code; only design prototype code exists (`design/v3-fetch/project/steps.jsx:404`).

Delta: define the request/response factory, main IPC handler, preload bridge entry, renderer RTK Query endpoint, and `TaskViewer` props contract. It should parse from the committed `tasks.md`, not from renderer-only state.

### 9. `artifactsApi` / `artifact:read`

Already exists with a naming drift: roadmap says `artifact:read`, but shipped code uses `artifacts:read` (`ROADMAP_DECISIONS.md:342`; `src/main/ipc/artifacts.ts:8`; `src/renderer/api/artifacts.endpoint.ts:5-15`). It reads text, size, and mtime and refuses artifacts over 512 KiB (`src/main/ipc/artifacts.ts:27-36`). It is a query keyed by `{ repositoryPath, artifactPath }`, not yet cached per `{repo, branch, path}` and not binary-aware.

Delta: decide whether Run 8 keeps the shipped plural channel or renames/aliases to the roadmap singular. ArtifactViewer can reuse the existing endpoint for text artifacts, but needs branch-aware cache keys, path invalidation on step mutation, and a binary/oversize UX.

### 10. `ArtifactViewer` + `TaskViewer` dumb components

Already exists: only the design prototype has these components (`design/v3-fetch/project/steps.jsx:354-454`). The shipped workspace placeholder explicitly says ArtifactViewer and TaskViewer are not implemented (`src/renderer/components/WorkspaceContainer.tsx:34`).

Delta: add presentational modal components that receive content/status/callback props. Smart containers or RTK Query hooks should fetch artifact/task content. The components need keyboard dismissal, focus handling, accessible names, copy/download affordances, and large-file handling.

### 11. Hang detection listener body completion

Already exists, but not in `hangDetector.listener.ts`. There is no such file. Run 5 implemented hang detection inside `transcriptCapture.listener.ts`: a 30-second interval, `1200000` ms threshold, dedupe marker, and a `hang-suspected` activity event without auto-fail (`src/renderer/listeners/transcriptCapture.listener.ts:15-79`). This matches the ADR-0007 six-topic catalog, which did not create a seventh hang listener (`docs/adr/0007-listener-middleware-catalog.md:13-36`).

Delta: Run 8 should not add a new listener file without amending ADR-0007. The likely work is to make the existing body step-aware for Plan/Tasks/Analyze pipeline state, connect the soft notification to visible UI, and add stronger fake-timer tests for the passive steps.

### 12. Per-row evidence pills

Already exists: design rows have an evidence button inside `.ev-actions`, disabled until row status is done (`design/v3-fetch/project/steps.jsx:326-345`), with CSS under `.evidence-grid`, `.ev-row`, `.ev-status`, and `.ev-actions` (`design/v3-fetch/project/styles.css:3286+`).

Delta: add a shipped `EvidencePill` or keep it as a small subcomponent of `StatusStep`. It must communicate disabled/pending/done states without color alone and must not read artifacts itself.

### 13. Visual contracts

Already exists: visual-diff harness is live. Run 7 already added `clarify-question`, `clarify-ask-another`, and `clarify-malformed-reask`; the current screen list includes 27 screens (`e2e/visual-diff/harness/screens.config.ts:213-225`). Existing contracts include Specify and Clarify body screens.

Delta: add Plan/Tasks/Analyze idle/running/done plus ArtifactViewer, TaskViewer, and evidence-pill variants. That is probably 9-12 new screens, pushing the suite to roughly 36-39 screens unless variants are combined carefully.

## Section 3 - Architectural Choice Points Worth Grilling

### Q1 - Markdown engine extent

Should Run 8 add only `react-markdown` + `rehype-sanitize`, or also GFM support?

- A. `react-markdown` + `rehype-sanitize` only. Lowest dependency count; weak for task lists/tables.
- B. Add `remark-gfm` too. Recommended. Matches plan/tasks/analyze artifact reality; one more dependency.
- C. Add `rehype-raw` or syntax highlighting. More expressive; higher XSS and dependency surface. Avoid unless a concrete artifact requires raw HTML.

### Q2 - Artifact payload in step terminal events

What should `copilot:plan/tasks/analyze` `done/pass` carry?

- A. Only `artifactPath` + `commitSha`; UI reads details via `artifacts:read`. Lower stream payload; extra round trip.
- B. Include a compact manifest summary plus `commitSha`. Recommended. Enough to paint rows immediately; detailed content still lazy-loads.
- C. Include full artifact text. Simplest UI handoff; risky for 100k+ char artifacts and duplicated trust-boundary payloads.

### Q3 - Passive step navigation during an in-flight run

If Plan is running and the user navigates to Tasks or Analyze, what happens?

- A. Background continue; stepper/activity show Plan running. Recommended. Passive steps are long-running and should survive navigation.
- B. Block navigation until terminal event. Simpler state, worse UX.
- C. Pause/cancel on navigation. Conflicts with current lifecycle expectations unless Escape Hatch is explicit.

### Q4 - `StatusStep` row model

What does one row represent?

- A. One expected artifact. Good for Plan; poor for Tasks details.
- B. One pipeline milestone. Good progress feel; weak evidence mapping.
- C. A typed union of artifact rows and milestone rows. Recommended. Supports Plan artifact set, Tasks parsing, and Analyze remediation rows.

### Q5 - Plan artifact manifest correction

How much of the roadmap Plan artifact set should the factory enforce now?

- A. Required `plan.md` + `research.md` only, current code. Fastest but under-validates roadmap.
- B. Required files plus optional contracts/quickstart discovery. Recommended. Aligns roadmap without failing absent optional files.
- C. Enforce all optional outputs. Too strict; spec-kit does not always write every optional artifact.

### Q6 - Analyze artifact contract

Should Analyze require `analyze.md`?

- A. Keep current `analyze.md` requirement. Simple, but conflicts with roadmap.
- B. Change Analyze to validate allowed remediation targets and allow empty pass. Recommended if roadmap remains source of truth.
- C. Require both `analyze.md` and remediation validation. More evidence but likely invents an artifact spec-kit does not promise.

### Q7 - ArtifactViewer binary/large-file handling

What happens when the evidence path is a PDF, image, or oversized text file?

- A. Text-only; show "unsupported" for binary/oversize. Lowest complexity.
- B. Kind discriminator with text/markdown/code/image/PDF metadata. Recommended if contracts include non-markdown artifacts.
- C. Separate viewers per file kind. Cleaner long-term; broader Run 8 surface.

### Q8 - Artifact fetch timing

When a user clicks an evidence pill, does the modal preload or read on click?

- A. Read on click. Recommended. Keeps initial passive step light.
- B. Preload all done-row artifacts. Faster modal, worse large-artifact risk.
- C. Hybrid: preload metadata only, content on click. Best UX if metadata endpoint is cheap.

### Q9 - `tasks:detail` content depth

What should TaskViewer show?

- A. Task id/title/description only. Fastest.
- B. Include acceptance, dependencies, files, estimate, and phase. Recommended if parser can support it.
- C. Include ownership/status assignments. Defer unless tasks.md actually contains stable owner/status fields.

### Q10 - Hang notification affordance

At 20 minutes of stream silence, what does the user see?

- A. Activity-only `hang-suspected`. Current behavior; low visibility.
- B. Soft inline/banner notification with Cancel/Restart guidance, no auto-fail. Recommended. Matches Constitution VII.
- C. Offer immediate cancel plus force-restart. Higher power, higher false-positive risk.

### Q11 - Channel naming drift

Do we keep shipped `artifacts:read` or align to roadmap `artifact:read`?

- A. Keep `artifacts:read` and update Run 8 docs to match code. Lowest churn.
- B. Add `artifact:read` alias while preserving `artifacts:read`. Recommended if external API wording matters.
- C. Rename and remove plural channel. Clean but risks breaking Run 6/7 tests.

### Q12 - Shared passive pipeline implementation

Should Plan/Tasks/Analyze each copy `copilotClarify.ts` shape or share a generic handler helper?

- A. Copy three files. Fastest, but copy-pasta risk is high.
- B. Introduce a small `registerPassiveStepIpc` helper. Recommended. The three steps are similar but artifact prompts/factories differ.
- C. Generalize Specify/Clarify too. Too much refactor for Run 8.

### Q13 - Visual contract count

How many new visual screens are enough?

- A. 6 screens: one idle/running/done per shared surface family. Fast but under-covers variants.
- B. 9-10 screens: Plan/Tasks/Analyze idle/running/done plus one modal/evidence variant. Recommended floor.
- C. 12+ screens: every modal and pill variant separately. Strongest fidelity; slowest harness.

### Q14 - Markdown rendering performance

For 800+ line plans and large tables, do we virtualize?

- A. Plain render initially. Recommended with a size guard and measured follow-up; simplest.
- B. Lazy-render sections. More work but better for long artifacts.
- C. Virtualize markdown blocks. Complex and risky with tables/code/anchors.

## Section 4 - Verify-Now Opportunities

Verified now:

- Branch/base are correct: `git branch --show-current` returned `spec/0008-ai-passive-steps`, and `git rev-parse HEAD` returned `65728616e01f6b6fd70f0babbd2077f69ff62635`.
- Plan/Tasks/Analyze/StatusStep shipped components are absent: the requested `find src/renderer ...` returned no files.
- `copilot:clarify` and shared step streaming already exist, so Run 8 should not repeat Run 7's extraction work (`src/main/ipc/stepStreamEvent.factory.ts:3-30`; `src/renderer/api/stepStreamEvent.ts:3-30`).
- `artifacts:read` already exists, but not with the roadmap's singular channel name or branch-aware cache key (`src/main/ipc/artifacts.ts:8`; `src/renderer/api/artifacts.endpoint.ts:7-15`; `ROADMAP_DECISIONS.md:342-344`).
- `tasks:detail`, ArtifactViewer, TaskViewer, PlanStep, TasksStep, AnalyzeStep, StatusStep, evidence pills, and `copilot:plan/tasks/analyze` are not implemented. `rg` only found roadmap/design references and the Run 7 placeholder.
- Hang detection is already in `transcriptCapture.listener.ts` with 30-second polling and 20-minute threshold; there is no separate `hangDetector.listener.ts` (`src/renderer/listeners/transcriptCapture.listener.ts:15-79`).
- `react-markdown` and `rehype-sanitize` are not installed (`package.json:28-37`), even though roadmap lists them as the markdown viewer borrow (`ROADMAP_DECISIONS.md:588`).
- Copilot ACP support is locally available: `copilot --version` returned `GitHub Copilot CLI 1.0.55`, and `copilot --help` includes `--acp`.
- A Run 7 transcript fixture already exists at `specs/0007-clarify-vertical/fixtures/clarify-transcript.jsonl`; no Run 8 fixtures exist yet.

Not captured now:

- I did not create live Plan/Tasks/Analyze ACP transcripts. This grill is read-only except its report artifact, and a clean transcript would need a controlled prompt plus safe fixture path. Recommended Phase 1 follow-up: capture `specs/0008-ai-passive-steps/fixtures/{plan,tasks,analyze}-transcript.jsonl` before `/speckit.specify`, using no-edit ACP prompts first to confirm event shape and then real runs only when the workspace safety boundary is explicit.
- I did not test `react-markdown` rendering because adding dependencies or a sample component would exceed the report-only source boundary. Recommended follow-up: a temporary fixture render of tables, task lists, blockquotes, links, inline code, and hostile HTML before replacing `Markdown.tsx`.
- I did not run visual-diff. The current screen config is enough to prove Run 7's 27 screens exist; Run 8 should budget harness expansion before implementation acceptance.

## Section 5 - Risks

- The Analyze contract currently conflicts with the roadmap. If implementation blindly follows `analyze.factory.ts`, it will require `analyze.md`; if it follows roadmap, tests and manifest need correction.
- Markdown engine swap is deceptively large. `Markdown.tsx` is tiny and permissive today; `react-markdown` plus sanitization will alter headings, lists, code fences, escaped HTML, links, and table output. Specify can regress while Run 8 is trying to improve Plan/Tasks/Analyze.
- Three steps times three handlers/endpoints/factories/hooks can become copy-pasta with subtle differences in prompts, artifact sets, Step Commit behavior, and next-step advancement.
- ArtifactViewer can overload the renderer if it eagerly loads large markdown or contract files. The existing main handler has a 512 KiB text limit, which needs a visible UX.
- Hang detection can false alarm during legitimate long model silences unless it is tied to active pipeline state and deduped by step/session.
- Visual contract count will grow substantially. If Run 8 adds 9-12 screens, `vd:loop` cost and screenshot review burden rise.
- `tasks:detail` depends on a stable parser for `tasks.md`. If tasks format is still loose, TaskViewer either becomes brittle or turns into a raw markdown viewer.
- Channel naming drift (`artifact:read` vs `artifacts:read`) can confuse specs, tests, and future HTTP API naming.
- Evidence pills can imply artifact validation before after-hooks finish. The UI must not enable proof reads until the row is actually done or the artifact has a validated path.
- Test growth can become padded. The useful tests are factory hardening, terminal-event invariants, step-specific handler orchestration, modal accessibility, markdown hostile-input rendering, and visual contracts.

## Section 6 - Cost Expectation

Honest Premium estimate: 85-130 Premium for a rigorous Run 8, with a 140-170 upper band if markdown rendering, visual fidelity, or live ACP transcript capture exposes drift.

Calibration: Run 6 was roughly 67.5 Premium because it paid for the first shell-to-pipeline vertical. Run 7's own grill estimated 45-75 Premium, and the actual Run 7 scope now visible in code included a real Clarify body, `copilot:clarify`, shared step stream, three visual contracts, and no new runtime dependency (`specs/0007-clarify-vertical/grill.md:177-183`; `specs/0007-clarify-vertical/plan.md:6-22`). Run 8 is larger than Run 7 in breadth: three step bodies, three streaming channels, three factory hardening efforts, markdown engine swap, artifact/task modals, tasks detail API, hang UI, and 9-12 likely visual screens. It is less novel than Run 6/7 in interaction model, but broader and more integration-heavy.

Planning assumption: one pass for passive pipeline + factories, one pass for UI/components/APIs, one pass for markdown + artifact/task viewers, and one visual-fidelity/verifier pass. Do not frame Run 8 as "copy Clarify three times"; the artifact contracts are the hard part.

## Section 7 - Recommended Sub-Decisions I Pick

- Markdown default: add `react-markdown`, `rehype-sanitize`, and `remark-gfm`; do not add `rehype-raw` or highlighting in Run 8. Rationale: GFM is needed for spec-kit artifacts; raw HTML is avoidable risk. Override word: `raw-markdown`.
- Artifact read naming default: keep shipped `artifacts:read` and optionally add a singular alias only if the spec needs public naming alignment. Rationale: avoid breaking Run 6/7 paths. Override word: `rename-artifact-read`.
- Artifact fetch default: load modal content on click, not during status-row render. Rationale: avoids large-artifact renderer cost. Override word: `preload-evidence`.
- `StatusStep` default: use typed artifact/milestone row union. Rationale: Plan, Tasks, and Analyze need different row semantics without three separate components. Override word: `artifact-only-rows`.
- Analyze contract default: align to roadmap remediation targets and empty pass, not required `analyze.md`, unless live spec-kit transcript proves an `analyze.md` artifact exists. Override word: `require-analyze-md`.
- Passive pipeline default: introduce a small shared passive-step IPC helper for Plan/Tasks/Analyze only. Rationale: reduces copy bugs while avoiding a broad Specify/Clarify refactor. Override word: `copy-three-handlers`.
- Hang default: keep detection in `transcriptCapture.listener.ts`; add visible soft notification with no auto-fail. Rationale: matches ADR-0007 and Constitution VII. Override word: `activity-only-hang`.
- Task detail default: parse id, title, phase/area, dependencies, files, and acceptance notes if present; omit owner/status until tasks.md reliably contains them. Override word: `minimal-task-detail`.
- Visual default: add 10 screens: Plan idle/running/done, Tasks idle/running/done, Analyze idle/running/done, and one modal/evidence combined screen. Rationale: covers core state matrix without exploding suite time. Override word: `full-variant-visuals`.
- State ownership default: extend existing `session` pipeline/artifact fields and RTK Query caches; do not add a passive-steps slice. Rationale: preserves eight-slice architecture. Override word: `passive-slice`.
