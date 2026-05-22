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
   `main/ipc/` handlers with Zod validation; renderer's eight slices
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

## Open questions for the first specify run

These are the things the **first specify** (Run 1) will need to clarify;
listing them here so the clarify step has predictable scope:

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
