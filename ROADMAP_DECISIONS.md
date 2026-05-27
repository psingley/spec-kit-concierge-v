# Spec-kit Concierge — Roadmap Decisions

> Companion to the constitution. Resolves the meta-decisions and
> load-bearing constitutional gaps that would otherwise be argued inside
> the first `/speckit.specify` runs. Subject to amendment under the
> same `constitution-change` PR discipline.

## Slicing strategy

The constitution's layered architecture (Principle I) is a **boundary
rule**, not a delivery sequence. Pure-layer delivery risks each layer
passing in isolation while the integrated user journey fails. We use a
**hybrid**: a horizontal foundation phase (boot + boundaries + state
skeleton + the load-bearing ACP/lifecycle seams), then **vertical
user-journey slices** (Clarify HITL, Renderer, HTTP API, JIRA loop)
on top of the foundation.

This means a few horizontal foundation specs come first; the
constitution-load-bearing seams (ACP adapter, Step Lifecycle) get
their own specs because their failure cascades; then vertical slices
exercise the boundaries end-to-end.

## Spec-kit run sequence

Twelve specs. Numbered for reference; not all run sequentially —
parallelism markers below. Each spec is one `/speckit.specify` run
followed by the full canonical six-step flow per the constitution
(`Specify → Clarify → Plan → Tasks → Analyze → Review`).

### Phase A — Foundation (serial, no parallelism)

1. **Foundation Shell & Boundaries**
   Electron Forge scaffold with Vite-renderer template, main /
   renderer / preload split, TypeScript strict, ESLint with the
   Pure/Effect layer-boundary rules, Vitest harness, Playwright
   harness, GitHub Actions CI. Acceptance: `npm run dev` launches a
   blank window; `npm run test:coverage` succeeds with zero tests;
   `npm run e2e` succeeds with one smoke test. **Blocks everything.**

2. **Main Data Layer Foundation**
   `main/data-layer/fs/safeWrite.ts`, git read primitives (read
   `Concierge-Step:` trailers from log, read branch state, check for
   uncommitted changes to a path set), workspace path guard, the
   `agents.json` manifest shape and loader, pino-based structured
   logger writing to `userData/logs/`. **Depends on 1. Blocks 3.**

### Phase B — Constitutional Seams (serial)

3. **ACP Adapter & Bound CLI Supervisor**
   `main/data-layer/acp/` — process supervisor, JSON-RPC 2.0 stdio
   framing, capability discovery, model selection messages,
   cancellation, recorded-transcript contract tests fixture format
   (`tests/fixtures/acp-transcripts/<scenario>.jsonl`). v1 binds
   only to Copilot CLI (manifest entry); the interface admits any
   ACP agent. **Depends on 1, 2. Highest risk. Blocks 4 and 6.**

4. **IPC Bridge & Redux Store Skeleton**
   `main/ipc/` handlers with factory-pattern validation at the IPC
   trust boundary; renderer's eight slices
   (`ui`, `preferences`, `auth`, `workspace`, `steps`, `session`,
   `activity`, `copilot`) wired but empty of business logic; RTK
   Query `baseQuery` wrapping `ipcRenderer.invoke`; all named
   listener middleware files present (empty bodies); selectors
   directory with the typed hooks (`useAppDispatch`, `useAppSelector`,
   `useAppStore`). **Depends on 1. Can parallel with 3 using mocked
   ACP. Blocks 5, 7, 8.**

### Phase C — Step Lifecycle (serial)

5. **Step Lifecycle & Hook Infrastructure**
   `.specify/extensions.yml` registering all `before_<step>` and
   `after_<step>` hooks; the hook executor (`main/hooks/`); the
   per-step artifact manifest (load-bearing-gap resolved in this
   document below); factory infrastructure under `domain/factories/`
   with one factory per step writing the Step Commit on pass;
   the `steps` slice's reducer with all monotonic-transition
   invariants; the `stepsRestoredFromDisk` listener that reads
   trailer history. **Depends on 2, 3, 4. Blocks 6, 7, 10.**

### Phase D — Vertical Slices (parallel where marked)

6. **Specify Vertical (first end-to-end user journey)**
   The user can: launch the app, sign into the three prerequisites,
   pick a repo, start a new session, type a specify prompt, click
   Begin, watch the Specify pipeline run, view the rendered spec.md.
   This slice exercises everything from auth UI → renderer → IPC →
   ACP → Step Lifecycle → factory → Step Commit. **Depends on 3, 4,
   5. Highest-value slice — first proof of integration. Blocks 7
   from going first.**

7. **Clarify Vertical (the rigor-mandate slice)**
   Specify→Clarify navigation; Clarify questions surface; multiple
   choice + short answer affordances; Clarify Re-ask on malformed
   questions; structured malformation logging; commit on completion.
   This slice's factory is the strictest (constitution Principle
   VIII). **Depends on 6. Highest-importance slice for the user.
   Can parallel with 8.**

8. **AI-Passive Steps Vertical (Plan + Tasks + Analyze)**
   The three middle steps that the user watches rather than drives.
   StatusStep rendering, per-row evidence pills, evidence-viewer
   modal, pipeline streaming, the hang-detection listener firing
   after 20 minutes of silence. Each step's factory validates its
   artifacts. **Depends on 6. Can parallel with 7.**

9. **Review & Evidence Vertical**
   The Review step: evidence summary card, resolved-clarifications
   summary, task list with per-task expand modal, the read-only-when-
   complete dim treatment, the "Resume {pending}" bounce affordance.
   No JIRA submission yet — that's its own slice. **Depends on 6.
   Can parallel with 7, 8.**

### Phase E — External Surfaces (parallel)

10. **Localhost HTTP API & External-Agent Driveability**
    Tokenized random-port HTTP server, all v1 endpoints, SSE for
    activity streaming, state-machine parity gating, the GUI-
    mirroring guarantee. **Depends on 4, 5. Can parallel with 7-9.**

11. **MCP Config Detection & Atlassian Auth**
    `mcp-config` data layer module reading/writing the Bound CLI's
    MCP config file (load-bearing-gap resolved below); the
    `mcpConfigChecker` listener; Atlassian OAuth via system browser
    to localhost callback; auth chip third-prerequisite UI. **Depends
    on 1, 2, 4. Can parallel with 7-10.**

12. **JIRA Submission Outer Loop**
    Customized spec-kit JIRA extension agent install + customization
    record; the deterministic outer loop in main; the stateful
    record file format; the celebration screen reading from it.
    **Depends on 9, 11. Last vertical slice.**

### Phase F — Release

13. **Windows Packaging & Release Gate**
    Electron Forge Windows installer config, smoke-launch verification,
    artifact export, the gear menu's "Export activity log" / "About"
    items. **Depends on 6 minimum (the app boots through one full
    journey). Can run last or pipelined with 10–12.**

### Dependency graph

```
1 → 2 → 3 → 4 → 5 → 6 → 7,8,9 (parallel) → 12
                ↓     ↓
                4 → 10,11 (parallel) ────────┘
                                            13 (any time after 6)
```

## Pre-resolved constitutional gaps

The following gaps in the constitution are resolved here so the first
specify runs don't argue them. Anything not pre-resolved is
intentionally left for its slice's spec to determine.

### Per-step artifact manifest (Principle VII)

The v1 hard-coded manifest. The Step Lifecycle spec (Run 5)
implements a startup verification that parses each
`.github/agents/speckit.*.agent.md` and warns if declared outputs
drift from this table.

| Step | Step-owned artifacts (the Step Commit's diff scope) |
|---|---|
| `specify` | `specs/<branch>/spec.md`; `specs/<branch>/checklists/requirements.md` (optional). The entire `specs/<branch>/` directory if newly created. |
| `clarify` | `specs/<branch>/spec.md` only — clarifications appended in-place under a `## Clarifications` section with `### Session YYYY-MM-DD` subheadings, per spec-kit's clarify agent file. No separate `clarifications.md`. |
| `plan` | `specs/<branch>/plan.md`; `specs/<branch>/research.md`; `specs/<branch>/data-model.md`; `specs/<branch>/contracts/*` (optional); `specs/<branch>/quickstart.md` (optional); plus `.github/copilot-instructions.md` (the plan agent writes the plan path between the SPECKIT START/END markers). |
| `tasks` | `specs/<branch>/tasks.md` only. |
| `analyze` | May modify any of `specs/<branch>/spec.md`, `specs/<branch>/plan.md`, `specs/<branch>/tasks.md` as remediation. Commits with `--allow-empty` if no diff. |
| `review` | Not a spec-kit canonical step — the Concierge App's terminal "Review and JIRA-submit" surface. No artifact authored by review itself; the Step Commit (if any) wraps `specs/<branch>/jira-tickets.json` writes from the JIRA outer loop. |

### Step Escape Hatch revert scope

Step Escape Hatch reverts the **step-owned artifact set** to the
last Step Commit on the branch (`git checkout HEAD -- <paths>`). It
does not touch unrelated working-tree changes.

### Copilot CLI ACP launch (Principle III)

v1 launch invocation (resolved here so the ACP spec can lock against
it on day one):

```
copilot --allow-all-tools --acp
```

The exact flag for ACP mode may differ; the ACP spec (Run 3) verifies
against the installed Copilot CLI's `--help` output at first run and
records the canonical flag in `main/data-layer/acp/agents.json`. If
the installed CLI's flag has drifted, the spec MUST surface the
mismatch and update the manifest entry before any other Bound-CLI
work proceeds.

### MCP config detection (Principle X)

The Bound CLI's MCP configuration file location is platform-specific
and was not fully documented in the constitution. v1 target:

- **Windows**: `%APPDATA%\github-copilot\mcp.json` (canonical per
  Copilot CLI's documented config path, to be verified during Run 11).
- **macOS** (dev only): `~/Library/Application Support/github-copilot/mcp.json`.

The mcp-config module's job at v1: read the JSON, check whether an
entry exists for the Atlassian MCP server (key TBD by Atlassian MCP
docs at the time of Run 11), idempotently merge the canonical entry
in if missing, preserve user-managed entries. The exact Atlassian MCP
config entry shape is resolved by reading the published Atlassian MCP
documentation during Run 11.

### Stateful JIRA record file (Principle XI)

Path: `specs/<branch>/jira-tickets.json`.

Schema:

```ts
type JiraTicketsRecord = {
  schema: 'concierge.jira.v1';
  epic?: { taskId: 'EPIC'; jiraKey: string; jiraUrl: string;
           createdAt: ISO; verifiedAt: ISO };
  tickets: Array<{
    taskId: string;            // matches tasks.md row id, e.g. "T-05"
    jiraKey: string;           // e.g. "CC-2421"
    jiraUrl: string;
    createdAt: ISO;
    verifiedAt: ISO;           // when the agent confirmed not-duplicate
    failureReason?: string;    // present when verification failed
  }>;
};
```

The Concierge App's outer loop reads this file after each agent
invocation. A task is "verified" iff there's a `tickets` entry with
matching `taskId` and a populated `verifiedAt`.

### Smart/Dumb component directory layout

Resolves a structural ambiguity in Principle XII. Renderer layout:

```
renderer/
├── store/         # slices, selectors, listeners
├── api/           # RTK Query apis
├── hooks/         # custom hooks (derived state + RTK Query consumers)
├── features/      # smart components, one per spec-kit step + first-run flows
│   ├── auth/
│   ├── repo-picker/
│   ├── specify/
│   ├── clarify/
│   ├── plan/
│   ├── tasks/
│   ├── analyze/
│   ├── review/
│   └── jira-submit/
└── ui/            # dumb components (presentation only)
    ├── orb/
    ├── stepper/
    ├── activity-rail/
    ├── modal/
    ├── markdown/
    └── ...
```

Rule: `features/` may import from `ui/`. `ui/` may not import from
`features/`. Both may import from `hooks/`, `api/`, and `store/`.

### CONTRIBUTING.md timing

The constitution's Governance section defers
`.specify/memory/CONTRIBUTING.md` to "the first plan step that needs
it." Resolved: **Run 1's Plan step authors it.** Run 1 is the
foundation shell, where the contributor guide is most useful —
ESLint rules, layer boundaries, commit conventions, test
expectations. Subsequent runs amend it as new conventions emerge.

### HTTP API completeness (Principle IX)

Resolved: the constitution lists the v1 endpoints informatively; the
**complete** v1 contract is authored in Run 10's spec, locked there,
and from that point lives in `docs/api.md`. Runs 1–9 may stub
endpoints with `501 Not Implemented` returns; Run 10 is the spec
that finalizes them.

### Per-step Step Contract specifics (Principle VIII)

Resolved: each vertical-slice spec (Runs 6, 7, 8, 9) defines its
step's full Step Contract in that slice. The Clarify contract is
already detailed in Principle VIII; the others get authored by their
slice.

## Constitution v1.0.2 extracted inventory

Inventory that the constitution previously named directly was
extracted to this section under the v1.0.2 PATCH amendment, per the
locked extraction-threshold rule (must / must-not boundaries stay in
the constitution; inventory, vendor choices, version pins, file
names, endpoint lists, UI copy beyond commitments, timeout
constants, and v1-only service choices move here).

### Renderer state inventory (extracted from Principle VI)

**Redux slices (9):**

1. **`ui`** — transient view state, in-memory only. Modals,
   dropdowns, activity rail current visibility, popovers.
2. **`preferences`** — persisted via `electron-store` through a
   debounced `preferencesPersister` listener. Accent, density,
   activity rail default side and default visibility, LRU of recent
   repos, persisted model id.
3. **`auth`** — state machine for the three auth prerequisites
   (GitHub CLI, Copilot CLI, Atlassian via OAuth → localhost
   callback). Includes identity (`username`, `avatarUrl`),
   per-prerequisite status, and last error. All three prerequisites
   must be `ok` before the workspace surface is usable.
4. **`workspace`** — `{repo, branch}` only. The navigation pointer.
   Org name is a v1 constant (`"collette-travel"`), not a slice
   field.
5. **`steps`** — the canonical step state machine. Per-step status
   (`not_available` / `pending` / `complete`), the single `pending`
   step, and `viewing` (which step's UI the user has open).
   Invariants: exactly one `pending` step; status transitions are
   monotonic forward unless explicitly reset via Step Escape Hatch;
   `viewing ≤ pending` in display order. Step state is recomputed
   from disk on every Session start.
6. **`session`** — per-branch work-in-progress: `prompt`, `specMd`
   in-memory copy, `clarify.answers` (including `malformed` records
   from Clarify Re-ask), `clarify.extraQuestions`, and `pipelines`
   for `plan`, `tasks`, `analyze`, and `tojira`. Active-session blob
   only; closed sessions live on disk plus a summary in
   `sessionsIndex`.
7. **`sessionsIndex`** *(createEntityAdapter)* — lightweight metadata
   for the resume picker, keyed by `${repo}#${branch}`.
   `{repo, branch, lastStep, lastTouched}` entries. Resuming a
   branch reads the entity by id and loads its blob from disk into
   `session`.
8. **`activity`** — ring buffer of LogEntry (cap ~2000), ambient
   `busy`, and `current` status string. Stream-fed from ACP
   `session/update` events via a subscription pipeline.
   Display-only — never read for state decisions. Activity rail
   auto-opens once per session on the first `err` entry; user can
   re-close and override via `preferences`.
9. **`copilot`** — currently-selected model id. Mirrors into
   `preferences` for persistence. Disabled while `steps.pending`
   step is `running`; swappable when current step is
   `not_available` or `complete` (constitution III).

**RTK Query APIs (13):** all wrap `ipcRenderer.invoke` via a shared
typed `baseQuery` returning `{data}` or `{error: {code, message}}`
with the error-code enum below.

- `authApi` (`auth:status`, `auth:gh:login`, `auth:gh:logout`,
  `auth:copilot:login`, `auth:copilot:logout`, `auth:atlassian:login`,
  `auth:atlassian:logout`) — tag `["AuthStatus"]`.
- `reposApi` (`repos:list`, `repos:refresh`) — tag `["Repos"]`.
- `branchesApi` (`branches:sessions`, `git:checkout`,
  `git:createDraft`) — tag `["Branches:repo"]`.
- `sessionApi` (`session:load`, `session:save-spec`).
- `acpApi` (`acp:runStep`, `acp:cancelTurn`, `acp:setModel`) — one
  mutation per step type, streaming via `onCacheEntryAdded` that
  pushes activity log lines and updates `session.pipelines.<step>`.
- `clarifyApi` (`clarify:next`, `clarify:answer`,
  `clarify:reaskMalformed`, `clarify:askAnother`, `clarify:commit`).
- `artifactsApi` (`artifact:read`) — cached per
  `{repo, branch, path}`, invalidated on any mutation that touches
  the path.
- `tasksDetailApi` (`tasks:detail`).
- `copilotApi` (`copilot:models`, `copilot:set-model`).
- `jiraApi` (`jira:loopCreateAndVerify`, `jira:syncedRecord`).
- `platformTeamApi` (`platformTeam:report`) — "Report a bug / file a
  request" submission. UI copy may say "concierge team" per the
  design; code, types, and endpoints use `platformTeam` to avoid
  overloading "concierge" as a term.
- `mcpConfigApi` (`mcp:config:check`, `mcp:config:fix`).
- `electronApi` (`app:version`, `app:open-external`,
  `app:save-file-dialog`, `app:export-debug-log`).

**Typed error-code enum** for the shared baseQuery error envelope:
`AUTH_REQUIRED`, `NETWORK`, `CLI_TIMEOUT`, `GIT_DIRTY`,
`MCP_NOT_CONFIGURED`, `JIRA_FORBIDDEN`, `STEP_CONTRACT_VIOLATION`,
`UNKNOWN`.

**Listener middleware (17):**

- `activityLogger` — RTK Query mutation lifecycle + ACP stream
  notifications → LogEntry rows.
- `pipelineProgressLogger` — streaming `acp:runStep` events →
  pipeline row updates + `activity.current` / `activity.busy`. Sole
  legal subscriber to ACP `session/update`.
- `stepAdvancer` — the only writer of step-status promotions
  (`pending` → `complete`, next-step `not_available` → `pending`).
  Fires on `after_<step>` hook success acks.
- `stepEscapeHatch` — handles the canonical recovery flow for all
  step failure modes.
- `clarifyMalformationLogger` — on each Clarify Re-ask, writes a
  structured malformation record to disk and to `activity`.
- `branchCreator` — on Specify pipeline start while
  `workspace.branch === null`, fires `branchesApi.createDraft` first
  and queues the Specify run.
- `preferencesPersister` — debounced (250 ms) write of
  `preferences/*` to `electron-store`.
- `sessionPersister` — per-branch session blob write; also updates
  `sessionsIndex` with the lightweight summary.
- `authBootstrap` — on app launch, queries auth status for all three
  prerequisites; once all three are `ok`, prefetches
  `reposApi.listOrgRepos`.
- `repoSwitchCleanup` — on `workspace.repo` change, invalidates
  branch + session data scoped to the prior repo.
- `modelLogger` — on `copilotApi.setModel/fulfilled`, appends
  activity log line.
- `externalLinkOpener` — routes any action with `meta.external: true`
  through `electronApi.openExternal`. Security: renderer never calls
  `window.open`.
- `activityAutoOpener` — on first `err` entry per session,
  dispatches `ui/activityRail/visible = true` unless the user has
  already overridden.
- `stepsRestoredFromDisk` — on `workspace.repo` / `workspace.branch`
  change (or app launch with restored Session), reads git history,
  computes the status map from `Concierge-Step:` trailers, dispatches
  `steps/restored`.
- `hangDetector` — watches `session.pipelines` for 20 minutes of no
  progress events; emits a soft notification suggesting cancel or
  restart. No auto-fail.
- `mcpConfigChecker` — on app launch and on `workspace.repo` change,
  fires `mcpConfigApi.check`; if the required MCP entry is missing,
  immediately fires `mcpConfigApi.fix` and emits a one-time
  informational activity-stream entry ("Configured `<MCP>` for
  `<Bound CLI>`"). No user-action affordance — silent write per
  Principle X.
- `mcpToolCallSummarizer` — on every ACP-streamed MCP tool call,
  emits a one-line activity entry (tool name + brief target) and
  writes the full payload to the debug log.

**Persistence boundary:**

| `electron-store` (persists) | Per-Session blob (disk) | In-memory only |
|---|---|---|
| `preferences.*`, `sessionsIndex.*` summary entries | active `session.*` keyed by `${repo}#${branch}`; closed-session blobs at `userData/sessions/${repo}--${branch}.json` | `ui.*`, `activity.*`, RTK Query cache, `auth.*`, `workspace.*`, `steps.*` (rebuilt from disk on Session start), `copilot.*` (mirrored from `preferences`) |

### ACP runtime inventory (extracted from Principle III)

- **Library:** `@agentclientprotocol/sdk` v0.22.1 (Apache-2.0). The
  only v1 ACP runtime dependency. Lives behind the Concierge typed
  `CodingAgent` adapter.
- **Reference repos (not dependencies, do not import):**
  `openclaw/acpx` (MIT, alpha — useful queue/session/cancel
  patterns), `formulahendry/acp-ui` (MIT — config + traffic-monitor
  UI patterns), `formulahendry/vscode-acp` (MIT — editor-client
  conventions), `agentclientprotocol/agent-client-protocol`
  (Apache-2.0 — normative spec).
- **Data-layer module path:** `main/data-layer/acp/`. Single typed
  `CodingAgent` interface at `main/data-layer/acp/agent.ts`. No code
  outside this directory spawns a coding-agent binary.
- **Bound CLI manifest:** `main/data-layer/acp/agents.json`. Each
  entry declares binary path, args, unrestricted-permission flag,
  ACP-mode flag, capability tags. Adding an agent = one manifest
  entry + transcript contract tests.
- **v1 default Bound CLI:** GitHub Copilot CLI, launched in ACP mode
  with `--allow-all-tools` (the documented full-permission flag per
  GitHub Copilot CLI docs). The ACP-mode flag is verified against
  the installed Copilot CLI's `--help` output during Run 3 and
  recorded in the manifest. Best evidence as of 2026-05 suggests
  `--acp` or `--acp --stdio`; verify before locking.
- **Model swap mechanism:** `unstable_setSessionModel` on the
  `ClientSideConnection` from `@agentclientprotocol/sdk` v0.22.1 if
  the method is present and the bound CLI supports it. The SDK
  marks the method `UNSTABLE` and "not part of the spec yet."
  Fallback when unavailable: restart the Bound CLI with the new
  model selected via the launch-time `--model` flag. User-visible
  behavior is identical either way.
- **Constraint:** Model swap allowed only when `steps.pending`
  step's status is `not_available` or `complete` — never `pending`
  and running (constitution III). UI model picker disables during a
  running step.
- **Transcript recording:** raw ACP JSON-RPC, full fidelity, written
  to `userData/transcripts/<sessionId>/<step>-<timestamp>.jsonl`.
  Used by contract tests, verifier-agent E2E, and audit.

### Cancel and recovery behavior (extracted from Principle VII)

- **Cancel** requires explicit confirmation dialog. On confirm:
  hard-revert to last Step Commit using the Step Escape Hatch
  flow. No graceful-wait dance with the bound CLI process. Cancel
  is an escape-hatch tool, not a graceful-interrupt feature.
- **Hang detection threshold (v1):** 20 minutes of zero ACP stream
  activity → soft notification only. Threshold may move to
  per-agent manifest entries in a later version; v1 is a single
  rule.
- **Crash recovery marker:** a `userData/in-flight/${sessionId}/${step}.marker`
  file is written by `before_<step>` and removed by `after_<step>`.
  On launch, if a marker exists for a step that is not commit-proven
  complete, the Concierge App invokes the Bound CLI to resume from
  the dirty workspace state per Workspace Dirty Resume (Principle
  VII). No user-facing crash dialog; the Bound CLI takes over the
  in-flight turn and either completes it or restarts from the last
  Step Commit.

### HTTP API endpoint inventory (extracted from Principle IX)

The v1 endpoint set. Run 10 produces the full versioned contract in
`docs/api.md`.

Read endpoints:
- `GET /v1/status` — Session, step, Workspace, auth, model.
- `GET /v1/spec` — current `spec.md`.
- `GET /v1/evidence` — committed artifacts on the current branch
  with `Concierge-Step:` trailer mapping.
- `GET /v1/activity?since=<seq>` — paginated log slice.
- `GET /v1/activity/stream` (SSE) — live activity events.

Write endpoints:
- `POST /v1/session/start` — `{repo, branch?}`. Only valid when no
  active Session or when the active Session is at the Review stage
  and complete.
- `POST /v1/session/resume` — `{repo, branch}`.
- `POST /v1/specify/begin` — `{promptText}`. Only valid when
  `steps.pending === 'specify'` and prompt unsubmitted.
- `POST /v1/clarify/answer` — `{qid, choice, note?}`. Only valid
  when `steps.pending === 'clarify'` and `qid` matches the currently
  surfaced question.
- `POST /v1/clarify/reaskMalformed` — `{qid, malformationCategory}`.
- `POST /v1/clarify/askAnother`.
- `POST /v1/step/advance` — promotes the pending step if its Step
  Contract has passed.
- `POST /v1/step/retry` — fires the Step Escape Hatch.
- `POST /v1/step/run` — `{step}`. Only valid when `step ===
  steps.pending` and the step has not yet been invoked on this
  branch.
- `POST /v1/jira/submit` — fires the JIRA Submission outer loop.
- `POST /v1/platformTeam/report` — submit a Support Request.

Token + port discovery: per-launch token + random port written to
`userData/api/loopback.json` with `0600` permissions.

### MCP scope v1 (extracted from Principle X)

- **Required MCP set v1:** Atlassian MCP only.
- **Behavior:** silent idempotent write at launch + on
  `workspace.repo` change. One-time informational notification
  surfaces in the activity stream when the write occurs. No
  "click to fix" affordance — silent unless missing detection
  surfaces a passive warning state in the auth chip.
- **Config file paths (v1):**
  - Windows: `%APPDATA%\github-copilot\mcp.json` (canonical per
    Copilot CLI's documented config path — verify at Run 11).
  - macOS (dev only): `~/Library/Application Support/github-copilot/mcp.json`.
- **Future MCPs:** plugin architecture post-v1. When MCP count
  reaches ≥2, a dedicated `mcp` slice replaces the `auth.atlassian`
  prerequisite framing.

### JIRA submission specifics (extracted from Principle XI)

- **Extension home:** `psingley/concierge-jira` — a first-class
  fork-publication of the user's existing canary (located at
  `/Users/psingley/clean-room/spec-kit-jira-collette-canary`, SHA
  `249f78f`, 6 commits ahead of `mbachorik/spec-kit-jira`, install
  + remove + dry-run validated, issue #2 fixed by dropping the
  legacy short alias from the extension manifest). Concierge
  installs the extension by its catalog name; the canary code is
  published as the source.
- **Per-ticket verification pattern** (already in the canary's
  `commands/specstoissues.md` lines 459–513): the agent creates
  the ticket via Atlassian MCP, then performs a live read-back of
  the created ticket and verifies summary/description/parent
  against the spec before continuing. Concierge's outer loop reads
  the stateful record file after each invocation and confirms the
  expected delta.
- **Stateful record file:** `specs/<branch>/jira-tickets.json`, schema
  documented earlier in this file under "Stateful JIRA record file
  (Principle XI)."
- **Idempotency on resume:** the outer loop reads the stateful
  record on relaunch and skips already-verified tasks. No duplicate
  tickets.
- **Celebration screen:** reads from `jira-tickets.json`, not from
  stream events. Lists every created issue with its JIRA URL.

### Stack picks (extracted from Stack & Coding Standards)

- **Desktop shell:** Electron LTS; Node 22+ in main.
- **Renderer build:** Vite + `@vitejs/plugin-react`. (Electron-Forge
  bundled webpack template vs Vite-template clarification is a Run 1
  open question.)
- **Packaging:** Electron Forge. v1 ships Windows installer only
  (NSIS or Squirrel maker — final choice in Run 1 plan step). macOS
  and Linux are dev-from-source only in v1.
- **Auto-update:** deferred. Users manually download new versions
  when notified.
- **UI:** React 18, function components only.
- **State:** Redux Toolkit + RTK Query. No other state library.
- **Styling:** design tokens from `design/project/styles.css` (teal
  accent `#3a7e9a` / `#132f3b` dim, three-state orb palette,
  near-black surfaces). `design/legacy/` is historical reference
  only. No CSS-in-JS runtime in v1.
- **Logging:** pino.
- **Localhost HTTP server:** Express. (Fastify and Hono have no
  production Electron precedent per Round 6 research.)
- **HTTP/SSE:** raw SSE over Node response semantics or thin
  wrapper; no canonical SSE library is mandatory.
- **Linting:** ESLint with `@typescript-eslint`,
  `eslint-plugin-react`, `eslint-plugin-functional`, plus
  project-local rules enforcing the Pure/Effect layer boundary and
  the `console.log` prohibition. GitHub Desktop's
  `no-restricted-imports` pattern for forbidding `ipcRenderer` /
  `ipcMain` imports in cross-process modules is the precedent.
- **Formatting:** Prettier.
- **Markdown viewer:** `react-markdown` + `rehype-sanitize`.
- **Component primitives:** Radix UI (adapted; not full library
  borrow).
- **Repo-local skills (mandatory within their scopes):** `tdd`
  (new logic), `grill-with-docs` (before every `/speckit.specify`),
  `impeccable` (frontend craft).

### Test stack (extracted from Testing Discipline)

- **Unit + component:** Vitest + React Testing Library. Co-located
  as `*.test.ts(x)` next to the module under test.
- **E2E:** Playwright driving Electron via the `_electron` API.
  Tests under `e2e/`.
- **Accessibility:** axe-core + `@axe-core/playwright` in CI gates.
  WAI-ARIA Authoring Practices used as the spec oracle for custom
  widgets.
- **Storybook:** deferred from v1.
- **ACP layer:** recorded-transcript contract tests at
  `tests/fixtures/acp-transcripts/<scenario>.jsonl`. Carve-out for
  line-coverage in `main/data-layer/acp/` if/when transcript-based
  coverage proves equivalent.

### Build-vs-borrow audit (extracted from Round 6)

**Build (no clean borrow, safety-critical seams):**
- IPC bridge + factory-pattern validation
- Bound CLI process supervisor (spawn, lifecycle, crash recovery,
  cancellation)
- MCP config detection + idempotent writer
- Spec-kit hooks executor
- Per-step factory step contracts (hand-written)
- ACP transcript recording
- HTTP-to-Redux-action adapter (no library exists)
- SSE in Electron main
- `agents.json` manifest loader
- `fs/safeWrite` workspace-scoped helper
- Trust-boundary factories for every cross-boundary payload (IPC,
  ACP, HTTP, FS, MCP). Hand-written predicates and normalizers. The
  factory is the single source of truth for the typed shape; the
  TypeScript type is the factory's return type. No runtime schema
  library used. Rationale: maintenance tax of keeping schema-library
  schemas in sync with TS types exceeds the safety dividend for an
  internal Electron app with no third-party schema consumers, and the
  Clarify failure modes (LF/CRLF mixing, missing fields, malformed
  multiple-choice blocks) are imperative checks not cleanly expressed
  as declarative schema rules. Factory tests are mandatory and tight;
  hostile-input cases (empty, null, missing fields, deep malformation)
  go into co-located test fixtures.

**Borrow (commodity, saves weeks):**
- pino — structured logging
- Electron Forge + Vite + electron-vite-react patterns + Forge fuses
  — packaging / build
- RTK / RTK Query / `createSelector` / listener middleware — state
- axe-core + `@axe-core/playwright` — accessibility CI
- Express — localhost HTTP server
- `simple-git` — git read primitives (adapt, not import wholesale)
- `react-markdown` + `rehype-sanitize` — markdown viewer
- Radix UI primitives — adapted component layer

### Extension adoption / deferral (extracted from Round 5)

**Adopt for v1:**
- `aeltayeb/spec-kit-spec-validate` — SHA-256 content-hash gates
  for step contracts. Install before Run 1. Provides the
  hash-validate gate at the Analyze → Review boundary that matches
  Principle VIII's intent.
- `psingley/concierge-jira` — see JIRA submission specifics above.

**Deferred post-v1:**
- Wireframe Visual Feedback Loop — replaced in v1 by "Send to
  Figma" / "Send to Claude Design" buttons on the Review screen.
  Architecture leaves a hook; no implementation in v1.
- Worktree Isolation — Session tuple stays `(workspace, branch,
  CLI, model)` in v1. Worktrees + multi-session post-v1 if needed.
  Collaboration / parallel implementation candidates also post-v1.
- V-Model, Agent Assign, QA Testing, MemoryLint — not in v1.

### Slicing strategy (re-sequenced per Round 6)

Carry-overs from the round-6 build-vs-borrow audit that affect the
13-run sequence above:

- ESLint Pure/Effect layer-boundary rules + pino promote into
  **Run 1**. Establishing them once saves retrofit cost across every
  downstream run. Factory-pattern conventions are documented in Run 1
  but the first concrete factories land with Run 2 (Main Data Layer)
  and Run 4 (IPC Bridge), where the first cross-boundary payloads
  exist to validate.
- RTK Query custom `ipcBaseQuery` promotes into **Run 2** (before
  any UI work). It shapes renderer data access for everything
  downstream.
- Listener middleware catalog + selector catalog + slice catalog
  merge into one **state architecture spine** run (folded into the
  scope of Run 4, "IPC Bridge & Redux Store Skeleton").
- The HTTP API run (current Run 10) splits into two phases: Phase A
  internal command adapter + auth/token/discovery contract; Phase B
  full endpoint breadth + SSE streaming.
- UI component work in Runs 7–9 splits into Phase A primitive
  accessibility contracts (orb stepper, three-state controls,
  modal) and Phase B visual polish + full component library.

These resequencings inform the spec.md scopes for the affected
runs; the dependency graph above is the source of truth for run
order.

## Risks and mitigations

- **R1: ACP support in Copilot CLI is recent.** Mitigation: Run 3
  records transcripts against the actual installed CLI before
  writing any production code. If transcripts reveal protocol gaps,
  raise as a constitution amendment before Run 4 starts.
- **R2: The JIRA spec-kit extension may have changed since the user
  last customized it.** Mitigation: Run 11 / 12 begin with a fresh
  install + diff of the user's prior customization against the
  current extension version.
- **R3: Electron Forge + Vite + TypeScript strict has integration
  rough edges.** Mitigation: Run 1's plan step explicitly validates
  the four-tool combo before any feature spec proceeds.
- **R4: Designer's v2 design includes affordances not yet specified
  in detail (e.g., the celebration screen's animation choreography).**
  Mitigation: vertical slices reference `design/project/<file>.jsx`
  directly; ambiguity surfaces in that slice's clarify step.

## What's deferred and explicitly not in v1

- Auto-update.
- macOS / Linux installers.
- Multi-org support (org is the constant `"collette-travel"`).
- Plugin architecture for additional MCPs.
- Per-tool MCP permission prompts.
- MCP-as-a-transport for external agents (the localhost HTTP API
  is the only v1 external surface).
- Claude Code, Cursor, Zed, or any other ACP client as the Bound CLI.
  Only ACP agents qualify.
- Telemetry / RUM. Logs are local-only.
- Open-source preparation.

## Open questions — deferred to a future specify run

These are real architectural questions surfaced during earlier runs
that don't block the current run but need an answer before the
relevant downstream run lands.

### Branch and spec-directory sequencing across users (open; deferred to Run 5)

**The problem.** Each user starts a new spec-kit Run by pulling
`main` locally. They produce a `spec/NNNN-<slug>` branch with a
`specs/NNNN-<slug>/` directory. They may or may not ever merge
that branch back to `main`. Other users on the same repo pull
`main` at different times and start their own Runs. Because
spec-kit's branch numbering increments based on what's in `specs/`
on the current branch, **two users pulling `main` at the same SHA
will both produce `spec/0004-*` branches independently. The
ordinal `NNNN` is no longer globally meaningful — it's per-user
wishful thinking.**

The Concierge App's design (Session = workspace + branch + Bound
CLI + model; resume from any local branch state per the Disk Is
Truth principle) explicitly accepts that **most spec branches are
ephemeral**: per-user explorations, drafts, abandoned attempts,
parallel work. The model is "local notebook page that may or may
not become a published article" — NOT "feature branch that lands
in main."

**Implications if left unresolved:**
- Branch namespace collisions across users on the same repo
  (different SHAs at the same `NNNN` slot, with different slugs).
- Filesystem path drift if multiple users do eventually merge —
  `main` ends up with both `specs/0004-foo/` and `specs/0004-bar/`.
- Jira epic labeling drift — two users' "Run 4" epics in the same
  KCKB project, indistinguishable by their human-readable label.
- Cross-Run dependencies (e.g., Run 2 needs Run 1's foundation)
  can't assume "main has Run 1 merged" — they have to either
  branch off a spec branch directly, or reference prior runs'
  artifacts by SHA.

**Temporary solution for v1, locked now (least-disruptive):**
**Accept the ephemera. Flat ordinal naming (`spec/NNNN-<slug>`,
`specs/NNNN-<slug>/`) stays as-is.** Most v1 users are running
this on their own local repo without a shared multi-user
workflow, so the collision risk is theoretical, not observed.
ROADMAP_DECISIONS.md remains the canonical "what Run N is";
filesystem layout is a convenience, not a contract.

**The real fix is deferred to Run 5 (Step Lifecycle).** Possible
strategies to evaluate when we get there:
- (A) **Per-user prefix** — `spec/<user>-NNNN-<slug>`,
  `specs/<user>/NNNN-<slug>/`. Eliminates collisions; minor
  customization to the bundled git extension's branch-naming
  script. Concierge App UI distinguishes "your Run 4" vs
  "alice's Run 4."
- (B) **Timestamp ordinal** — `spec/2026-05-26T143022-<slug>`.
  Built-in spec-kit support via `--branch-numbering timestamp`.
  Collisions ~impossible; semantic "Run N" mapping lives only in
  ROADMAP/Jira, not in filename.
- (C) **Drop ordinal entirely** — `spec/<slug>` (e.g.,
  `spec/foundation-shell`). The Run number lives in spec.md
  frontmatter (`roadmap-run: 1`) and Jira labels, never in
  filenames. Most aggressive deviation from spec-kit defaults.

**Run 5 will pick one** when the multi-user / never-merge story
needs to land for real (HTTP API + external-agent driving from
Run 10 onward makes the "many parallel runs from many actors"
case observable, not theoretical).

**What this means for Runs 2-4 right now:**
- Continue flat ordinal naming. `spec/0002-main-data-layer`,
  `spec/0003-acp-adapter`, etc.
- Run 1's `specs/0001-foundation-shell/` layout stays as-is.
- When dependencies cross runs, branch the new spec directly off
  the prior spec branch (not off `main`), since `main` may not
  have the prior run merged. Document the parent SHA in the new
  spec's plan.md.
- Jira epic labels include the run slug, not just "Run N", so
  cross-user collision is at least visually flagged.

---

## Open questions for the first specify run

These were the Run 1 open questions; preserved here for historical
reference. All resolved during Run 1's grilling session
(see `specs/0001-foundation-shell/grill.md`):

- Vite vs electron-vite vs Electron Forge's bundled webpack template.
  Codex flagged Electron Forge as official; the renderer build tool
  inside Forge is the open call.
- Exact ESLint config shape for the Pure/Effect layer rule (a custom
  rule? a `no-restricted-imports` pattern? both?).
- The minimum smoke test for Run 1 — a single Playwright assertion
  that the app launches, or a richer "auth chip is visible with
  expected initial state" assertion.
- pino vs other Node loggers; the constitution says "pino or
  equivalent" — Run 1 picks.

These are appropriate to defer to clarify, not to pre-resolve here.

---

*Drafted 2026-05-22 alongside constitution v1.0.1. Subject to amendment
via PR labeled `constitution-change`.*
