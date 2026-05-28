# Run 6 Implementation Plan - Specify Vertical

**Branch**: `spec/0006-specify-vertical` | **Date**: 2026-05-27 | **Spec**: `specs/0006-specify-vertical/spec.md`

**Input**: Feature specification from `specs/0006-specify-vertical/spec.md`; locked grill decisions from `specs/0006-specify-vertical/grill.md`; resolved seams from `specs/0006-specify-vertical/clarifications.md`; canonical renderer design from `design/v3-fetch/project/`; TDD discipline from `.agents/skills/tdd/SKILL.md`.

## Summary

Run 6 is the first user-facing vertical slice of the Concierge Electron app. It ports the v3 renderer shell into strict TypeScript, keeps state within the existing eight Redux slices, adds the nine locked IPC capabilities, and wires the Specify button through the Run 3 ACP supervisor and Run 5 lifecycle hooks so a user can sign in, choose a repository/session, start Specify, watch progress, and read the generated `spec.md`.

Implementation proceeds by vertical tracer bullets: one RED test, one minimal GREEN implementation, repeat. The first implementation test is `e2e/specify-vertical.spec.ts`, a Playwright end-to-end journey that asserts GitHub + Copilot sign-in, repo/session selection, prompt entry, Specify completion, `Concierge-Step: specify:pass` trailer, rendered non-empty markdown, and stepper state (`specify=complete`, `clarify=pending`).

## Technical Context

**Language/Version**: TypeScript 5.7.2 with `strict` and `noUncheckedIndexedAccess`.

**Primary Dependencies**: Existing Electron 33.2.1, React 18.3.1, React Redux 9.3.0, Redux Toolkit 2.12.0, pino 9.x, Vitest 2.1.8, Playwright 1.49.1, and `@agentclientprotocol/sdk@0.22.1`. Run 6 adds only `@fontsource/geist-sans` and `@fontsource/geist-mono`.

**Storage**: Git history and `Concierge-Step` trailers remain durable step truth. Preferences persist through the existing `preferences:write` IPC channel and Run 2 `safeWrite`. ACP transcripts, pino logs, and in-flight markers keep their Run 3-5 locations. Renderer state remains cache.

**Testing**: Playwright for the first end-to-end tracer, Vitest for co-located main/preload/renderer tests, React Testing Library for component behavior. Tests use public interfaces and mock only system boundaries: shell-outs, Electron IPC, filesystem writes, time, and browser APIs such as canvas/RAF where needed. Do not mock internal reducers, listener middleware collaborators, the ACP SDK, or the Run 3 supervisor.

**Target Platform**: Electron desktop app. CI remains Windows-only from Run 1.

**Project Type**: Desktop app with main/preload/renderer split.

**Performance Goals**: Preference changes persist within 250 ms after debounce in normal conditions. Activity history remains capped at 256. ACP stream events render incrementally without blocking the renderer. PixelCSpinner uses canvas + `requestAnimationFrame`, not React reconciliation.

**Constraints**: Do not redo Runs 2-5. Do not introduce a ninth slice. Do not change the activity cap from 256. Do not implement real Atlassian OAuth/MCP, JIRA sync UI, ArtifactViewer, TaskViewer, Clarify/Plan/Tasks/Analyze/Review bodies, HTTP server, or packaging changes. Do not add markdown/runtime UI dependencies beyond the two font packages. Handler logging tests must mock `createMainLogger`, not duck-typed logger objects.

**Scale/Scope**: One complete Specify pipeline, nine new IPC capabilities, double trust-boundary factories for each boundary-crossing shape, one reusable streaming event contract, v3 design component ports except `tweaks-panel.jsx`, one single renderer stylesheet, and targeted state/listener/API extensions inside the existing Run 4 layout.

## Constitution Check

**Gate status**: Pass.

- Principle I: Renderer reaches filesystem, git, auth shell-outs, ACP, and artifact reads only through preload/IPC and RTK Query. No renderer Node/Electron imports.
- Principle II: Step completion remains durable in git trailers. Renderer step state caches the latest lifecycle view only.
- Principle III: ACP interaction remains isolated under `src/main/data-layer/acp/`; Run 6 callers use the Run 3 supervisor/session APIs and never spawn a coding-agent binary outside that directory.
- Principle IV: Every new IPC capability has main-side and renderer/preload-entry trust-boundary factories. Run 6 factories use the seven-case floor: happy path, empty object named error, null named error, undefined named error, factory-specific hostile case, partial structurally-plausible input, and extra-key rejection.
- Principle V: Effects live in named IPC handlers, data-layer helpers, listener files, RTK Query endpoints, and preload bridge methods. Components remain props-only unless explicitly named as containers.
- Principle VI: Redux Toolkit remains the only renderer state stack. The slice catalog stays exactly `ui`, `preferences`, `auth`, `workspace`, `steps`, `session`, `activity`, and `copilot`.
- Principle VII: Specify execution routes through `before_specify` and `after_specify`, in-flight markers, Step Contract validation, and Step Commit trailers from Run 5.
- Principle VIII: Specify artifact validation reuses the Run 5 disk-entry factory and reads `spec.md` from the validated artifact path.
- Principle XV: IPC/lifecycle logs remain structured pino logs. Tests for handlers/hooks mock `createMainLogger`.
- TDD discipline: `.agents/skills/tdd/SKILL.md` was read before sequencing. Implementation must proceed by vertical tracer bullets, not horizontal batches.

No complexity-tracking violations are introduced.

## Project Structure

### Documentation (this feature)

```text
specs/0006-specify-vertical/
|-- spec.md
|-- grill.md
|-- clarifications.md
|-- plan.md
|-- research.md
`-- tasks.md                         # created by /speckit.tasks, not this plan

docs/adr/
`-- 0010-streaming-mutation-pattern.md

.github/
`-- copilot-instructions.md          # Run 6 conventions
```

### Source Code (repository root)

```text
e2e/
`-- specify-vertical.spec.ts

src/
|-- main/
|   |-- index.ts                     # registers Run 6 IPC handlers
|   |-- ipc/
|   |   |-- copilotSpecify.ts
|   |   |-- copilotSpecify.factory.ts
|   |   |-- copilotSpecify.factory.spec.ts
|   |   |-- auth.ts                  # extend with auth:gh:login, auth:copilot:login, auth:atlassian:login
|   |   |-- auth.factory.ts
|   |   |-- auth.factory.spec.ts
|   |   |-- repos.ts
|   |   |-- repos.factory.ts
|   |   |-- repos.factory.spec.ts
|   |   |-- branches.ts
|   |   |-- branches.factory.ts
|   |   |-- branches.factory.spec.ts
|   |   |-- git.ts                   # extend with git:checkout and git:createDraft
|   |   |-- git.factory.ts
|   |   |-- git.factory.spec.ts
|   |   |-- artifacts.ts
|   |   |-- artifacts.factory.ts
|   |   `-- artifacts.factory.spec.ts
|   |-- data-layer/
|   |   |-- auth/
|   |   |   |-- cliAuth.ts
|   |   |   `-- cliAuth.test.ts
|   |   |-- git/
|   |   |   |-- gitCommand.ts        # reuse runGit for checkout/createDraft/history
|   |   |   `-- branchSessions.ts
|   |   |-- repositories/
|   |   |   |-- repoList.ts
|   |   |   `-- repoList.test.ts
|   |   `-- acp/                     # reused only; no new spawners outside this directory
|   `-- hooks/                       # Run 5 lifecycle reused, not redone
|-- preload/
|   |-- index.ts                     # exposes invoke + subscribe methods for Run 6
|   `-- index.test.ts
`-- renderer/
    |-- index.tsx                    # imports ./styles/index.css and font packages
    |-- styles/
    |   `-- index.css                # single v3 stylesheet, orphan :root block dropped
    |-- components/
    |   |-- AppShell.tsx
    |   |-- SignInScreen.tsx
    |   |-- SignInScreenContainer.tsx
    |   |-- RepoBrowseScreen.tsx
    |   |-- RepoBrowseScreenContainer.tsx
    |   |-- Titlebar.tsx
    |   |-- TitlebarContainer.tsx
    |   |-- Stepper.tsx
    |   |-- WorkspaceContainer.tsx
    |   |-- SpecifyStep.tsx
    |   |-- SpecifyStepContainer.tsx
    |   |-- Activity.tsx
    |   |-- ActivityRailContainer.tsx
    |   |-- ActivityPill.tsx
    |   |-- ActivityPillContainer.tsx
    |   |-- PixelCSpinner.tsx
    |   |-- CustomizeModal.tsx
    |   |-- CustomizeModalContainer.tsx
    |   |-- AboutModal.tsx
    |   |-- RequestModal.tsx
    |   |-- Icons.tsx
    |   `-- Markdown.tsx
    |-- api/
    |   |-- copilotSpecify.endpoint.ts
    |   |-- copilotSpecify.factory.ts
    |   |-- copilotSpecify.factory.spec.ts
    |   |-- auth.endpoint.ts          # extend existing auth API
    |   |-- repositories.endpoint.ts
    |   |-- repositories.factory.ts
    |   |-- branches.endpoint.ts
    |   |-- artifacts.endpoint.ts
    |   `-- streamEvents.ts
    |-- listeners/
    |   `-- preferencesPersistence.listener.ts
    `-- slices/
        |-- ui.ts
        |-- preferences.ts
        |-- auth.ts
        |-- workspace.ts
        |-- steps.ts
        |-- session.ts
        |-- activity.ts
        `-- copilot.ts
```

**Structure Decision**: Keep the Run 2-5 layout. Main owns shell-outs, ACP orchestration, artifact reads, Step Commit path, pino logging, and IPC handlers. Preload owns the typed bridge and subscription cleanup. Renderer owns cache state, endpoints, listener middleware, and TSX components. Smart containers are separate from props-only components so data fetching and workflow branching stay out of presentational ports.

## Public Interfaces

### Step stream event contract

Defined once and reused by Runs 7-9:

```ts
type StepStreamEvent =
  | {
      type: 'progress';
      step: 'specify' | 'clarify' | 'plan' | 'tasks' | 'analyze' | 'review';
      sessionId: string;
      level: 'info' | 'ok' | 'warn' | 'error';
      message: string;
      timestamp: string;
    }
  | {
      type: 'done';
      step: 'specify' | 'clarify' | 'plan' | 'tasks' | 'analyze' | 'review';
      sessionId: string;
      status: 'pass' | 'fail';
      specMarkdown?: string;
      artifactPath?: string;
      commitSha?: string;
      reason?: string;
    };
```

Exactly one terminal `done` event is emitted per started run. `progress` events may be zero or many. A `pass` done event for Specify carries `specMarkdown`, `artifactPath`, and `commitSha` read from the validated Step Contract artifact path after Step Commit success. A `fail` done event carries `reason` and never marks Specify complete.

### New IPC capabilities

| Channel | Direction | Owner | Notes |
|---|---|---|---|
| `copilot:specify` | streaming mutation | `src/main/ipc/copilotSpecify.ts` | Runs before hook, ACP prompt, after hook, artifact readback, emits `StepStreamEvent`. |
| `auth:gh:login` | mutation | `src/main/ipc/auth.ts` | Real GitHub CLI login path; exposes starting/success/error to renderer. |
| `auth:copilot:login` | mutation | `src/main/ipc/auth.ts` | Real Copilot CLI login path; disabled until GitHub is ok. |
| `auth:atlassian:login` | mutation | `src/main/ipc/auth.ts` | Visual stub only; short delay then ok, no OAuth/MCP claims. |
| `repos:list` | query | `src/main/ipc/repos.ts` | Lists `collette-travel` repositories with distinguishing metadata. |
| `branches:sessions` | query | `src/main/ipc/branches.ts` | Lists `spec/*` branches and restored Step states from trailers. |
| `git:checkout` | mutation | `src/main/ipc/git.ts` | Checks out an existing session branch using Run 2 git shell-out path. |
| `git:createDraft` | mutation | `src/main/ipc/git.ts` | Creates/checks out `spec/draft-<base36 timestamp suffix>` from selected repo default branch; retries collisions by generating a new suffix. |
| `artifacts:read` | query | `src/main/ipc/artifacts.ts` | Reads text/size/mtime for the validated relative artifact path. |

### Renderer API endpoints

Run 6 extends the existing RTK Query `api` rather than adding another API slice. `RUN2_TAG_TYPES` remains unchanged. Endpoints:

- `runSpecify` mutation uses the streaming pattern in ADR-0010.
- `loginGitHub`, `loginCopilot`, and `loginAtlassianStub` mutations update the `auth` slice through public actions.
- `listRepos`, `listBranchSessions`, `checkoutBranch`, `createDraftBranch`, and `readArtifact` use existing preload invoke semantics and renderer-entry factories.
- `writePreferences` continues to call `preferences:write`; preferences persistence listener does not add a new channel.

### Renderer state ownership

- `ui`: activity rail visibility, modal flags (`showRequest`, `showAbout`, `showCustomize`), dropdown open-states (`RepoChip`, `BranchChip`, `ModelPicker`, `GearMenu`, `AuthChip`).
- `preferences`: accent, density, activity side, require-scroll-to-unlock, recent repositories, selected Copilot model, hydration/persistence status.
- `auth`: GitHub, Copilot, Atlassian statuses; identity; last error; GitHub-before-Copilot lock.
- `workspace`: selected repo, selected branch/session, active step, max reached step, viewed step.
- `steps`: existing three-state Step records only: `not_available | pending | complete`.
- `session`: Specify prompt, started/running flags, generated `spec.md`, artifact path, commit SHA, scroll progress, later-step placeholder data.
- `activity`: capped entries, current status line, busy state; cap stays 256.
- `copilot`: probed models/capabilities and selected model coordination; selected model is applied to `copilot:specify` using Run 3 `setSessionConfigOption` with `configOptions[id=model]`.

Component-local state:

- `SpecifyStep` owns `mode` and `editorOpen`.
- `Activity` owns its currently-rendered scroll position.
- Canvas animation internals stay inside `PixelCSpinner`.

### Smart/dumb component boundary

Smart containers may use typed store hooks and RTK Query hooks: `SignInScreenContainer`, `RepoBrowseScreenContainer`, `WorkspaceContainer`, `SpecifyStepContainer`, `TitlebarContainer`, `ActivityRailContainer`, `ActivityPillContainer`, and `CustomizeModalContainer`.

Props-only components: `SignInScreen`, sign-in row, `RepoBrowseScreen`, `BranchPickerView`, `Titlebar`, `AuthChip`, `RepoChip`, `BranchChip`, `ModelPicker`, `GearMenu`, `Stepper`, `ModeBadge`, `SpecifyStep`, `Activity`, `ActivityPill`, `PixelCSpinner`, `CustomizeModal`, `AboutModal`, `RequestModal`, `Icons`, and `Markdown`.

## Implementation Phases

### Phase 0 - Planning outputs

1. Create `specs/0006-specify-vertical/research.md` with the v3 component map, CSS strategy, font dependency choice, streaming mutation pattern, and preload subscribe pattern.
2. Create `docs/adr/0010-streaming-mutation-pattern.md`.
3. Update `.github/copilot-instructions.md` with Run 6 conventions.

### Phase 1 - Dependency and bridge foundation

1. Add only `@fontsource/geist-sans` and `@fontsource/geist-mono`.
2. Import fonts and `src/renderer/styles/index.css` once from `src/renderer/index.tsx`.
3. Extend preload types and implementation for the nine Run 6 capabilities, including a subscription helper for `copilot:specify` stream events.
4. Extend `IpcQueryArgs` and endpoint base utilities without creating a second RTK Query API slice or new tag taxonomy.

### Phase 2 - Main-process capabilities

1. Add/extend IPC handlers and factories for the nine locked channels.
2. Route GitHub/Copilot auth to real CLI shell-outs and Atlassian to a labeled stub.
3. Route repository/session/draft/checkout operations through data-layer helpers and Run 2 `runGit`.
4. Implement `copilot:specify` through Run 5 lifecycle hooks, Run 3 ACP supervisor, selected Copilot model config, exactly-one-terminal stream event enforcement, Step Contract artifact path readback, and structured pino logging.
5. Keep handler tests on `createMainLogger` mocks.

### Phase 3 - Renderer state and endpoints

1. Extend the existing eight slices with Run 6 fields and public actions.
2. Add selectors using `select<Slice><Field>` naming; memoize derived objects/arrays.
3. Add RTK Query endpoints for auth, repo/session, git, artifact, and Specify streaming.
4. Fill only `preferencesPersistence.listener.ts` among the four Run 4 empty listener bodies; reuse `preferences:write` with debounce and observable failure activity.
5. Preserve Run 5 `stepLifecycle.listener.ts` and `transcriptCapture.listener.ts` behavior.

### Phase 4 - v3 renderer port

1. Port the design per the mapping in `research.md`.
2. Use canonical step order `specify -> clarify -> plan -> tasks -> analyze -> review`.
3. Drop `tweaks-panel.jsx`; use `CustomizeModal`.
4. Start Specify prompt empty with placeholder `"What do you want to build today?"`.
5. Render later-step bodies as honest Run 7-9 placeholders only.
6. Keep activity cap 256 even though the design mock implies a larger log.

### Phase 5 - Specify journey integration

1. Wire sign-in gate: GitHub + Copilot open repository selection; Atlassian remains visible and optional.
2. Wire repository list, branch sessions, restored trailer state, checkout, and draft branch creation before workspace entry.
3. Wire Specify prompt, running, failure, and complete states to `runSpecify`.
4. On success, mark Specify complete, Clarify pending, read and render `spec.md`, and display commit identity.
5. On failure, preserve activity, avoid false completion, and route failure state through established Step Escape Hatch semantics.

## TDD Vertical Tracer-Bullet Sequence

Each item is one RED test followed by the minimum GREEN implementation for that behavior. Do not write the next test until the current test is green.

1. **RED** `e2e/specify-vertical.spec.ts`: fresh user signs into GitHub and Copilot, leaves Atlassian disconnected, picks a repo, starts a new draft session, types `"Build a hello-world feature"`, clicks Begin Specify, waits for completion, and verifies one `Concierge-Step: specify:pass` trailer, rendered non-empty `spec.md`, `specify=complete`, and `clarify=pending`. **GREEN** wire the thinnest full path with deterministic e2e shell-out/ACP/artifact boundaries.
2. **RED** auth gate component/container test: Copilot is locked until GitHub succeeds, Atlassian row is visible but optional. **GREEN** extend `auth` state/actions and `SignInScreenContainer`.
3. **RED** auth IPC handler test through registered handlers with `createMainLogger` mocked: GitHub and Copilot invoke real shell-out adapters; Atlassian stub returns ok after injected timer. **GREEN** extend `auth.ts` and factories.
4. **RED** renderer auth endpoint test through the preload bridge mock: successful login responses parse and update observable auth state; malformed responses fail parsing. **GREEN** add endpoint and renderer-entry factories.
5. **RED** repository browse behavior test: repositories filter by query, show metadata, and selecting a repo with no sessions creates a draft session. **GREEN** port `RepoBrowseScreen` and container.
6. **RED** repo/session IPC test: `repos:list` and `branches:sessions` validate input, reject extra keys, and restore trailer states in canonical step order. **GREEN** implement repo/session data helpers and factories.
7. **RED** draft branch e2e/unit slice: "Start a new session" calls `git:createDraft` before workspace entry and opens workspace on `spec/draft-<base36 suffix>`. **GREEN** implement draft branch creation and workspace state updates.
8. **RED** titlebar behavior test: repo, branch, auth, selected model, gear menu, Customize, About, and Request modal affordances render from state. **GREEN** port `Titlebar`, grouped chip/menu components, and containers.
9. **RED** preferences test: changing accent/density/activity side/scroll gate dispatches preferences update and calls existing `preferences:write` after debounce; failure records activity but does not block the journey. **GREEN** extend preferences slice and fill `preferencesPersistence.listener.ts`.
10. **RED** stylesheet/font smoke test: renderer imports font packages and single `styles/index.css`; orphan declarations from design lines ~29-40 are absent. **GREEN** port CSS and imports.
11. **RED** Specify prompt test: prompt starts empty, placeholder text is present, whitespace-only Begin is disabled, valid prompt enables Begin. **GREEN** port not-started `SpecifyStep` and session prompt state.
12. **RED** streaming endpoint test: `runSpecify` subscribes before start, dispatches progress events into activity, and unsubscribes on cache removal. **GREEN** implement RTK Query `onCacheEntryAdded` pattern and preload subscription cleanup.
13. **RED** main `copilot:specify` handler test: a successful run emits progress and exactly one `done/pass` with `specMarkdown`, `artifactPath`, and `commitSha` read from the validated Step Contract path after Step Commit. **GREEN** implement handler orchestration through lifecycle + ACP + artifact readback.
14. **RED** main `copilot:specify` failure test: ACP or factory failure emits exactly one `done/fail`, records reason, and does not mark Specify complete. **GREEN** wire failure path to Escape Hatch semantics and stream terminal guard.
15. **RED** Specify running/complete UI test: running state shows busy copy and activity pointer; complete state renders markdown preview/edit, scroll progress, pop-out editor, and Clarify unlock gate. **GREEN** complete `SpecifyStep` port and `Markdown` helper with no new markdown dependency.
16. **RED** stepper test: six steps render in canonical order; after Specify pass, Specify is complete, Clarify is pending/selectable placeholder, later steps remain `not_available` unless restored history says otherwise. **GREEN** port `Stepper` and workspace navigation.
17. **RED** activity rail/pill test: activity entries cap at 256, activity side honors preferences, hidden rail still leaves ActivityPill visible, PixelCSpinner speed responds to recent log rate. **GREEN** port `Activity`, `ActivityPill`, and typed `PixelCSpinner`.
18. **RED** placeholder coverage test: Clarify, Plan, Tasks, Analyze, Review bodies, ArtifactViewer, TaskViewer, and JIRA sync render only explicit Run 7-9 placeholders. **GREEN** add placeholder components/routes without implementing deferred experiences.
19. **RED** factory floor sub-tracer bullets for each new trust-boundary factory, one case at a time: happy path, empty object named error, null named error, undefined named error, hostile input, partial plausible input, extra-key rejection. **GREEN** implement only the parser branch needed for each case before moving to the next.
20. **RED** constitutional guard test: store still assembles exactly eight slices and the activity cap is 256. **GREEN** adjust state only inside existing slices.
21. **RED** final integration regression: Run 5 stepLifecycle and transcriptCapture listener tests still pass unchanged. **GREEN** fix only coupling introduced by Run 6.

## Verification Plan

- `npm run lint`
- `npm run typecheck`
- `npm run test:coverage`
- `npm run e2e`
- Manual app launch: SignInScreen -> RepoBrowseScreen -> workspace with six-step stepper -> Specify prompt -> running progress -> rendered `spec.md`.
- Manual/automated checks: exactly eight slices, activity cap 256, Pure/Effect boundary, nine IPC capabilities with double factories/logging, `createMainLogger` mocked in handler/hook logging tests, only two new runtime dependencies, Run 5 lifecycle listener regressions unchanged.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Streaming mutation emits duplicate terminal events during ACP/factory races. | ADR-0010 terminal guard in main handler plus endpoint tests for exactly-one `done`. |
| Design mock conflicts with locked decisions. | `research.md` marks all overrides: Atlassian optional, draft branch before workspace, canonical step order, no TweaksPanel, empty prompt, cap 256. |
| Renderer port leaks Electron/Node into components. | Keep all bridge access in `src/renderer/api/` and smart containers; component tests import props-only components. |
| Factory tests become horizontal. | Treat each seven-case floor item as a separate RED -> GREEN sub-tracer bullet. |
| Preferences persistence adds a duplicate IPC channel. | Listener reuses existing `preferences:write` endpoint only. |
| CSS invalid orphan block ships. | Drop design lines ~29-40 during port unless a later artifact proves the alternate `:root` theme is intentional. |

## Phase 1 Re-check

The planned design still passes the constitution after research: Run 6 adds only two font runtime dependencies, keeps the eight-slice state model, uses named effect files, preserves Run 5 lifecycle semantics, and documents the reusable streaming mutation pattern in ADR-0010 before implementation.
