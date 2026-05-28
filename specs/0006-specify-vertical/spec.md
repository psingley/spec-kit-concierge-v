# Feature Specification: Run 6 Specify Vertical

**Feature Branch**: `spec/0006-specify-vertical`

**Created**: 2026-05-27

**Status**: Draft

**Input**: User description: "Build Run 6 (Specify Vertical) of the Concierge Electron desktop app as the first user-facing vertical slice: users can launch the app, sign into GitHub and Copilot CLI, optionally connect the Atlassian stub, pick a repo, start a session, enter a Specify prompt, begin the pipeline, watch progress, and view rendered `spec.md`. Source of truth for resolved grill questions is `specs/0006-specify-vertical/grill.md`."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Complete the first Specify journey end-to-end (Priority: P1)

As a Concierge user, I need to launch the desktop app, satisfy the required GitHub and Copilot prerequisites, choose a repository, type a feature prompt, start Specify, watch progress, and read the generated specification, so Concierge visibly proves that the Run 2-5 foundations work as a real product journey.

**Why this priority**: This is the first user-facing vertical slice and the highest-value proof of integration. It exercises auth UI, repository selection, renderer state, IPC, the Copilot supervisor, step lifecycle hooks, Step Contract validation, Step Commit trailers, activity streaming, and artifact display.

**Independent Test**: Can be fully tested by a fresh-user Playwright flow that mocks shell-out authentication for determinism, selects a repository, types "Build a hello-world feature", clicks "Begin specify", waits for completion, and verifies the Step Commit trailer, rendered markdown, and stepper state.

**Acceptance Scenarios**:

1. **Given** a fresh app launch with no satisfied prerequisites, **When** the user signs into GitHub and Copilot, **Then** the workspace gate opens even if Atlassian remains unconnected.
2. **Given** GitHub and Copilot are connected, **When** the user picks a repository and starts a new session, **Then** the workspace displays the six-step stepper with Specify available and later steps visible but not implemented for Run 6.
3. **Given** the user enters a Specify prompt and clicks Begin, **When** the pipeline completes successfully, **Then** the user sees non-empty rendered `spec.md`, the activity stream shows progress, and the active branch has a `Concierge-Step: specify:pass` trailer.
4. **Given** Specify completes, **When** the stepper is inspected, **Then** Specify is complete and Clarify is pending or next, without implying Clarify body support in Run 6.

---

### User Story 2 - Understand prerequisite status without Atlassian blocking Specify (Priority: P1)

As a Concierge user, I need clear prerequisite rows and titlebar status chips for GitHub, Copilot, and Atlassian, so I know which services are connected while only the services needed for Specify block my workspace entry.

**Why this priority**: Authentication is the first screen users see. Run 6 must preserve the design's three-row prerequisite presentation while honoring the locked grill decision that Atlassian is a visual stub until its owning run.

**Independent Test**: Can be tested by rendering the sign-in screen, completing GitHub and Copilot login flows, leaving Atlassian disconnected, and verifying the app enters repository selection while Atlassian remains visible as optional/stubbed.

**Acceptance Scenarios**:

1. **Given** GitHub is not connected, **When** the sign-in screen renders, **Then** the Copilot action is locked behind GitHub and the Atlassian row is visible.
2. **Given** GitHub and Copilot are connected, **When** Atlassian is still disconnected, **Then** repository selection is available and the titlebar still exposes Atlassian status.
3. **Given** the user clicks the Atlassian row in Run 6, **When** the stub completes, **Then** the status changes to connected after a short visual delay and no real OAuth claim is made.

---

### User Story 3 - Browse repositories and sessions before entering the workspace (Priority: P1)

As a Concierge user, I need to browse available organization repositories, inspect existing Spec Kit session branches, and either resume or create a draft session, so I can start Specify in the correct working context.

**Why this priority**: The Specify journey is only meaningful when tied to a selected repository and branch/session. This story connects the auth gate to the workspace without yet requiring later step bodies.

**Independent Test**: Can be tested by providing repository and branch-session data, selecting a repository, resuming an existing session or creating a draft session, and verifying the workspace titlebar reflects the chosen repo and branch.

**Acceptance Scenarios**:

1. **Given** authenticated prerequisites, **When** repositories are listed, **Then** the user can search/filter and select a repository.
2. **Given** a repository with existing `spec/*` sessions, **When** the branch picker opens, **Then** session branches and their restored step states are visible.
3. **Given** the user chooses to start a new session, **When** the draft branch is created, **Then** the workspace opens on that branch in the Specify prompt-input phase.

---

### User Story 4 - See Concierge working through design-faithful UI (Priority: P2)

As a Concierge user, I need the Run 6 UI to match the v3 design bundle's shell, titlebar, activity rail, activity pill, spinner, customization modal, and Specify states, so the first product impression feels coherent and purposeful.

**Why this priority**: The v3 design is canonical for renderer shape, styling, interaction patterns, fonts, and component inventory. Visual fidelity makes the vertical slice demonstrable and usable.

**Independent Test**: Can be tested by rendering the shell in each primary state: sign-in, repository browse, workspace prompt, Specify running, and Specify complete.

**Acceptance Scenarios**:

1. **Given** the app renders any Run 6 screen, **When** styling is inspected, **Then** the Geist font family and design stylesheet conventions are applied. **Note:** `design/v3-fetch/project/styles.css` contains invalid orphan CSS declarations at lines ~29-40 (a second alternate accent theme block that lost its `:root` selector after the first block closes). The port to `src/renderer/styles/index.css` MUST either (a) wrap the orphan block in its own `:root` (if the alternate theme is intentional and should be the source-of-truth for the design's "blood crimson" alternate accent), OR (b) drop the orphan block entirely (if it was a stale dev artifact). Implementer should pick (b) unless they confirm via the design's chat transcript that the alt-accent block was intentional.
2. **Given** the Specify pipeline is running, **When** activity is flowing, **Then** the activity pill and pixel-C spinner communicate busy state and progress feel.
3. **Given** the user opens the gear menu, **When** Customize is selected, **Then** accent, density, activity-side, and scroll-gate preferences are editable and persist.

---

### User Story 5 - Preserve constitutional slice and effect boundaries (Priority: P2)

As a Concierge maintainer, I need Run 6 to extend the existing eight slices, named listener files, and trust-boundary patterns without introducing a ninth slice or ad hoc effects, so the first UI vertical remains compatible with the constitution and previous runs.

**Why this priority**: Run 6 is a wiring run over completed foundations. It must not regress the state model, Pure/Effect boundary, IPC factory discipline, or step lifecycle invariants established in Runs 2-5.

**Independent Test**: Can be tested by inspecting slice count, listener ownership, IPC handler factories, renderer-entry factories, pino invocation logs, and unchanged Run 5 lifecycle listener bodies.

**Acceptance Scenarios**:

1. **Given** Run 6 state extensions are complete, **When** renderer slices are counted, **Then** there are still exactly eight constitutional slices: ui, preferences, auth, workspace, steps, session, activity, and copilot.
2. **Given** a new IPC channel is invoked, **When** inputs cross the main or preload boundary, **Then** the boundary factory validates the payload and structured invocation logging occurs.
3. **Given** listener middleware is reviewed, **When** Run 6 changes are compared with Run 5, **Then** only preferences persistence receives a new body among the previously empty listener bodies, while Run 5 stepLifecycle and transcriptCapture remain intact.

### Edge Cases

- GitHub login succeeds but Copilot login is still locked, starting, fails, or reports an unavailable state.
- Atlassian remains disconnected while Specify is run; the workspace still opens and JIRA-related behavior remains unavailable for later runs.
- Repository listing fails, returns no repositories, or includes repositories with missing optional metadata.
- Existing session branches have no readable trailer history or have trailer states that restore as not available.
- Draft branch creation fails because the branch already exists, the repository is dirty, or checkout is rejected.
- The user clicks Begin with an empty or whitespace-only prompt.
- The Specify pipeline emits progress events, warnings, errors, or a final done event in rapid succession.
- The Specify pipeline fails before a Step Commit is written; the UI must not claim completion or show a false pass trailer.
- The generated `spec.md` is empty, missing, too large for comfortable display, or cannot be read after completion.
- The user toggles preview/edit modes before satisfying the scroll gate.
- Activity side is set to hidden while a pipeline is busy; the activity pill still indicates busy state.
- Preferences persistence fails; the current session remains usable and the failure is observable.
- Later-step placeholders are visible but cannot imply Clarify, Plan, Analyze, Tasks, Review, JIRA sync, artifact viewer, or task viewer support in Run 6.
- Run 6 must not change the activity ring buffer cap from 256.
- The design bundle's stale or conflicting guidance must not override the resolved grill decisions and constitutional eight-slice lock.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST ship the Run 6 vertical journey where a user can launch the app, satisfy required prerequisites, select a repository/session, enter a Specify prompt, start Specify, observe progress, and view the generated `spec.md`.
- **FR-002**: The system MUST use the v3 design bundle at `design/v3-fetch/project/` as the canonical source for renderer shape, component inventory, styling, and interaction patterns, except where the resolved grill decisions explicitly override it.
- **FR-003**: The system MUST include the Run 6 in-scope UI inventory: app shell, titlebar chips and menus, sign-in screen, repository browse screen, branch picker, six-step stepper, Specify step, activity rail, activity pill, pixel-C spinner, customize modal, about modal, request modal scaffold, icons, markdown helper, and needed design data defaults.
- **FR-003a**: The system MUST NOT port `tweaks-panel.jsx` (the v2 floating Tweaks panel). The v3 design's HTML still imports this file but its functionality is intentionally replaced by `CustomizeModal` accessed via the gear menu. Run 6 ports CustomizeModal instead; TweaksPanel is explicitly excluded from the renderer.
- **FR-003b**: The system MUST locate the following transient UI flags in component-local React state, NOT in the `ui` slice (state lives where its lifetime makes sense; cross-component coordination uses the `ui` slice): SpecifyStep's editor `mode` and `editorOpen`, the activity rail's currently-rendered scroll position. Activity-rail visibility (`showActivity`), modal flags (`showRequest`, `showAbout`, `showCustomize`), and dropdown open-states (RepoChip/BranchChip/ModelPicker/GearMenu/AuthChip) belong in the `ui` slice because multiple components observe them.
- **FR-004**: The system MUST render placeholders for Clarify body, Status bodies for later steps, Final/Review body, ArtifactViewer, TaskViewer, and JIRA-synced splash rather than implementing those deferred experiences.
- **FR-005**: The system MUST require GitHub and Copilot CLI authentication before entering repository selection or workspace.
- **FR-006**: The system MUST keep Atlassian visible as a sign-in row and titlebar status but MUST NOT require Atlassian to enter the workspace or run Specify in Run 6.
- **FR-007**: The Atlassian Run 6 action MUST be a clearly labeled visual stub that reaches a connected-looking state without performing real OAuth or claiming real Atlassian integration.
- **FR-008**: The GitHub authentication action MUST invoke the real GitHub login path; the Copilot authentication action MUST invoke the real Copilot CLI authentication path; both MUST expose starting, success, and error states to the renderer.
- **FR-009**: The Copilot login action MUST remain unavailable until GitHub authentication is satisfied.
- **FR-010**: The repository selection experience MUST list organization repositories with enough metadata for users to distinguish them and MUST support search/filtering.
- **FR-011**: The branch/session picker MUST show existing `spec/*` sessions for the selected repository and surface restored step state from Concierge Step trailer history where available.
- **FR-012**: Users MUST be able to create a new draft session branch from the repository picker and enter the workspace on that draft session.
- **FR-013**: The titlebar MUST show current auth, repository, branch, model, and gear/customization affordances while the workspace is active.
- **FR-014**: The stepper MUST display six steps in canonical order: specify, clarify, plan, tasks, analyze, and review.
- **FR-015**: During Run 6, Specify MUST be the only fully implemented step body; later step bodies MUST be visible only as placeholders for their owning future runs.
- **FR-016**: The Specify prompt area MUST start empty on first launch and MUST use placeholder copy "What do you want to build today?".
- **FR-017**: The system MUST reject or disable Begin for an empty or whitespace-only Specify prompt.
- **FR-018**: Clicking Begin with a valid prompt MUST start the real Specify pipeline through the Run 5 step lifecycle and Run 3 Copilot supervisor rather than a design mock.
- **FR-019**: The Specify pipeline MUST emit user-visible progress while running and one completion result that includes readable `spec.md` content and the relevant Step Commit identity.
- **FR-020**: On successful Specify completion, the system MUST validate the generated artifacts through the Specify Step Contract, write a Step Commit with `Concierge-Step: specify:pass`, remove in-flight state, mark Specify complete, and display rendered markdown.
- **FR-021**: On Specify failure, the system MUST avoid false completion, surface an understandable failure state, preserve observable activity, and follow the established Step Escape Hatch behavior.
- **FR-022**: The rendered `spec.md` viewer MUST provide preview/edit modes, scroll progress, scroll-gate behavior controlled by preferences, and a popped-out editor modal as described by the design.
- **FR-023**: The markdown renderer MUST render generated specification content without adding a new markdown runtime dependency.
- **FR-024**: The activity rail MUST show capped progress/activity history, current status copy, and busy state while preserving the Run 4 cap of 256 entries.
- **FR-025**: The activity pill MUST remain available to toggle activity visibility and MUST communicate busy/progress feel through the pixel-C spinner.
- **FR-026**: The customize modal MUST allow users to change accent, density, activity stream position, and require-scroll-to-unlock preference.
- **FR-027**: Customization preferences MUST persist to user data and rehydrate without blocking the active user journey if persistence fails.
- **FR-028**: The renderer state MUST remain within the eight constitutional slices and MUST NOT introduce a ninth slice such as `org`.
- **FR-029**: The auth slice MUST represent GitHub, Copilot, Atlassian, identity, and last-error states needed by the Run 6 sign-in and titlebar flows.
- **FR-030**: The workspace slice MUST represent active step, maximum reached step, and currently viewed step in addition to existing repository and branch state.
- **FR-031**: The session slice MUST represent prompt, started state, generated specification markdown, scroll progress, and placeholders for later pipeline data without implementing later runs.
- **FR-032**: The preferences slice MUST represent accent, density, activity side, require-scroll behavior, recent repositories, and selected Copilot model.
- **FR-033**: The activity slice MUST represent entries, cap 256, current status line, and busy state.
- **FR-034**: Run 6 MUST add exactly the nine locked IPC capabilities for Specify, three auth actions, repository listing, branch sessions, checkout, draft branch creation, and artifact reading.
- **FR-035**: Each new IPC capability MUST have a main-process trust-boundary factory, renderer/preload-entry trust-boundary factory, structured pino invocation logging, and co-located tests.
- **FR-036**: The streaming Specify capability MUST support progress events and a single final done event suitable for Run 7-9 pipeline reuse.
- **FR-037**: The preload bridge MUST expose the nine new capabilities through the existing invoke/subscribe bridge patterns, including streaming subscription support for Specify.
- **FR-038**: The renderer API layer MUST expose Run 6 queries and mutations for Specify, auth, repository/session selection, checkout/draft creation, and artifact reading.
- **FR-039**: The preferences persistence listener MUST be filled with debounced persistence behavior; the other listener bodies that belong to future dispatching runs MUST remain empty.
- **FR-040**: Run 5 stepLifecycle and transcriptCapture listener behavior MUST remain intact.
- **FR-041**: Run 6 MUST add the Geist Sans and Geist Mono font dependencies for offline-capable design fidelity and MUST NOT add any other runtime dependencies.
- **FR-042**: Run 6 MUST document the streaming mutation pattern for step pipelines in ADR-0010 during planning.
- **FR-043**: Run 6 MUST update Copilot/project instructions with conventions for component naming, smart/dumb split, single stylesheet, canvas spinner, font dependencies, and IPC naming.
- **FR-044**: The first implementation test MUST be the Playwright vertical tracer bullet described in the grill and user request; lower-level tests cascade after that tracer exists.
- **FR-045**: Run 6 MUST NOT introduce real Atlassian MCP integration, HTTP server, JIRA submission, Windows packaging changes, a ninth state slice, JIRA sync UI, ArtifactViewer, TaskViewer, or complete later-step bodies.
- **FR-046**: Final verification MUST include lint, typecheck, coverage, end-to-end tests, app launch/manual journey, constitutional eight-slice check, Pure/Effect boundary check, IPC logging/factory checks, and listener-regression checks.

### Key Entities *(include if feature involves data)*

- **Prerequisite Status**: The user's connection state for GitHub, Copilot, and Atlassian, including unknown, out, starting, ok, locked, and error states as applicable.
- **User Identity**: Displayable identity information associated with successful GitHub authentication, such as username and avatar.
- **Repository Summary**: A repository row available for selection, including name, default branch, recent activity, size, and primary language where available.
- **Branch Session**: A `spec/*` branch for a selected repository, including branch identity and restored Concierge step state from trailers.
- **Workspace Selection**: The active repository, active branch/session, current step, maximum reached step, and viewed step.
- **Specify Session**: The active prompt, whether Specify has started, generated `spec.md` content, scroll progress, and placeholders for later pipeline data.
- **Step State**: The visible progress state for each Spec Kit step, preserving Run 5 lifecycle semantics while supporting Run 6 stepper display.
- **Activity Entry**: A capped, user-visible event describing auth, repository, pipeline, lifecycle, or artifact progress.
- **Preference Profile**: Persisted user choices for accent, density, activity rail placement, scroll unlock behavior, recent repositories, and Copilot model.
- **Streaming Specify Run**: A single started pipeline invocation that emits progress events and one final completion or failure result.
- **Generated Specification Artifact**: The `spec.md` content produced by Specify and read back for rendered display after validation and Step Commit success.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A fresh-user end-to-end test completes the GitHub + Copilot sign-in, repository selection, prompt entry, Specify run, rendered spec display, trailer verification, and stepper verification flow successfully.
- **SC-002**: 100% of Run 6 in-scope design components render in at least one automated or manual verification path, while 100% of explicitly deferred components render only placeholders.
- **SC-003**: 9 of 9 new IPC capabilities have double trust-boundary validation, structured invocation logging, and co-located tests.
- **SC-004**: The renderer contains exactly 8 constitutional slices after Run 6 and no additional application slice is introduced.
- **SC-005**: The activity history cap remains 256 entries in tests and runtime state.
- **SC-006**: The Specify journey writes exactly one successful `Concierge-Step: specify:pass` trailer on completion and never shows complete state without a valid artifact read.
- **SC-007**: 100% of empty-prompt attempts are blocked before starting the Specify pipeline.
- **SC-008**: Users can reach repository selection with GitHub and Copilot connected while Atlassian remains disconnected in Run 6.
- **SC-009**: Preference changes made in Customize are persisted within 250 milliseconds after debounce under normal conditions and are restored on a subsequent launch.
- **SC-010**: The new vertical e2e test and existing smoke e2e test both pass.
- **SC-011**: Lint, typecheck, and coverage verification all exit successfully.
- **SC-012**: Test count grows substantially above Run 5's 513 tests, with an implementation target of at least 700 tests for Run 6 completion.
- **SC-013**: Manual app launch demonstrates the complete first-run journey: SignInScreen → RepoBrowseScreen → workspace with six-step stepper → Specify prompt → running progress → rendered `spec.md`.
- **SC-014**: Runtime dependency additions are limited to `@fontsource/geist-sans` and `@fontsource/geist-mono`.
- **SC-015**: Run 5 lifecycle and transcript listener behavior remains covered and unchanged by Run 6 regression tests.

## Assumptions

- Runs 2 through 5 are complete on main and provide the data layer, ACP supervisor, Redux/IPC skeleton, step lifecycle hooks, dispatcher, Step Contracts, transcript capture, in-flight marker primitives, and Step Commit writer described in the grill.
- The existing branch for this feature is `spec/0006-specify-vertical`, and the feature directory is `specs/0006-specify-vertical`.
- The v3 design bundle is available locally at `design/v3-fetch/project/` and is the canonical renderer reference.
- Organization repository listing targets `collette-travel` for Run 6 as specified by the grill.
- Shell-out authentication can be mocked in automated e2e tests even though the production Run 6 path uses real GitHub and Copilot CLI flows.
- The planning phase will create ADR-0010; the specify phase records it as a requirement but does not author ADR content.
- "Review" is the project/spec-kit canonical name for the sixth step even where design artifacts use "final" wording.
- Non-Specify step bodies remain placeholders even if their state rows or labels are visible in the stepper.
- Atlassian connection state in Run 6 is intentionally stubbed and does not create real OAuth, MCP, or JIRA submission behavior.

## Deviations from grill

- The specification follows the detailed Q2 resolution and the user's Run 6 locked-decision summary: GitHub + Copilot gate workspace entry, while Atlassian is visible but not required. This intentionally overrides the contradictory late summary line in `grill.md` that says "3 prerequisites required"; it does not override the resolved Q2 section.
- No deliverable is deferred or split relative to the user's Run 6 request. Any later-step UI named in the design is placeholder-rendered only where the grill marks it out of Run 6 scope.
