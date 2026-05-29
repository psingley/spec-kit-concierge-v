# Research: Run 8 AI-Passive Steps Vertical

## Decision: Reuse ADR-0010 streaming for Plan, Tasks, and Analyze

**Rationale**: ADR-0010 already defines step pipeline streams as progress events plus exactly one terminal `done`. The Run 8 transcript probes show Plan and Tasks can stream text, thoughts, tool calls, and tool-call updates for long periods without reliable terminal usage/cost metadata, so a stable Concierge terminal event must be owned by the pipeline handler after lifecycle validation and Step Commit.

**Alternatives considered**:
- Create step-specific stream unions: rejected because ADR-0010 already covers all six step names and forbids drift.
- Use ACP terminal messages directly: rejected because captured Plan/Tasks transcripts did not reliably terminate.
- Include full artifact bodies in terminal payloads: rejected because artifact reads must be lazy and large artifacts can exceed safe renderer payload size.

## Decision: Add a typed `StatusStep` row union

**Rationale**: Plan is artifact-centric, Tasks needs task-detail rows, and Analyze is remediation/milestone-centric. A typed union lets one presentational surface render artifact evidence rows, milestone rows, task rows, remediation rows, and hang rows without inventing three separate status boards.

**Alternatives considered**:
- Artifact-only rows: rejected because Tasks and Analyze need non-artifact evidence.
- Milestone-only rows: rejected because evidence affordances must be tied to validated artifact paths.
- New step lifecycle states: rejected because ADR-0008 locks lifecycle state to `not_available`, `pending`, and `complete`.

## Decision: Add `registerPassiveStepIpc` for Plan, Tasks, and Analyze only

**Rationale**: The three passive steps share lifecycle orchestration, ACP prompt execution, progress forwarding, exactly-one-terminal enforcement, artifact/remediation summary creation, and logging. A small helper reduces copy-paste bugs while preserving step-specific prompt, contract, and summary differences.

**Alternatives considered**:
- Copy three full IPC handlers: rejected because duplicate terminal and lifecycle bugs would be likely.
- Generalize Specify and Clarify too: rejected as a broad refactor outside Run 8.
- General step framework for all future stages: rejected because Review/JIRA has different semantics and belongs to later runs.

## Decision: Preserve `artifacts:read` and read artifacts on click

**Rationale**: The shipped app already uses plural `artifacts:read`. The user locked that naming for Run 8. Lazy read keeps initial passive status screens fast and prevents large markdown/contracts from flowing through terminal stream payloads.

**Alternatives considered**:
- Rename to singular `artifact:read`: rejected because it risks breaking shipped Run 6/7 paths and contradicts the Run 8 lock.
- Add a singular alias now: rejected as extra API surface without a current user-facing need.
- Preload all done-row artifacts: rejected because large artifacts and binary files would hurt renderer responsiveness.

## Decision: Use `react-markdown`, `rehype-sanitize`, and `remark-gfm` only

**Rationale**: The markdown probe proved the locked dependency set renders headings, GFM tables, task lists, fenced code classes, blockquotes, links, inline code, and nested lists while stripping hostile script/raw HTML when `rehype-raw` is not enabled. `remark-gfm` is required for spec-kit tables and task lists.

**Alternatives considered**:
- Keep the hand-rolled renderer: rejected because it cannot safely cover GFM tables/task lists and currently uses unsafe paragraph HTML insertion.
- Add `rehype-raw`: rejected because raw HTML rendering increases XSS risk and is explicitly locked out.
- Add syntax highlighting libraries: rejected because Run 8 needs code readability, not highlighted runtime complexity.
- Virtualize markdown blocks: deferred because the 512 KiB size guard is sufficient for v1.

## Decision: Enforce 512 KiB metadata-only guard for text, markdown, and code artifacts

**Rationale**: The spec locks 512 KiB as the oversized threshold. Artifact reads over that size return safe metadata and actions without inline content, protecting renderer memory and layout performance.

**Alternatives considered**:
- Render large files with truncation: rejected because truncated artifact evidence can be mistaken for complete proof.
- Stream large files into the modal: rejected as too much Run 8 complexity.
- Raise the threshold: rejected because the spec locks it.

## Decision: Rewrite Analyze around remediation targets and no-diff pass

**Rationale**: `contract-reconciliation.md`, the roadmap, and Constitution Principle VII agree that Analyze may remediate `spec.md`, `plan.md`, and `tasks.md`, must allow an empty Step Commit, and must not require `analyze.md`. Current implementation expecting `analyze.md` is drift that Run 8 must remove.

**Alternatives considered**:
- Keep `analyze.md`: rejected because it conflicts with locked spec and roadmap.
- Require both `analyze.md` and remediation validation: rejected because it invents an artifact spec-kit does not promise.
- Allow arbitrary remediation files: rejected because Analyze must remain bounded and auditable.

## Decision: Parse Tasks enough for stable task details

**Rationale**: The spec requires id, title, phase/area, dependencies, files, acceptance notes, and estimate when present. The parser should accept useful optional fields but reject malformed structures that prevent stable identity, dependency understanding, or safe presentation.

**Alternatives considered**:
- Raw markdown viewer only: rejected because users need inspectable task rows.
- Owner/status parsing: deferred because tasks.md does not guarantee stable owner/status fields.
- Lenient identity fallback: rejected because unstable task identity breaks detail links and dependencies.

## Decision: Use `.specify/feature.json` as active feature source when present

**Rationale**: Transcript probes showed detached HEAD and branch-name drift are realistic. Disk pinning avoids deriving feature directories from branch names when spec-kit already supplies a source of truth.

**Alternatives considered**:
- Branch-name-only resolution: rejected because detached HEAD and renamed branches break it.
- Renderer-cached active feature: rejected because disk is truth and feature pin can change outside renderer memory.

## Decision: Keep hang detection soft and listener-owned

**Rationale**: Constitution Principle VII and roadmap lock the 20-minute ACP silence behavior: visible soft notification with Cancel/Restart guidance, no auto-fail, no auto-retry, no auto-cancel. Existing listener ownership should be extended rather than adding a new component subscription.

**Alternatives considered**:
- Activity-only hang entry: rejected because Run 8 requires visible guidance.
- Auto-fail/retry after silence: rejected by constitution.
- Component-local timer: rejected because ACP stream lifecycle belongs to listener/RTK Query infrastructure.

## Decision: Extend existing session state only

**Rationale**: The eight-slice lock is explicit. Passive pipeline state belongs under existing `session.pipelines.<step>`, while lifecycle state stays in `steps`, activity stays in `activity`, and artifacts/task details live in RTK Query caches.

**Alternatives considered**:
- New `passiveSteps` slice: rejected by locked decisions.
- Store artifact bodies in `session`: rejected because artifact content is lazy RTK Query data, not durable state.
- Put stream state in components: rejected because components must not subscribe to ACP directly.

## Decision: Add exactly 10 visual screens

**Rationale**: The spec locks exactly 10 new visual screens while preserving the inherited 27. The screen set covers the state matrix for Plan/Tasks/Analyze plus artifact, task, hang, and markdown edge states without exploding visual-diff cost.

**Alternatives considered**:
- Fewer than 10 screens: rejected because it under-covers the passive-step surface.
- More than 10 screens: rejected because the spec locks the count.
- Merge all modal variants into one screen: rejected because markdown/oversize and task detail need separate coverage.

## Decision: Observability includes IPC, ACP, lifecycle, errors, and transcripts

**Rationale**: Constitution Principle XV and spec FR-043 require passive-step observability. Every attempt must record IPC handler outcome, ACP turn activity, lifecycle transitions, error paths when present, and local transcript references.

**Alternatives considered**:
- Activity-only evidence: rejected because activity is display-only and not enough for audit.
- Raw transcript as UI source: rejected because transcripts are audit fixtures, not the live UI contract.
