# Research: Run 6 Specify Vertical

**Date**: 2026-05-27  
**Feature**: `specs/0006-specify-vertical/spec.md`  
**Design source**: `design/v3-fetch/project/`

## Decisions

### R6-R01: v3 design component map

**Decision**: Port the v3 design file-by-file into strict TSX, with smart containers separated from props-only components. `tweaks-panel.jsx` is not ported; `CustomizeModal` replaces it.

| Design file | Design exports/contents | Run 6 target | Notes |
|---|---|---|---|
| `app.jsx` | `App`, `STEPS`, `ModeBadge`, shell state, mock pipelines, modal wiring | `src/renderer/components/AppShell.tsx`, `src/renderer/components/WorkspaceContainer.tsx`, `src/renderer/components/Stepper.tsx`, `src/renderer/components/TitlebarContainer.tsx` | Replace local mock state with eight slices and RTK Query. Use canonical step order `specify -> clarify -> plan -> tasks -> analyze -> review`, not design order. Draft branch is created before workspace entry, not at Begin. |
| `signin.jsx` | `SignInScreen` with GitHub, Copilot, Atlassian rows | `src/renderer/components/SignInScreen.tsx`, `src/renderer/components/SignInScreenContainer.tsx` | Keep three visible rows. Gate repository/workspace entry on GitHub + Copilot only. Atlassian button is labeled as a Run 6 visual stub. |
| `repo-browse.jsx` | `RepoBrowseScreen`, `BranchPickerView` | `src/renderer/components/RepoBrowseScreen.tsx`, `src/renderer/components/RepoBrowseScreenContainer.tsx` | Replace `REPOS`/`BRANCHES` globals with `repos:list`, `branches:sessions`, `git:checkout`, and `git:createDraft`. Search/filter stays component behavior. |
| `topbar.jsx` | `useClickOutside`, `RepoChip`, `BranchChip`, `GearMenu`, `AboutModal`, `ModelPicker`, `AuthChip`, row helpers | `src/renderer/components/Titlebar.tsx`, `src/renderer/components/TitlebarContainer.tsx`, `src/renderer/components/AboutModal.tsx` | Group chip/menu components because they share `useClickOutside`. Correct auth chip semantics to optional Atlassian. Correct step labels to `review` internally. |
| `steps.jsx` | `SpecifyStep`, `ClarifyStep`, `StatusStep`, `ArtifactViewer`, `TaskViewer`, `JiraSyncingView`, `JiraSyncedSplash`, `FinalStep` | `src/renderer/components/SpecifyStep.tsx`, placeholder components inside `WorkspaceContainer.tsx` or `StepPlaceholders.tsx`, deferred viewers as placeholders only | Fully port only Specify. Clarify/Plan/Tasks/Analyze/Review bodies render Run 7-9 placeholders. ArtifactViewer, TaskViewer, JIRA sync/splash are not implemented in Run 6. |
| `md.jsx` | `renderMarkdown` helper | `src/renderer/components/Markdown.tsx` | Keep lightweight renderer; no new markdown runtime dependency. Escape HTML as design does. |
| `activity.jsx` | `Activity` rail | `src/renderer/components/Activity.tsx`, `src/renderer/components/ActivityRailContainer.tsx` | Use activity slice entries, current status, busy state, cap 256. Keep rendered scroll position local. |
| `activity-pill.jsx` | `ActivityPill` and log-rate speed calculation | `src/renderer/components/ActivityPill.tsx`, `src/renderer/components/ActivityPillContainer.tsx` | Use canonical step ids; map `review` to final visual refinement where needed. Pill remains visible when rail is hidden. |
| `pixel-c-spinner.jsx` | Canvas `PixelCSpinner` | `src/renderer/components/PixelCSpinner.tsx` | Port verbatim algorithm with typed refs/context. Use canvas + RAF; mock canvas/RAF in tests. |
| `customize-modal.jsx` | `CustomizeModal`, `CzSection`, `CzRow`, `CzSegmented`, `CzToggle` | `src/renderer/components/CustomizeModal.tsx`, `src/renderer/components/CustomizeModalContainer.tsx` | Owns accent, density, activity side, and require-scroll preferences. Replaces TweaksPanel. |
| `request-modal.jsx` | `RequestModal` scaffold | `src/renderer/components/RequestModal.tsx` | UI scaffold only. No `concierge:report` IPC in Run 6. |
| `icons.jsx` | `Ico` namespace | `src/renderer/components/Icons.tsx` | Export typed icon components. Inline SVG only. |
| `data.jsx` | Mock `REPOS`, `BRANCHES`, `SPEC_MD`, `COPILOT_MODELS`, `INITIAL_LOG`, deferred artifacts/tasks | `src/renderer/designDefaults.ts` for display constants only, real data via endpoints | Do not seed `SAMPLE_PROMPT`; first Specify prompt is empty. Use static defaults only where no Run 6 source exists. Do not import deferred fake artifacts/tasks as real product data. |
| `styles.css` | Full design stylesheet plus invalid orphan declarations near lines 29-40 | `src/renderer/styles/index.css` | Single stylesheet imported once. Drop orphan declarations unless later design evidence proves an alternate `:root` block was intentional. |
| `tweaks-panel.jsx` | v2 floating edit-mode panel and `useTweaks` host protocol | Not ported | Explicitly excluded by FR-003a. |

**Rationale**: The v3 design is canonical for renderer shape, but locked Run 6 decisions override design-local mock behavior. A file-by-file port preserves visual fidelity while the smart/dumb split keeps store and effects out of presentational components.

### R6-R02: CSS porting strategy

**Decision**: Port design CSS to a single `src/renderer/styles/index.css`, imported once from `src/renderer/index.tsx`.

**Rules**:

- Preserve the design's BEM-ish class names (`signin-row`, `tb-chip`, `rb-card`, `activity-pill`, `md-panel`, etc.) to minimize JSX churn.
- Do not split CSS modules in Run 6; Vite will bundle/minify the single stylesheet.
- Drop the orphan declarations in `design/v3-fetch/project/styles.css` lines 28-40. They are a second variable block without a selector after `:root` closes and are invalid CSS as written.
- Keep the first `:root` block as source of truth unless a future design transcript proves the orphan block was an intentional alternate theme.
- Apply runtime accent/density/activity side choices through root class/data attributes or CSS variables set by the `preferences` slice/container, not by rewriting the stylesheet.
- Keep `PixelCSpinner` visuals in canvas; CSS only sizes/positions `.pixel-c-canvas`.

**Rationale**: The design stylesheet is cohesive and small enough for one file. Splitting during the TSX port would create unnecessary class renaming and risk visual regressions.

### R6-R03: Font dependencies

**Decision**: Add only `@fontsource/geist-sans` and `@fontsource/geist-mono`.

**Implementation**:

```ts
import '@fontsource/geist-sans/400.css';
import '@fontsource/geist-sans/500.css';
import '@fontsource/geist-sans/600.css';
import '@fontsource/geist-mono/400.css';
import './styles/index.css';
```

CSS font stacks:

```css
html, body {
  font-family: "Geist Sans", ui-sans-serif, system-ui, sans-serif;
}

.mono {
  font-family: "Geist Mono", ui-monospace, "SF Mono", Menlo, monospace;
}
```

**Rejected alternatives**:

- Google Fonts CDN: rejected because the desktop app should retain offline-capable visual fidelity.
- Generic system fonts only: rejected because FR-041 locks Geist fidelity.
- Any icon/font/UI runtime package: rejected by Run 6 dependency constraints.

### R6-R04: Streaming mutation pattern via RTK Query `onCacheEntryAdded`

**Decision**: Model step execution as an RTK Query mutation with a preload subscription registered in `onCacheEntryAdded`. The mutation starts the run and stream events update Redux slices through public actions.

**Pattern**:

```ts
const copilotSpecifyApi = api.injectEndpoints({
  endpoints: (builder) => ({
    runSpecify: builder.mutation<SpecifyRunStarted, SpecifyRunRequest>({
      query: (payload) => ({ channel: 'copilot:specify', payload }),
      async onCacheEntryAdded(arg, { dispatch, cacheDataLoaded, cacheEntryRemoved }) {
        const unsubscribe = window.concierge.copilot.subscribeSpecify(arg.subscriptionId, (event) => {
          if (event.type === 'progress') {
            dispatch(recordActivity(stepStreamEventToActivity(event)));
            return;
          }

          dispatch(recordActivity(stepStreamEventToActivity(event)));
          if (event.status === 'pass') {
            dispatch(stepCompleted({
              step: event.step,
              commitSha: event.commitSha!,
              trailer: `Concierge-Step: ${event.step}:pass`
            }));
            dispatch(specifyCompleted({
              specMarkdown: event.specMarkdown!,
              artifactPath: event.artifactPath!,
              commitSha: event.commitSha!
            }));
          } else {
            dispatch(stepReset({ step: event.step, reason: event.reason ?? 'specify-failed' }));
          }
        });

        try {
          await cacheDataLoaded;
          await cacheEntryRemoved;
        } finally {
          unsubscribe();
        }
      }
    })
  })
});
```

**Important constraints**:

- Subscribe before or at mutation start so early progress is not missed.
- Treat `done` as terminal. After a terminal event, ignore further events for that run and surface duplicate terminal attempts in logs/tests.
- The main handler is the source of truth for exactly-one-terminal `done`; renderer guards are defensive.
- Progress events append activity and busy/current status. Done/pass updates steps/session/artifact state. Done/fail records failure and avoids false completion.
- Later Runs 7-9 reuse the same `StepStreamEvent` shape and `onCacheEntryAdded` pattern for `clarify`, `plan`, `tasks`, `analyze`, and `review` pipelines.

**Rationale**: RTK Query already owns remote data lifecycles. `onCacheEntryAdded` gives a natural attach/detach point for Electron stream subscriptions while keeping cross-slice updates in public Redux actions.

### R6-R05: Electron preload subscribe channel pattern for ACP stream events

**Decision**: Expose a typed preload subscription helper for `copilot:specify` stream events. The capability name remains `copilot:specify`; any internal renderer event name derives from that capability and is not registered as an additional product IPC capability.

**Shape**:

```ts
type StepStreamUnsubscribe = () => void;

window.concierge.copilot = {
  specify: (request: unknown) => ipcRenderer.invoke('copilot:specify', request),
  subscribeSpecify: (
    subscriptionId: string,
    onEvent: (event: StepStreamEvent) => void
  ): StepStreamUnsubscribe => {
    const listener = (_event, payload: unknown) => {
      const parsed = parseRendererStepStreamEnvelope(payload);
      if (parsed.ok && parsed.value.subscriptionId === subscriptionId) {
        onEvent(parsed.value.event);
      }
    };

    ipcRenderer.on('copilot:specify:event', listener);
    return () => ipcRenderer.off('copilot:specify:event', listener);
  }
};
```

Main handler behavior:

1. Validate `copilot:specify` request and `subscriptionId`.
2. Emit progress envelopes to `event.sender.send('copilot:specify:event', { subscriptionId, event })`.
3. Emit exactly one terminal done envelope.
4. Return a small start/ack result from the invoke call so the mutation knows the run was accepted.

**Notes**:

- `copilot:specify:event` is a derived transport event for the single `copilot:specify` streaming capability, not a tenth Run 6 business capability.
- Preload owns listener cleanup and envelope validation before the renderer endpoint sees events.
- The same suffix pattern is reused by later step pipelines: `<capability>:event`, where capability is `copilot:<step>`.

**Rationale**: Electron has separate invoke and event primitives. Keeping a typed subscribe helper in preload prevents components from handling raw `ipcRenderer` and creates a repeatable bridge pattern for ACP-backed step streams.

## Resolved design conflicts

| Conflict | Resolution |
|---|---|
| Design gates workspace on GitHub + Copilot + Atlassian. | Run 6 gates on GitHub + Copilot only. Atlassian is visible and optional. |
| Design creates draft branch when Begin is clicked. | `git:createDraft` runs when "Start a new session" is chosen before workspace entry. |
| Design order is `specify -> clarify -> plan -> analyze -> tasks -> final`. | Renderer uses spec-kit canonical `specify -> clarify -> plan -> tasks -> analyze -> review`. |
| Design imports `tweaks-panel.jsx`. | Do not port. Gear menu opens `CustomizeModal`. |
| Design seeds `SAMPLE_PROMPT`. | Prompt starts empty with placeholder `"What do you want to build today?"`. |
| Design mock activity can grow beyond Run 4 cap. | Cap remains 256. |
| Design `styles.css` has orphan declarations after `:root`. | Drop them during port. |

## Open questions

None. The spec, grill, clarifications, and user constraints lock all decisions needed for implementation.
