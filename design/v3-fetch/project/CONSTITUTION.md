# Spec-kit Concierge — State Architecture Constitution

This is the canonical breakdown of state for the Electron + React + Redux Toolkit
implementation of Spec-kit Concierge. The split between **slices** (pure client
state) and **RTK Query APIs** (everything that crosses the IPC boundary to the
main process) is non-negotiable — it's what keeps the renderer from accumulating
ad-hoc fetch logic, caching bugs, and stale-mutation pain.

## Architecture at a glance

```
┌──────────────────────────────────────────────────────────────────┐
│                         Renderer (React)                         │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │   Slices    │  │ RTK Query    │  │ Listener Middleware      │ │
│  │  (UI/work)  │  │ APIs (IPC)   │  │ (cross-domain effects)   │ │
│  └─────────────┘  └──────────────┘  └──────────────────────────┘ │
│         │                │                       │               │
└─────────┼────────────────┼───────────────────────┼───────────────┘
          │                │                       │
          │       ┌────────▼───────────┐           │
          │       │   IPC Bridge       │ ◄─── streamed pipeline events
          │       │ (window.electronAPI)│
          │       └────────┬───────────┘
          │                │
┌─────────▼────────────────▼───────────────────────────────────────┐
│                         Main (Electron)                          │
│   gh CLI  ·  copilot CLI  ·  git  ·  JIRA REST  ·  concierge API │
└──────────────────────────────────────────────────────────────────┘
```

**Rule of thumb:**
- If it lives in the renderer and never leaves → **slice**.
- If it crosses the IPC bridge or hits a network → **RTK Query API**.
- If two domains need to coordinate on a change → **listener middleware**, not a thunk in either slice.

---

## Slices (pure client state)

### `ui` — modal open/close, transient view state
| Field | Type | Notes |
|---|---|---|
| `modal.artifactViewer` | `string \| null` | filename of evidence artifact being viewed |
| `modal.taskViewer` | `string \| null` | task id (e.g. `T-05`) being viewed |
| `modal.bugReport` | `boolean` | report-a-bug modal open |
| `modal.about` | `boolean` | about modal open |
| `dropdowns.repoChip` | `boolean` |  |
| `dropdowns.branchChip` | `boolean` |  |
| `dropdowns.modelChip` | `boolean` |  |
| `dropdowns.gear` | `boolean` |  |
| `dropdowns.authChip` | `boolean` |  |
| `activityRail.visible` | `boolean` | default `false`; persisted in `preferences` |

Reset on route changes only when it makes sense (modals stay across step nav so users don't lose context).

### `preferences` — tweak settings, persisted to disk
| Field | Type |
|---|---|
| `accent` | `[string, string]` (hero, dim) |
| `density` | `"compact" \| "regular" \| "comfy"` |
| `activitySide` | `"left" \| "right" \| "hidden"` |
| `requireScrollToUnlock` | `boolean` |
| `lastUsedRepos` | `Array<{ repo: string, at: ISO }>` (LRU cap 10) |

Persist via `electron-store` mirrored into the slice on app boot. Writes go through a debounced listener — never direct from a reducer.

### `auth` — identity + CLI session state (derived from `authApi`)
| Field | Type |
|---|---|
| `identity.username` | `string \| null` |
| `identity.avatarUrl` | `string \| null` |
| `gh.status` | `"unknown" \| "out" \| "starting" \| "ok" \| "error"` |
| `copilot.status` | `"unknown" \| "out" \| "starting" \| "locked" \| "ok" \| "error"` |
| `copilot.subscription` | `{ plan, scopes } \| null` |
| `lastError` | `string \| null` |

Listener middleware syncs `auth.gh.status` and `auth.copilot.status` from the `authApi.getStatus` query. Avoid duplicating — read the truth from the query cache for transient flows, mirror only what other slices need to subscribe to declaratively.

### `org` — current organization scope
| Field | Type |
|---|---|
| `current` | `string \| null` (e.g. `"collette-travel"`) |
| `available` | `string[]` (memberships) |

Single-org today, but defined as an array so we don't have to refactor when multi-org lands.

### `workspace` — current repo + branch + step pointer
| Field | Type |
|---|---|
| `repo` | `string \| null` |
| `branch` | `string \| null` (null = on main, no draft yet) |
| `step` | `"specify" \| "clarify" \| "plan" \| "analyze" \| "tasks" \| "review"` |
| `maxStep` | same enum — furthest unlocked |
| `viewing` | same enum — what the user is currently looking at (may be < maxStep when reviewing read-only) |

Invariants enforced by reducer:
- `maxStep` is monotonic — never decreases.
- `viewing <= maxStep`.
- Switching `repo` or `branch` resets `step`, `maxStep`, `viewing` to `"specify"`.

### `session` — per-branch spec-kit session state
| Field | Type |
|---|---|
| `prompt` | `string` |
| `started` | `boolean` |
| `specMd` | `string` (in-memory copy of `spec.md`, edits flushed via `sessionApi.saveSpec`) |
| `specScrollProgress` | `0..100` |
| `clarify.answers` | `Record<questionId, { choice, note }>` |
| `clarify.extraQuestions` | `Question[]` (asked-on-demand) |
| `pipelines.plan` | `{ items: StatusItem[], state: PipelineState }` |
| `pipelines.analyze` | same shape |
| `pipelines.tasks` | same shape |

Pipeline items are populated by streaming events from the corresponding API; the slice owns the **display shape** while the API owns the **transport**.

Keyed by `{repo, branch}` if you want session persistence across app restarts — recommended. Use an `EntityAdapter` keyed by `${repo}#${branch}`.

### `activity` — log stream + ambient busy state
| Field | Type |
|---|---|
| `entries` | `LogEntry[]` (ring buffer, cap ~2000) |
| `current` | `string` (HTML-ish status line shown at top of rail) |
| `busy` | `boolean` |

The entries array is append-only from the renderer's perspective. A single listener middleware subscribes to **every** RTK Query mutation lifecycle (`addListener({ matcher: isAnyOf(...) })`) and translates it into `cmd`/`info`/`ok`/`err` lines. Don't dispatch log lines from components.

### `copilot` — model selection
| Field | Type |
|---|---|
| `model` | `string` (model id) |
| `available` | (read from `copilotApi.listModels` query cache) |

Persisted in `preferences` so it sticks per machine.

---

## RTK Query APIs (IPC + network)

All endpoints proxy through `window.electronAPI.invoke(channel, args)` for queries and `window.electronAPI.subscribe(channel, args)` for streaming mutations. Define one shared `baseQuery` that wraps both.

### `authApi`
| Endpoint | Type | IPC Channel |
|---|---|---|
| `getStatus` | query | `auth:status` — polls/listens; returns `{ gh, copilot }` |
| `loginGh` | mutation | `auth:gh:login` — opens browser flow; resolves when complete |
| `logoutGh` | mutation | `auth:gh:logout` |
| `loginCopilot` | mutation | `auth:copilot:login` (errors if no gh) |
| `logoutCopilot` | mutation | `auth:copilot:logout` |

Tag: `["AuthStatus"]`. Login/logout mutations invalidate `AuthStatus`.

### `reposApi`
| Endpoint | Type | IPC Channel |
|---|---|---|
| `listOrgRepos` | query | `repos:list?org=<org>` |
| `refresh` | mutation | `repos:refresh` (forces a `gh repo list` re-pull) |

Tag: `["Repos"]`. Returns `{name, defaultBranch, lastPushed, sizeKb, language}[]`. **Do not** fetch on app boot — only when the user successfully signs into both CLIs.

### `branchesApi`
| Endpoint | Type | IPC Channel |
|---|---|---|
| `listSessions` | query | `branches:sessions?repo=<repo>` — branches matching `spec/*` |
| `checkout` | mutation | `git:checkout` |
| `createDraft` | mutation | `git:checkout -b spec/draft-<slug>` |

Tag: `["Branches:repo"]`. The current branch is owned by the `workspace` slice, not this API.

### `sessionApi`
| Endpoint | Type | IPC Channel |
|---|---|---|
| `loadSession` | query | `session:load?repo&branch` — pulls all evidence files + state |
| `saveSpec` | mutation | `session:save-spec` — writes `spec.md` |

### `specifyApi` (streaming mutation pattern)
| Endpoint | Type | IPC Channel |
|---|---|---|
| `runSpecify` | mutation | `copilot:specify` — streams `event` messages |

Use `onCacheEntryAdded` to subscribe to streamed events, push them into the activity log via a listener, update `session.pipelines.specify`, and resolve when `event.type === "done"`.

### `clarifyApi`
| Endpoint | Type | IPC Channel |
|---|---|---|
| `runClarify` | query | `copilot:clarify` — fetches generated questions |
| `askAnother` | mutation | `copilot:clarify:ask-more` |
| `submitAnswers` | mutation | `copilot:clarify:commit` — writes `clarifications.md` |

### `planApi`, `analyzeApi`, `tasksApi`
Identical shape — one streaming `run*` mutation per step. Each emits the pipeline rows the UI needs.

### `artifactsApi`
| Endpoint | Type | IPC Channel |
|---|---|---|
| `read` | query | `artifact:read?repo&branch&path` — returns text + size + mtime |

Cached per `{repo, branch, path}`. Invalidated on any mutation that writes that path.

### `tasksDetailApi`
| Endpoint | Type | IPC Channel |
|---|---|---|
| `getTask` | query | `tasks:detail?id` |

### `copilotApi`
| Endpoint | Type | IPC Channel |
|---|---|---|
| `listModels` | query | `copilot:models` |
| `setModel` | mutation | `copilot:set-model` |

### `jiraApi`
| Endpoint | Type | IPC Channel |
|---|---|---|
| `syncEpic` | mutation | `jira:sync` — creates epic + child issues, returns URLs |
| `getSyncedEpic` | query | `jira:epic?session` — for re-display after reload |

### `bugReportApi`
| Endpoint | Type | IPC Channel |
|---|---|---|
| `submit` | mutation | `concierge:report` — POSTs to `#concierge-triage` |

### `electronApi` (system glue)
| Endpoint | Type | IPC Channel |
|---|---|---|
| `getAppVersion` | query | `app:version` |
| `openExternal` | mutation | `app:open-external` |
| `exportFile` | mutation | `app:save-file-dialog` — used by "Export activity log" |
| `checkForUpdate` | query | `app:update-check` |

---

## Listener middleware (cross-domain effects)

These are the wires between slices and APIs. **Never put this logic in components.**

| Listener | Trigger | Effect |
|---|---|---|
| `activityLogger` | any RTK Query mutation pending/fulfilled/rejected | append `cmd`/`ok`/`err` lines to `activity` |
| `pipelineProgressLogger` | streaming events from `specify`/`plan`/`analyze`/`tasks` APIs | append `info` lines + update `activity.current` + flip `activity.busy` |
| `stepAdvancer` | each pipeline `done` event | dispatch `workspace.advanceTo(nextStep)` |
| `branchCreator` | `specifyApi.runSpecify/pending` while `workspace.branch === null` | dispatch `branchesApi.createDraft` first; queue the specify run after |
| `preferencesPersister` | `preferences/*` | debounced (250ms) write to `electron-store` |
| `sessionPersister` | `session/*` | write per-branch session blob to disk |
| `authBootstrap` | app boot | call `authApi.getStatus`; on `ok+ok`, prefetch `reposApi.listOrgRepos` |
| `repoSwitchCleanup` | `workspace.repo` change | invalidate `Branches:repo`, drop unrelated session data |
| `modelLogger` | `copilotApi.setModel/fulfilled` | append `cmd` + `ok` log line, no other UI side effects |
| `externalLinkOpener` | any action with `meta.external: true` | route through `electronApi.openExternal` (security: never `window.open` from renderer) |

---

## Selectors (the only place UI reads composite state)

Memoize with `createSelector`. UI components import named selectors — they never read raw slice fields.

- `selectAuthGateOpen` — `!(auth.gh.ok && auth.copilot.ok)`
- `selectCanShowWorkspace` — both auth OK AND `workspace.repo`
- `selectStepStates` — array of `{id, label, mode, status: "done"|"current"|"locked"}` derived from `workspace.step` + `workspace.maxStep`
- `selectIsReadonlyView` — `workspace.viewing < workspace.maxStep`
- `selectCurrentBranch` — `workspace.branch ?? "main"`
- `selectEvidenceFiles` — concatenation of files surfaced across plan/analyze/tasks pipelines + final artifacts
- `selectRecentRepos` — joins `reposApi.listOrgRepos` cache with `preferences.lastUsedRepos`
- `selectJiraSyncState` — `{ status: "idle"|"syncing"|"synced", epic, issues }` from `jiraApi.syncEpic`
- `selectActivityTail` — last N entries (component asks for what it needs; never slice the whole array in UI)

---

## Persistence boundary

| Lives in `electron-store` | Lives in per-session blob | In-memory only |
|---|---|---|
| `preferences.*` | `session.*` keyed by repo+branch | `ui.*`, `activity.*`, RTK Query cache |
| `org.current` | | `auth.*` (re-checked on boot) |
| `copilot.model` | | |
| `preferences.lastUsedRepos` | | |

`activity` could optionally persist the last N lines per session if "export log" should survive a reload, but the live stream is in-memory by design.

---

## IPC contract notes

- All channels prefixed with their domain: `auth:*`, `repos:*`, `copilot:*`, `git:*`, `jira:*`, `app:*`.
- Streaming channels send `{type: "info"|"ok"|"err"|"done", ...payload}` events; one final `done` per run carries the structured result.
- Main process **never** holds renderer state — it's a stateless command executor. State of record lives in the renderer's redux store + persisted slices.
- Errors propagate as rejected mutations with a typed `error.code` enum (`AUTH_REQUIRED`, `NETWORK`, `CLI_TIMEOUT`, `GIT_DIRTY`, `JIRA_FORBIDDEN`, etc.). The activity logger renders these distinctly; modals catch the auth-required cases and bounce to sign-in.

---

## What this gets you

- **One source of truth per concern.** Auth status comes from `authApi`, not three components.
- **No race conditions on step advancement.** The `stepAdvancer` listener is the only writer.
- **Free undo for resumed sessions.** Per-branch session blobs mean closing and reopening the app drops you back in the exact same place.
- **Streaming-friendly.** RTK Query's `onCacheEntryAdded` is the right primitive for spec-kit's stdout-style pipelines — no manual subscribe/unsubscribe.
- **Testable.** Listeners and selectors are pure; APIs are mockable per-channel.

---

*Spec-kit Concierge — constitutional v1, 2026-05-21.*
