# Grill Report - Run 7 Clarify Vertical

Branch checked: `spec/0007-clarify-vertical` at `c21bcc0086785a65d30848b897c11d4011f113c5`.

This is Phase 1 only. It does not draft `spec.md`, does not invoke a spec-kit command, and does not modify source outside this directory.

## Section 1 - Run 7 Scope Distilled

Run 7 is the Clarify user-facing vertical. The user should move from a completed Specify step into Clarify, see real clarification questions, answer multiple-choice prompts with a short-answer affordance, request another question, route malformed questions through bounded Clarify Re-ask, and complete the step with a Step Commit. The roadmap names the slice as "Clarify Vertical" and includes Specify to Clarify navigation, surfaced Clarify questions, multiple-choice plus short answer affordances, malformed-question Re-ask, structured malformation logging, and commit on completion (`ROADMAP_DECISIONS.md:92-98`). The API inventory already names the Clarify operations as `clarify:next`, `clarify:answer`, `clarify:reaskMalformed`, `clarify:askAnother`, and `clarify:commit` (`ROADMAP_DECISIONS.md:363-364`).

The rigor boundary is constitutional, not optional. Every Clarify question must have trimmed non-empty text with normalized line endings, at least two choices with key and label, a rendered short-answer affordance, no parser-confusing emphasis at the start of a line, and consistent line endings (`.specify/memory/constitution.md:287-294`). A failed question goes to Clarify Re-ask, not the full Step Escape Hatch, until the bounded retry path is exhausted (`.specify/memory/constitution.md:295-302`; `docs/adr/0009-clarify-reask-listener.md:17-26`).

Out of scope: redoing Run 6 app shell or Specify, re-architecting the Run 5 factory/listener/hook spine, changing the Step Lifecycle state model, introducing another state library or a ninth slice, implementing Plan/Tasks/Analyze/Review bodies, JIRA sync, HTTP API work, or packaging. ADR-0010 already locks the reusable streaming mutation shape for Runs 7-9, so Run 7 should extend that pattern rather than invent a Clarify-only stream contract (`docs/adr/0010-streaming-mutation-pattern.md:13-52`).

## Section 2 - Inheritance Audit

### 1. ClarifyStep component and container

Already exists: no renderer `ClarifyStep` implementation exists. `find src/renderer -path '*Clarify*'` returned no files. The current workspace renders a generic placeholder for every non-Specify step in `WorkspaceContainer` (`src/renderer/components/WorkspaceContainer.tsx:31-33`). Run 6 does mark Clarify pending after Specify pass in the Specify endpoint (`src/renderer/api/copilotSpecify.endpoint.ts:31-35`), and `SpecifyStepContainer` can trigger Specify only (`src/renderer/components/SpecifyStepContainer.tsx:22-35`).

Delta: add `ClarifyStep.tsx` and `ClarifyStepContainer.tsx`, replacing the placeholder when `viewedStep === 'clarify'`. The design source is explicit: progress row, question card, `Q` tag, question text, context hint, selectable choice cards, short-answer textarea, pips, "Ask another question", previous, and next/finish nav (`design/v3-fetch/project/steps.jsx:185-296`). CSS already contains the intended Clarify rules, including `.clarify-shell`, `.clarify-progress`, `.question-card`, `.choices`, `.choice`, `.short-answer`, and `.clarify-actions` (`design/v3-fetch/project/styles.css:3168-3283`).

### 2. `copilot:clarify` streaming IPC channel

Already exists: `copilot:specify` is the only step pipeline IPC handler. It validates request and ack factories, starts the Bound CLI, runs `beforeSpecifyHook`, prompts Copilot, runs `afterSpecifyHook`, reads the validated artifact, emits progress events and one terminal `done`, and logs success/failure (`src/main/ipc/copilotSpecify.ts:52-171`). Preload exposes only `copilot.specify` and `subscribeSpecify` (`src/preload/index.ts:48-63`). Renderer `baseQuery` only knows `copilot:specify` among Copilot channels (`src/renderer/api/baseQuery.ts:3-24`, `src/renderer/api/baseQuery.ts:97-98`).

Delta: add `copilot:clarify` plus `copilot:clarify:event` as a copy-shape, but factor the event type first. Despite ADR-0010 saying `StepStreamEvent.step` spans all steps (`docs/adr/0010-streaming-mutation-pattern.md:16-34`), both main and renderer types are currently specify-only (`src/main/ipc/copilotSpecify.factory.ts:5-23`; `src/renderer/api/streamEvents.ts:1-19`). Run 7 must widen or extract a shared step-stream factory before adding Clarify.

### 3. `clarify.factory.ts` hardening

Already exists: the factory is 85 LOC and already parses blocks into questions, choices, and short-answer presence. It returns a three-way shape: success commit, factory escape, or `{ ok:false, kind:'malformed-questions', wellFormedQuestions, malformedQuestions, rawText }` (`src/main/domain/factories/clarify.factory.ts:51-84`). It currently logs structured malformations with question id, category, raw output, timestamp, and model id (`src/main/domain/factories/clarify.factory.ts:5-19`). The test file has only three cases: no-questions sentinel, missing artifact, and missing short-answer logging (`src/main/domain/factories/clarify.factory.test.ts:12-44`).

Delta: the code does not yet meet the constitutional strictness. The CRLF/mixed-line-ending check is suspect because the current condition only flags one narrow mixed case (`src/main/domain/factories/clarify.factory.ts:26-28`). The block split uses `rawText.split(/\n\s*\n/)`, which is not normalized first and can miss or mis-handle CRLF boundaries (`src/main/domain/factories/clarify.factory.ts:66`). The no-questions sentinel is accepted with a loose case-insensitive substring, while R5-C04 says the exact trimmed sentinel `no questions needed` is valid (`specs/0005-step-lifecycle-hooks/clarifications.md:18`). Parser-breaking emphasis is only detected at line start with `**` or `__`, and tests do not cover the seven-case hardening floor requested for Run 7 (`src/main/domain/factories/clarify.factory.ts:21-49`; `src/main/domain/factories/clarify.factory.test.ts:12-44`).

### 4. `clarifyApi`

Already exists: the roadmap names the operations, but no RTK Query Clarify API is present. The renderer API index imports `copilotSpecify.endpoint` only for the step pipeline family, and `rg` found no `reaskMalformed` or `askAnother` implementation. `baseQuery` has no `clarify:*` channels (`src/renderer/api/baseQuery.ts:3-24`).

Delta: add `clarifyApi` with `clarify:next`, `clarify:answer`, `clarify:reaskMalformed`, `clarify:askAnother`, and `clarify:commit`. The key design decision is whether these are pure renderer/local state mutations, IPC mutations, or wrappers around `copilot:clarify`; the roadmap calls them API inventory, so they should cross the IPC boundary where disk, ACP, or Step Commit are involved.

### 5. Listener body completion

Already exists: `clarifyQuestionMalformed` action and payload type exist in `steps.ts` (`src/renderer/slices/steps.ts:25-32`, `src/renderer/slices/steps.ts:147-149`). The listener tracks attempts per `sessionId:questionId`, logs the rewrite request, and after `nextAttempt >= 3` dispatches `stepReset({ step:'clarify', reason:'clarify-rigor-exhausted' })` plus activity (`src/renderer/listeners/stepLifecycle.listener.ts:20-21`, `src/renderer/listeners/stepLifecycle.listener.ts:81-117`). ADR-0009 says the listener must prompt the Bound CLI to rewrite only the malformed question and preserve well-formed questions (`docs/adr/0009-clarify-reask-listener.md:17-25`).

Delta: the current body is log-only before exhaustion. It does not dispatch a mutation, does not call `clarify:reaskMalformed` or `copilot:clarify`, does not include well-formed context, and does not push the rewritten output back through the factory. The retry bound also fires on the third dispatch before a third rewrite attempt is made; that may or may not match the intended "bounded to 3 attempts" semantics and should be clarified.

### 6. Visual contract

Already exists: the harness is present and wired as `npm run vd:loop` (`package.json:21-26`). Current visual-diff report is 24/24 PASS as of `2026-05-28T23:06:53.255Z` (`e2e/visual-diff/artifacts/results/visual-diff-report.md:1-6`). Screens are configured for sign-in, repo browse, titlebar, stepper states, Specify states, activity, customize, about, and request modal (`e2e/visual-diff/harness/screens.config.ts:150-176`).

Delta: no ClarifyStep screen contract exists yet. There is a `stepper-clarify-current` contract, but that only verifies the stepper state, not the Clarify body (`e2e/visual-diff/harness/screens.config.ts:159-165`). Run 7 needs at least two Clarify body contracts: normal question answering and malformed/re-ask state.

## Section 3 - Architectural Choice Points Worth Grilling

### Q1 - Re-ask prompt context

When the listener asks the agent to rewrite one malformed question, what context should the prompt include?

- A. Malformed question only plus its position and category. Lowest token cost; highest risk of duplicate/reordered question semantics.
- B. Malformed question plus all well-formed question ids/text as read-only context. Recommended. Moderate token cost; best guard against reorder/drift.
- C. Full raw `clarifications.md`. Maximum context; highest transcript pollution and highest chance the agent rewrites more than one question.

### Q2 - Partial result rendering

When the factory returns well-formed and malformed questions together, what does the UI show immediately?

- A. Render well-formed questions and visibly malformed cards while rewrite runs. Most faithful to Constitution VIII and ADR-0009; more UI states.
- B. Render well-formed questions but hide malformed cards behind a re-ask banner. Simpler; conflicts with "never hidden" unless the raw malformed block remains inspectable.
- C. Wait for rewrite before showing any questions. Simplest user model; weakest match to "malformed questions remain visible."

### Q3 - Answer retention during re-ask

If the user answers Q1 and Q3 while Q2 is being rewritten, what happens to those answers?

- A. Preserve answers keyed by stable question ids. Recommended. Requires stable ids through rewrite.
- B. Freeze answering while any re-ask is pending. Safer but blocks progress and makes Clarify feel slow.
- C. Clear all answers after any rewrite. Lowest implementation complexity; poor UX and unnecessary data loss.

### Q4 - Retry count semantics

Does "bounded to 3 attempts" mean three rewrite prompts are allowed, or the third malformed dispatch immediately exhausts?

- A. Allow attempts 1, 2, and 3; exhaust on the fourth failed validation. Better natural-language match to "3 attempts"; requires changing current `>= 3`.
- B. Current behavior: dispatch 1 and 2 re-ask, dispatch 3 exhausts. Simpler because already coded; only two actual re-prompts.
- C. Store attempt state in the Clarify slice and make the listener stateless. More inspectable; broader state work.

### Q5 - `clarify:askAnother` session model

When the user clicks "Ask another question", should it reuse the same ACP session?

- A. Same Bound CLI session and same transcript. Recommended for continuity; transcript gets longer.
- B. New ACP session with prior spec and answers summarized. Cleaner transcript boundary; more prompt construction work.
- C. No ACP call; local placeholder until commit. Fastest but not a real Clarify vertical.

### Q6 - Commit timing

When should `Concierge-Step: clarify:pass` be written?

- A. Only after all visible questions have valid selected choices and the Step Contract validates `clarifications.md`. Recommended; matches disk-is-truth.
- B. After questions are generated, regardless of answers. Simpler but makes HITL answers non-load-bearing.
- C. After each answer. Very auditable but creates too many commits and breaks the one-step-one-pass expectation.

### Q7 - Short-answer contract

Is the short-answer affordance required in the persisted agent output, the rendered UI, or both?

- A. Persisted output must contain an explicit short-answer marker and UI must render the textarea. Strongest contract; more parser rigidity.
- B. Persisted output need only have choices; UI always supplies textarea. Lower agent burden; may conflict with Principle VIII wording.
- C. Persisted output has an optional `short answer` marker; factory normalizes missing marker into a warning. Lenient but weakens strictness.

### Q8 - Malformation log location

Where does the disk-backed malformation log live?

- A. `userData/clarify-malformations.jsonl`. Recommended default: global audit stream, easy to inspect.
- B. `userData/sessions/<sessionId>/clarify-malformations.jsonl`. Better session locality; more path plumbing.
- C. Feature directory under `specs/0007-...`. Bad for product runs because source tree and user session data blur.

### Q9 - Clarify state ownership

Where should in-flight questions and answers live?

- A. Extend `session` slice with Clarify questions, answers, active index, and re-ask state. Recommended; matches Run 6 use of session slice for active prompt/spec markdown.
- B. Extend `steps` slice. Avoids another slice but pollutes step lifecycle records with HITL form state.
- C. Add `clarify` slice. Clear domain model; violates the eight-slice lock unless constitution changes.

### Q10 - Stream event payload for Clarify pass

What should `done/pass` for `copilot:clarify` carry?

- A. `artifactPath`, `commitSha`, and parsed questions/answers summary. Useful renderer completion state; needs widened event factory.
- B. `artifactPath` and `commitSha` only. Smaller event; renderer must query artifact and parse separately.
- C. Full `clarifications.md` raw text plus parsed state. Easier UI handoff; more duplicated trust-boundary payload.

### Q11 - Concurrent user action during re-ask

What happens if the user clicks Next, Previous, Ask Another, or Finish while a malformed question rewrite is in flight?

- A. Allow navigation and answering of unaffected questions; disable only Finish and the malformed question card. Best UX; highest state complexity.
- B. Freeze all Clarify controls until rewrite resolves. Simpler and safer.
- C. Allow everything and reconcile on completion. Fast but race-prone.

### Q12 - Visual contract coverage

How many Clarify visual-diff screens are required before Run 7 can pass?

- A. Two: normal question and malformed/re-ask. Recommended minimum; covers unique Run 7 risk.
- B. Three: normal, ask-another generated question, malformed/re-ask. Better coverage of design behavior; modest added work.
- C. One: normal question only. Fastest but misses the constitutional affordance.

## Section 4 - Verify-Now Opportunities

Verified now:

- Branch and base are correct: `git branch --show-current` returned `spec/0007-clarify-vertical`, and `git rev-parse HEAD` returned `c21bcc0086785a65d30848b897c11d4011f113c5`.
- Renderer Clarify body is absent: `find src/renderer -path '*Clarify*' -print` returned no files.
- The reusable stream pattern is not yet reusable in code: ADR-0010 names all steps, but main and renderer event factories are still specify-only (`src/main/ipc/copilotSpecify.factory.ts:5-23`; `src/renderer/api/streamEvents.ts:1-19`).
- Preload subscribe helper is not reusable as-is. It is hard-coded to `subscribeSpecify` and `copilot:specify:event` (`src/preload/index.ts:48-63`), so Run 7 either adds a matching `subscribeClarify` or abstracts a generic step stream helper.
- Visual-diff is green before Run 7 body work. The current report says 24/24 PASS (`e2e/visual-diff/artifacts/results/visual-diff-report.md:1-6`), but no Clarify body screen is in `screens.config.ts` (`e2e/visual-diff/harness/screens.config.ts:150-176`).
- Copilot ACP availability was checked locally. `copilot --help` includes `--acp`, and `copilot --version` reports `GitHub Copilot CLI 1.0.55`; the repo manifest is still verified against 1.0.54 (`src/main/data-layer/agents/agents.json:4-12`). That is a drift worth recording before relying on new transcript evidence.

Not completed within the verify-now budget:

- I did not capture a real `clarify-transcript.jsonl`. The app has a supervisor path that can write sanitized transcripts (`src/main/data-layer/acp/transcript.ts:66-83`), but the current product handler only prompts Specify. A clean Clarify transcript capture should be done through a small harness or the new `copilot:clarify` handler, not by ad hoc manual JSON-RPC over stdio. Recommended Phase 2 prep: create `specs/0007-clarify-vertical/fixtures/clarify-transcript.jsonl` from a controlled ACP session before locking the spec's exact event assumptions.

## Section 5 - Risks

- The strict factory can reject valid output if line-ending detection or block splitting is wrong. The current code checks a narrow CRLF condition and splits before normalization, so hardening can accidentally make Clarify brittle.
- The listener can become an infinite or premature loop if "three attempts" is interpreted differently between action dispatch, ACP prompt, and factory validation. Current code exhausts on `>= 3` before a third rewrite prompt.
- Re-ask can race with answer capture. Clarify is the first step where the user may be editing local HITL state while the agent is still repairing a different artifact block.
- ACP transcript pollution is real. Rewrites and ask-another cycles may all be `session/prompt` turns in the same session; without prompt shape discipline, the transcript becomes hard to audit.
- The stream event contract is duplicated and specify-only. Adding Clarify by copy-paste will deepen the mismatch with ADR-0010.
- The UI has to represent malformed questions visibly without rendering raw parser-confusing markdown in a way that breaks layout or security expectations.
- Visual fidelity needs to cover both happy Clarify and malformed/re-ask states. A single normal screen would miss the constitutional part of the run.
- The Copilot CLI version drift from manifest 1.0.54 to local 1.0.55 may change ACP event shape or config behavior. Cheap transcript proof should happen before implementation leans on assumptions.

## Section 6 - Cost Expectation

Honest Premium estimate: 45-75 Premium for a rigorous Run 7, with an 80-95 Premium upper band if live ACP transcript capture or visual-diff stabilization exposes protocol/UI drift.

Why this is below Run 6's roughly 67.5 Premium in the median case: Run 6 already paid for shell, auth, repo/session navigation, `copilot:specify`, Step Commit proof, and the visual-diff harness. Run 7 reuses those. Why it can still reach or exceed Run 6: Clarify is the first true intra-step HITL state machine, the strictest factory, and the first listener-mediated ACP rewrite loop. Run 6.5's 30-40 hour autonomous fidelity pass is a warning that even with design CSS present, visual parity can consume real time; Clarify adds brand-new body states, not just polishing existing ones.

Recommended planning assumption: budget 2-3 focused implementation passes plus 1 visual-fidelity pass. Do not plan this as a small "copy Specify and add a form" run.

## Section 7 - Recommended Sub-Decisions I Pick

- Default re-ask context: include malformed question, question position, malformation category, and well-formed question ids/text as read-only context. Rationale: prevents reorder while keeping prompt bounded. Override word: `malformed-only`.
- Default retry semantics: allow three actual rewrite attempts and exhaust on the fourth failed malformed dispatch. Rationale: matches normal reading of "3 attempts". Override word: `two-reasks`.
- Default Clarify state home: extend the `session` slice, not `steps`, and do not add a ninth slice. Rationale: Clarify answers are session-local WIP, while `steps` should remain lifecycle state. Override word: `steps-own-answers`.
- Default malformed log path: `userData/clarify-malformations.jsonl`. Rationale: constitutional disk-backed audit without tying logs to source tree files. Override word: `separate-by-session`.
- Default stream contract: widen/extract `StepStreamEvent` once before adding `copilot:clarify`. Rationale: ADR-0010 already made the general event shape load-bearing. Override word: `copy-specify`.
- Default visual contract minimum: add two screens, `clarify-question` and `clarify-malformed-reask`. Rationale: covers the normal user journey and the unique constitutional affordance. Override word: `three-clarify-screens`.
- Default `askAnother`: same ACP session, one additional bounded prompt, no new session. Rationale: the user is still inside Clarify for one feature branch. Override word: `new-session-askanother`.
- Default completion: commit only after all current questions have selected choices, optional notes are captured, malformed rewrites are resolved, `afterClarifyHook` validates, and the Step Commit writer returns a SHA. Rationale: preserves Disk Is Truth and HITL meaning. Override word: `commit-on-generation`.
