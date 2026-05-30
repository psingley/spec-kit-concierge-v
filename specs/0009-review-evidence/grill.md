# Run 9 Review & Evidence Vertical Grill

Date: 2026-05-30

Branch observed: `spec/0009-review-evidence`

HEAD observed: `fb1b905` (`origin/main`, `main`) not the requested `4d792a1`; this report uses the live worktree truth and does not modify source outside this file.

Scope: grill report only. No spec-kit command was run. No `src/` code was edited.

## S1 - Run 9 Scope Distilled

Run 9 is the terminal Concierge Review surface, not a canonical spec-kit agent step. The roadmap defines it as evidence summary, resolved-clarifications summary, task list with per-task expand modal, read-only-when-complete dim treatment, and the `Resume {pending}` bounce affordance; JIRA submission is explicitly excluded for a later slice (ROADMAP_DECISIONS.md:107-112). The roadmap also says Review authors no artifact itself; any future Review Step Commit only wraps JIRA outer-loop output such as `jira-tickets.json` (ROADMAP_DECISIONS.md:171).

The constitution frames the app as six stages where Specify, Clarify, Plan, Tasks, and Analyze map to canonical Step Agents, while Review is the Concierge-app surface for evidence review and later JIRA extension invocation (.specify/memory/constitution.md:1-7). Disk-Is-Truth is central: step completion is proven by git history, `Concierge-Step:` trailers, and on-disk artifacts, never renderer memory or ACP prose (.specify/memory/constitution.md:43-69). The smart/dumb rule is inherited: containers may own hooks and RTK Query; presentational components must receive props and avoid store, RTK Query, Electron, Node, and filesystem imports (ROADMAP_DECISIONS.md:245-246).

Run 9 must also fold in four pre-decided Run 8 audit fixes:

- FIX-A: Plan optional-artifact discovery. The current manifest declares `plan.optionalFiles: []` and `expectedArtifactsForStep()` simply concatenates required plus optional manifest entries (src/main/hooks/manifest.ts:22-25, 46-61). Run 8 spec already says Plan should discover optional `data-model.md`, `contracts/*`, and `quickstart.md` (specs/0008-ai-passive-steps/spec.md:19, 161-163). Run 9 evidence must show all produced artifacts, so this fix is in scope.
- FIX-B: Analyze report capture/display. Analyze currently has no required output artifact and allows empty commits (src/main/hooks/manifest.ts:31-35; src/main/domain/factories/analyze.factory.ts:13-23). The real Analyze evidence can otherwise vanish because the passive pass summary is manifest-derived rather than report-derived (src/main/ipc/passiveStepIpc.ts:72-89).
- FIX-C: Hang UX. The current renderer silence threshold is 20 minutes (src/renderer/listeners/transcriptCapture.listener.ts:15-17), and the current passive copy says "The agent appears hung" (src/renderer/components/PassiveStep.tsx:70-73). Forensics show Plan legitimately took 38m13s and was still active under the old threshold (specs/0008-ai-passive-steps/fixtures/termination-rootcause.md:44-50, 75).
- FIX-D: Real StatusStep in passive visual contracts. The visual harness currently injects synthetic passive markup from `renderPassiveState()` rather than driving the shipped `StatusStep` component path (e2e/visual-diff/harness/screens.config.ts:163-203, 261-270). The audit says the contracts should assert status counts/tags, evidence subtitles, and artifact action state (specs/0008-ai-passive-steps/fixtures/contract-honesty-audit.md:82-90, 102-107).

## S2 - Inheritance Audit

### 1. ReviewStep + Container

Exists: no `src/renderer` file matched `*Review*`, and the workspace renders `<section className="placeholder">Review is not implemented in Run 8.</section>` for the Review tab (src/renderer/components/WorkspaceContainer.tsx:42). The stepper already includes `review` in canonical order (src/renderer/components/Stepper.tsx:10-20).

Delta: add `ReviewStep.tsx` as the dumb surface and `ReviewStepContainer.tsx` as the smart wiring. Do not add a ninth slice; derive Review state through existing selectors plus a new IPC/RTK Query read if needed.

### 2. Evidence Summary Card

Exists: step completion history can be parsed from commit messages. `commitWithTrailer()` writes `Concierge-Step: ${step}:${status}` via `git interpret-trailers` (src/main/data-layer/git/gitCommand.ts:62-100), and `readConciergeStepHistory()` reads `git log --format=%H%x00%B%x1e` then parses trailers (src/main/data-layer/git/gitCommand.ts:110-128). There is also a `steps:read` IPC parser, but it expects renderer-supplied commit messages rather than doing git history I/O itself (src/main/ipc/steps.ts:21-68).

Delta: Review needs an aggregation surface that joins trailer history to actual on-disk artifacts. The report should not reconstruct completion from session slice data because Disk-Is-Truth makes git/artifacts authoritative.

### 3. Resolved Clarifications Summary

Exists: Run 7 completion stores an in-memory `ClarifyCompletionSummary` with `artifactPath`, `commitSha`, questions, and answers (src/renderer/slices/session.ts:33-38, 220-226). The spec contract says accepted answers are persisted in-place under the feature `spec.md` Clarifications section (specs/0007-clarify-vertical/spec.md:151, 192), and the existing spec format uses a `## Clarifications` / `### Session <date>` section with Q/A bullets (specs/0007-clarify-vertical/spec.md:11-20).

Delta: Review should prefer parsing committed `spec.md` for restart-proof summary, with session completion as live enrich-only fallback before a reload. This is a real choice because session data is richer but non-authoritative.

### 4. Task List With Per-Task Expand Modal

Exists: `tasks:detail` is a main-process IPC channel that reads `tasks.md` with a 512 KiB guard and parses it in `src/main/domain/tasksDetail` (src/main/ipc/tasksDetail.ts:1-44). The renderer RTK endpoint calls the channel and factory-parses the response (src/renderer/api/tasksDetail.endpoint.ts:5-16). `TaskViewer` is dumb and receives parsed tasks as props (src/renderer/components/TaskViewer.tsx:1-19). `ArtifactViewer` already switches `tasks.md` to `TaskViewer` instead of raw markdown (src/renderer/components/ArtifactViewer.tsx:15-36).

Delta: Review needs task-list presentation and per-task expansion, not a new parser. The likely change is either extend `TaskViewer` to support row click/detail state or wrap it in a Review-specific task list/modal while still sourcing data from `tasks:detail`.

### 5. Read-Only-When-Complete Dim Treatment

Exists: fetched design applies `ws-body is-readonly` when viewing a step behind the max step, dims shell/evidence/final content, disables pointer events, and shows a read-only banner (design/v3-fetch/project/app.jsx:486-497; design/v3-fetch/project/styles.css:2711-2763). The shipped app does not yet apply this to real navigation; `WorkspaceContainer` only swaps the body by viewed step (src/renderer/components/WorkspaceContainer.tsx:37-43).

Delta: implement a real completed-step view-only state from current step lifecycle, but avoid disabling the Review evidence controls themselves when Review is the terminal inspection surface.

### 6. Resume `{pending}` Bounce Affordance

Exists: the design text and button say "This step has been committed. View only -- return to {step} to continue." and "Resume {step}" (design/v3-fetch/project/app.jsx:486-495). The shipped `steps` slice can hold multiple pending records because `stepPending` does not enforce a single-running invariant; it only refuses to overwrite completed steps (src/renderer/slices/steps.ts:67-81). Current `WorkspaceContainer` derives states partly from session memory instead of trailer-restored step entities (src/renderer/components/WorkspaceContainer.tsx:27-36).

Delta: Resume must target the actual pending/in-flight step from the lifecycle state, with deterministic fallback when the invariant is violated. The single-step invariant is deferred, so Run 9 should specify display behavior for 0, 1, and >1 pending steps.

### 7. Visual Contracts for Review Surface

Exists: 37 visual contracts exist after Run 8/PR #10; passive screens are present, but the passive ones are synthetic (e2e/visual-diff/harness/screens.config.ts:163-203, 261-270). Current design source contains final summary/task-list styles that are likely the visual basis for Review (design/v3-fetch/project/styles.css:3332-3438).

Delta: add Review idle/populated/read-only/bounce task-modal contracts, and for FIX-D route passive contracts through the real component/state path where feasible.

### FIX-A Delta

Exists: `plan.optionalFiles` is still empty, and `validatePlanArtifacts()` only commits required files from the manifest (src/main/hooks/manifest.ts:22-25; src/main/domain/factories/plan.factory.ts:5-15). The passive summary does not inspect disk and labels all non-Analyze expected files as required (src/main/ipc/passiveStepIpc.ts:72-83).

Delta: populate optional manifest paths/patterns, make Plan validation discover present optional artifacts without requiring them, and include present optional rows in passive and Review evidence. Avoid making `contracts/*` a literal file path.

### FIX-B Delta

Exists: Analyze prompt currently asks for remediation or no-diff empty commit, not report capture (src/main/ipc/copilotPassiveAgent.ts:13). The after-hook computes remediation files from `git diff --name-only HEAD -- <featureDir>` and validates only those files (src/main/hooks/hookHelpers.ts:78-92). No report text is captured from the ACP stream or written to disk.

Delta: capture Analyze's structured Markdown report as disk evidence without violating Analyze's read-only source contract. The cleanest model is app-owned capture under a Concierge evidence path, not agent-authored `analyze.md` in the feature contract.

### FIX-C Delta

Exists: silence threshold is 20 minutes, deduped by last ACP event marker (src/renderer/listeners/transcriptCapture.listener.ts:51-79). Activity listener marks ACP events on receipt (src/renderer/listeners/transcriptCapture.listener.ts:26-48), but passive progress currently records only the coarse `Running ${step}` event from main and not all ACP chunks through the renderer passive endpoint (src/main/ipc/passiveStepIpc.ts:155-157; src/renderer/api/copilotPassive.endpoint.ts:43-47).

Delta: define "inert" as no stream activity for 40+ minutes, update copy to "still working / no recent output", and ensure active streaming resets the silence clock. No auto-fail.

### FIX-D Delta

Exists: shipped `StatusStep` is minimal: rows only, no header count, no running/complete tag, no Continue button (src/renderer/components/StatusStep.tsx:15-36). The fetched design has richer `StatusStep` behavior with count, running/complete tag, per-artifact disabled actions, and Continue button (design/v3-fetch/project/steps.jsx:299-348). The harness drives neither the current component nor the full design mechanics for passive contracts (e2e/visual-diff/harness/screens.config.ts:169-203).

Delta: specify which real component behavior Run 9 will harden. Either enhance shipped `StatusStep` to match the design semantics first, or limit visual assertions to current behavior and add a separate task to close the design gap.

## S3 - Architectural Choice Points

1. Evidence authority for Review card:
   - A. Main-process git history + disk artifact read aggregation. Benefit: matches Disk-Is-Truth and future HTTP API. Cost: new IPC/factory.
   - B. Renderer session slice aggregation. Benefit: fast and already shaped. Cost: stale after restart; violates central Run 9 premise.
   - C. Hybrid: main-process authority with session-only live enrichments. Benefit: resilient plus richer while running. Cost: more states to explain.
   - Recommendation: C, with A as the pass/fail authority.

2. Review evidence IPC shape:
   - A. Add `review:evidence` aggregating trailers, artifact manifests, optional discovery, clarify summary, and task metadata. Benefit: one main capability reusable by Run 10 HTTP API. Cost: new endpoint/factory/tests.
   - B. Renderer assembles from `artifacts:read`, `tasks:detail`, and step state. Benefit: fewer IPC files. Cost: renderer owns I/O orchestration and git history gap.
   - C. Extend `steps:read` to become the aggregator. Benefit: reuses channel. Cost: muddies trailer parsing with Review-specific artifact concerns.
   - Recommendation: A.

3. Clarifications source:
   - A. Parse committed `spec.md` Clarifications section. Benefit: survives restart and follows Run 7 persistence. Cost: Markdown parsing edge cases.
   - B. Read `session.clarifyCompletion`. Benefit: structured questions/answers. Cost: volatile and not authoritative.
   - C. Parse disk first, merge session details only if commit SHA matches. Benefit: best user display. Cost: matching logic.
   - Recommendation: C.

4. Optional Plan artifacts:
   - A. Manifest uses optional files and glob-like directories (`data-model.md`, `quickstart.md`, `contracts/*`) and discovery expands present files. Benefit: matches Q5 and Review needs. Cost: manifest type changes.
   - B. Keep manifest simple and let Review scan known locations. Benefit: limited hook changes. Cost: passive UI remains incomplete.
   - C. Require all optional artifacts. Benefit: simple summary. Cost: contradicts "optional-if-discovered."
   - Recommendation: A.

5. Analyze report capture:
   - A. Capture final ACP assistant Markdown into app-owned evidence file after `session/prompt end_turn`. Benefit: disk truth, no Analyze source writes. Cost: need stream capture plumbing.
   - B. Ask Analyze agent to write `analyze-report.md`. Benefit: easy to display. Cost: contradicts real read-only Analyze contract.
   - C. Store report only in renderer activity. Benefit: simplest. Cost: vanishes on restart and fails Review evidence.
   - Recommendation: A, with file path explicitly outside the feature contract or in a clearly app-owned evidence directory.

6. Empty Analyze commits:
   - A. Show empty commit as valid completion plus report evidence. Benefit: no-diff pass is understandable. Cost: must avoid "0 artifacts" looking broken.
   - B. Hide empty commit details. Benefit: cleaner UI. Cost: weak auditability.
   - C. Treat empty commit as warning. Benefit: caution. Cost: contradicts Run 8 allowed behavior.
   - Recommendation: A.

7. Read-only dim scope:
   - A. Apply to any completed step viewed before the active/pending step. Benefit: matches design. Cost: can block artifact buttons unless banner sits outside disabled area.
   - B. Apply only to Review. Benefit: narrow. Cost: misses roadmap "step has been committed" behavior.
   - C. Apply only to previous non-Review steps; Review remains interactive evidence surface. Benefit: avoids locking the terminal review controls. Cost: special case.
   - Recommendation: C.

8. Resume target:
   - A. First pending step in canonical order. Benefit: deterministic. Cost: may choose wrong step if multiple pending due invariant gap.
   - B. In-flight running step from session first, else first pending step. Benefit: closest to user intent. Cost: still mixed authority.
   - C. Latest pending Step Commit/trailer state. Benefit: disk-aligned. Cost: pending may not be committed.
   - Recommendation: B, with multi-pending warning and canonical fallback.

9. Task detail UI:
   - A. Reuse `tasks:detail` and add Review-local per-task modal using `ParsedTask`. Benefit: no parser churn. Cost: new presentation.
   - B. Open existing ArtifactViewer with all tasks. Benefit: already works. Cost: not "per-task expand modal."
   - C. Add per-task IPC. Benefit: efficient for large files. Cost: unnecessary until real scale proves it.
   - Recommendation: A.

10. Review Step Commit:
   - A. No Review commit in Run 9. Benefit: roadmap says no artifact authored by Review. Cost: Review complete state is UI-only.
   - B. Empty `review:pass` Step Commit. Benefit: six-step trailer symmetry. Cost: contradicts "No artifact authored by review itself" and can confuse Run 12.
   - C. Defer Review trailer until Run 12 JIRA output. Benefit: matches roadmap. Cost: Review step may not become "complete" in stepper until JIRA slice.
   - Recommendation: A for Run 9, with explicit stepper state "available/current" not "committed review."

11. Review availability:
   - A. Available only after Analyze `pass` trailer. Benefit: clean terminal sequence. Cost: cannot preview partial evidence.
   - B. Available once any prior evidence exists. Benefit: diagnostic. Cost: more empty/error states.
   - C. Available after Tasks, with Analyze pending card. Benefit: useful before final quality gate. Cost: dilutes "terminal" role.
   - Recommendation: A for user journey, with developer fixture states for idle/partial visual contracts.

12. Visual contracts:
   - A. Add Review contracts and retrofit passive contracts through real component/state path. Benefit: fixes audit. Cost: harness work.
   - B. Add Review contracts only. Benefit: smaller. Cost: FIX-D remains unpaid.
   - C. Retrofit passive first, defer Review visual breadth. Benefit: trust base. Cost: misses Run 9 primary UI.
   - Recommendation: A, but split tasks so Review implementation is not blocked by every passive harness improvement.

13. Hang UX event semantics:
   - A. Silence uses actual ACP update timestamps from all stream activity. Benefit: correct "inert" standard. Cost: needs richer event forwarding.
   - B. Silence uses app progress events only. Benefit: existing path. Cost: false positives during active tool/text streaming.
   - C. Wall-clock runtime threshold. Benefit: simple. Cost: repeats Run 8 problem.
   - Recommendation: A.

14. Evidence card artifact bodies:
   - A. Summary shows metadata/paths only; content is lazy-read on click. Benefit: inherited Run 8 choice and performance. Cost: one more click.
   - B. Preload all markdown into Review. Benefit: rich card. Cost: 512 KiB and startup performance concerns.
   - C. Preload only small files. Benefit: balanced. Cost: inconsistent behavior.
   - Recommendation: A.

15. Branch/head baseline:
   - A. Spec Run 9 from live `fb1b905` main after PR #10. Benefit: reflects current repo and FIX-D partial improvements. Cost: differs from prompt base.
   - B. Reset/rebase to `4d792a1`. Benefit: exact prompt. Cost: destructive against current branch and pre-existing changes.
   - C. Mention drift and let spec author choose. Benefit: safe. Cost: one explicit decision.
   - Recommendation: A unless the user says `BASE-4d792a1`.

## S4 - Verify-Now Opportunities

These are small probes worth doing before writing the spec; none require source changes.

1. Confirm whether `readConciergeStepHistory()` is wired to any IPC path today. Current evidence: the function exists in git data-layer (src/main/data-layer/git/gitCommand.ts:110-128), while `steps:read` parses only caller-provided commits (src/main/ipc/steps.ts:21-68). Probe: `rg "readConciergeStepHistory|steps:read" src/main src/renderer`.
2. Sample a real feature `spec.md` Clarifications section, because the parser should handle the Q/A bullet pattern shown in Run 7 and Run 8 specs (specs/0007-clarify-vertical/spec.md:11-20; specs/0008-ai-passive-steps/spec.md:11-30).
3. Confirm app-owned evidence storage location for Analyze report. Probe current userData/in-flight marker patterns before choosing a path; do not let Analyze write a source artifact that contradicts the read-only agent contract.
4. Inspect ACP supervisor/session APIs to see whether final assistant text is already available from `session.prompt()` return or only from streamed `session/update` chunks. Current adapter discards any prompt result value (src/main/ipc/copilotPassiveAgent.ts:27-39).
5. Check whether Review's future HTTP API in Run 10 should call the same `review:evidence` domain function. Roadmap says Run 10 finalizes HTTP API contracts (ROADMAP_DECISIONS.md:257-263), so a main-process aggregation seam now prevents duplicate renderer-only logic.
6. Verify optional Plan file discovery against a fixture that contains `contracts/clarify-api.md`, `data-model.md`, and `quickstart.md`; forensics already show the Plan fixture produced those files (specs/0008-ai-passive-steps/fixtures/speckit-agent-forensics.md:61-64).
7. Re-check current visual contract state after PR #10. The branch is at `fb1b905`, and the pre-existing worktree has many visual artifact modifications. Do not interpret dirty generated PNG/JSON files as Run 9 source changes.

Timebox: 45 minutes.

## S5 - Risks

- Evidence assembled from renderer session state will look right in the happy path and fail the crash/restart story. Disk-Is-Truth makes this the primary architectural risk.
- Review could accidentally become a seventh agent step or invent `copilot:review`. The roadmap and constitution both say Review is a Concierge surface, not a spec-kit canonical agent.
- Analyze report capture can violate the real Analyze read-only contract if implemented as an agent-authored `analyze.md`. The app should capture evidence, not ask Analyze to author source.
- Empty Analyze Step Commits can make the UI appear to have no evidence unless the report/no-diff explanation is first-class.
- `Resume {pending}` is ambiguous while the single-step-running invariant is unenforced. Run 9 must define deterministic fallback and warning behavior rather than pretending the invariant exists.
- Read-only dim can block artifact inspection if pointer-events are applied too broadly. Completed historical steps should be view-only for mutation, not unreadable.
- FIX-A through FIX-D are not cosmetic; they touch hooks, factories, passive IPC summaries, stream capture, copy, and visual harness credibility. They can inflate Run 9 beyond a normal final surface slice.
- The current branch/head differs from the prompt's `4d792a1` base, and pre-existing dirty visual artifacts exist. Spec authors should use live main deliberately or re-baseline explicitly.

## S6 - Cost Expectation

Run 9 base Review surface alone is smaller than Run 8: likely 35-55 Premium. It is mostly a terminal view, one smart container, one presentational surface, task modal reuse, and visual contracts.

With the four folded fixes, the honest range is 80-125 Premium:

- Review evidence aggregation IPC/factory/domain tests: 15-25.
- Review UI + task modal + dim/bounce states: 20-30.
- FIX-A optional Plan artifact discovery across manifest/factory/passive summary: 10-18.
- FIX-B Analyze report capture/display and empty-commit UX: 15-25.
- FIX-C hang UX threshold, inert-stream semantics, copy, visible banner: 8-15.
- FIX-D visual harness real component path plus stronger contracts: 15-25.

If the spec insists on Run 10-ready HTTP API abstraction now, add 5-10. If it merely creates a main-process domain function reusable by Run 10, that is already included.

## S7 - Recommended Sub-Decisions

Default `DISK`: Review evidence is main-process disk/git authoritative. Renderer session state may enrich only when it matches disk proof.

Default `REVIEW-EVIDENCE-IPC`: add a `review:evidence` RTK Query endpoint backed by a main-process/domain aggregator. This aligns Review with future Run 10 external API rather than trapping the evidence model in React.

Default `SPEC-CLARIFICATIONS`: parse committed `spec.md` Clarifications first; use `session.clarifyCompletion` only as a same-session enhancement.

Default `OPTIONAL-DISCOVERY`: implement Plan optional discovery in the passive lifecycle now and let Review consume the same summary. Optional artifacts are additive, never required.

Default `ANALYZE-CAPTURE`: capture the Analyze Markdown report as app-owned evidence after ACP terminal completion. Do not create or require `analyze.md` as a feature artifact.

Default `INERT-40`: change "appears hung" semantics to "no recent output" after 40 minutes of zero stream activity. Active streaming always means still working, never hung.

Default `VIEWONLY-NOT-BLOCKED`: dim completed mutable step surfaces, but keep evidence open actions accessible where the purpose is inspection. Review itself remains interactive for evidence review.

Default `RESUME-ACTUAL`: Resume targets the currently running step when one exists, otherwise the first pending step in canonical order; if multiple pending steps exist, show a warning and choose canonical order.

Default `NO-REVIEW-COMMIT`: Run 9 does not write a Review Step Commit. Run 12 owns JIRA output and any Review/JIRA commit semantics.

Default `REAL-CONTRACTS`: new Review visual contracts must use the real app/component path. Passive contract hardening should move away from synthetic injected markup where feasible.

Override words:

- `MEMORY-FIRST`: allow session state to be primary for display. Not recommended.
- `NO-NEW-IPC`: force renderer assembly. Not recommended.
- `AGENT-REPORT`: ask Analyze to write a report artifact. Not recommended.
- `BASE-4d792a1`: re-baseline from the prompt commit before spec writing. Requires explicit branch/worktree handling because the current observed branch is already at `fb1b905`.
