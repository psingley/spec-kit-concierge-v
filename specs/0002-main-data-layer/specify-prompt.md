# /speckit.specify input — Run 2: Main Data Layer Foundation

> The exact prompt that will be passed to `copilot --agent=speckit.specify`
> via `copilot --effort medium --allow-all-tools --add-dir . -p
> "/speckit.specify <this-content>"`. Locked from
> `specs/0002-main-data-layer/grill.md` (8 questions resolved via user
> conversation 2026-05-27).

---

## Spec subject

Build Run 2 (Main Data Layer Foundation) of the Concierge Electron
desktop app. This is the second of 13 sequenced runs producing the
spec-kit-concierge-v product. Run 1 (Foundation Shell & Boundaries) is
complete and merged to main at HEAD `0046132`: working Electron Forge
+ Vite + TypeScript strict + ESLint Pure/Effect + Vitest + Playwright
+ pino + NSIS maker + Windows-only CI.

Run 2's scope is the main-process data layer plus the renderer-side
RTK Query base-query shape. NO IPC handlers, NO Redux store mounting,
NO HTTP server, NO ACP client, NO domain UI. Those land in Runs 3-13.

## Constitutional grounding

- Constitution: `.specify/memory/constitution.md` (current version
  v1.0.3). Principle I (Layered Architecture), Principle IV
  (Factory-First Data Transformation), Principle VIII (Step
  Contract), Principle XVI (Grill-with-docs) all apply.
- ROADMAP_DECISIONS.md lines 40-46 define Run 2 deliverables. Round-6
  audit promotion at lines 694-696 adds RTK Query `ipcBaseQuery` to
  Run 2's scope.
- ADR-0002 (factory-pattern-no-runtime-schema) governs all factory
  work in this run.
- A constitution amendment (v1.0.4 PATCH) lands in this run's Plan
  step to relax Principle I's workspace-path-guard clause per Q2.

## Locked decisions from grill (specs/0002-main-data-layer/grill.md)

These are NOT open questions; they are settled. Do NOT re-raise them
in `/speckit.clarify`. Each is the result of explicit user
conversation 2026-05-27.

### Q1 — fs/safeWrite atomicity

Direct overwrite via `fs.writeFile` + `fsync`. NO write-temp-then-
rename. Rationale: Step Commit boundaries provide coarse rollback;
power-loss-mid-write is rare; user explicitly chose simplicity over
atomicity. May produce ADR-0003 if Plan step decides documentation is
needed.

### Q2 — Workspace path guard

NONE. `safeWrite` writes wherever it's told. Constitution Principle I
must be amended in this run's Plan step to remove the "refuses writes
outside the active Workspace path" clause, replacing it with
"Filesystem writes go through a typed helper that logs the target
path and the calling Step." Audit trail replaces the gate. User
quote: "i trust our users and do not want ANY permissions hiccups."

### Q3 — Concierge-Step trailer parser

LENIENT. Case-insensitive key match. Partial values accepted with
`interpretation: 'exact' | 'normalized' | 'partial'` tag on the
parsed shape. Duplicates: last-trailer-wins, earlier ones logged at
`warn`. No-trailer commits silently skipped. Parser NEVER throws —
always returns a parsed shape.

Generalizable pattern noted: trust-boundary factories (IPC payloads)
are strict; disk-recovery factories (reading user's git history) are
lenient. Likely ADR in Run 5 when step-state replay is the active
concern.

### Q4 — agents.json schema

Concrete values, no placeholders. ACP-mode flag verified against
installed Copilot CLI at grill time:

```
$ copilot --version
GitHub Copilot CLI 1.0.54.
$ copilot --help | grep -i acp
  --acp                                 Start as Agent Client Protocol server
```

Manifest entry shape:

```json
{
  "version": 1,
  "agents": {
    "copilot": {
      "displayName": "GitHub Copilot CLI",
      "binary": "copilot",
      "launchArgs": ["--allow-all-tools"],
      "acpModeFlag": "--acp",
      "verifiedAgainst": {
        "version": "1.0.54",
        "verifiedAt": "2026-05-27"
      },
      "capabilities": ["text", "tools"],
      "modelSelectionStrategy": "unstable_setSessionModel|restart",
      "defaultModel": null
    }
  }
}
```

Loader treats missing `verifiedAgainst` block on a future agent entry
as "not verified" and surfaces at `warn`. Loader does not throw on
unverified entries.

### Q5 — pino config

Single ndjson stream to
`<userData>/logs/concierge-<ISO-date>.log`. Date-rotated (new file per
calendar day). NO size-based rotation, NO retention policy in Run 2
(Run 13 packaging concern). `level: 'info'` default, `'debug'` when
`process.env.CONCIERGE_DEBUG === '1'`. Base fields: `pid`, `hostname`,
`app: 'concierge'`, `version` from package.json at boot. Pretty-print
via `pino-pretty` ONLY in `npm run dev` pipe; ndjson on disk
always. `redact: []` empty placeholder for Run 3's token arrival.

### Q6 — RTK Query ipcBaseQuery

Tag-based invalidation with 8 upfront `tagTypes` declared in Run 2:

```ts
tagTypes: [
  'Workspace', 'StepState', 'GitState', 'Agent',
  'Session', 'Step', 'Transcript', 'Preferences'
] as const
```

`ipcBaseQuery: (args: IpcQueryArgs) => Promise<{data}|{error}>` wraps
`window.electronAPI.invoke(channel, payload)`. Errors from main
process surface as `{error: {status: 'IPC_ERROR', data: {...}}}`.
Renderer never sees a thrown Error from IPC.

Run 2 ships ONLY: the `tagTypes` constant, the `ipcBaseQuery` function
implementation, ONE trivial endpoint `getAppVersion` wired through it
end-to-end (preload bridge → IPC handler → factory → RTK Query) to
prove the shape. NO domain endpoints. NO RTK Provider mount (that's
Run 4).

New runtime dependencies: `@reduxjs/toolkit` (latest stable),
`react-redux` (latest stable). Document pinned versions in plan.md.

Produces ADR-0003 (RTK Query tagTypes taxonomy) in the Plan step.

### Q7 — Layout refactor (ALREADY COMPLETE on commit dd7fd1b)

Run 1 used flat Electron Forge default layout (`src/main.ts`,
`src/renderer.tsx`, `src/preload.ts` at root). Constitution references
`main/data-layer/X` paths. The refactor was performed PRE-SPEC, on
commit `dd7fd1b` of branch `spec/0002-main-data-layer`. It is the
current state of the working tree as `/speckit.specify` runs.

**Completed moves (git-detected as renames):**
- `src/main.ts` → `src/main/index.ts`
- `src/renderer.tsx` → `src/renderer/index.tsx`
- `src/preload.ts` → `src/preload/index.ts`

**Six config files already updated:**
1. `electron-forge.config.ts` — Vite plugin `entry` paths
2. `vite.main.config.ts` — `build.lib.entry`
3. `vite.preload.config.ts` — `build.lib.entry`
4. `tsconfig.node.json` — `include` globs
5. `tsconfig.renderer.json` — `include` globs
6. `eslint.config.mjs` — file globs for Pure/Effect layer rules
   (plus `src/index.html` script src updated for the renderer entry)

**Verification already executed (all green at commit dd7fd1b):**
- `npm run lint` exit 0
- `npm run typecheck` exit 0 (tsconfig --listFiles confirms new
  paths are typechecked)
- `npm run test:coverage` exit 0
- `npm run e2e` exit 0 (smoke spec passes in 931ms)
- Pre-refactor e2e on Run 1 baseline: PASS (refutes hypothesis that
  the failure mode was environmental)
- ESLint `print-config` confirms layer rules apply to new paths

**Spec.md MUST describe the post-refactor world.** Do NOT include the
refactor as a Run 2 deliverable; it is already done. Constitution's
`main/data-layer/X` IS the literal disk path `src/main/data-layer/X`
as of commit `dd7fd1b`.

Codex collaborator (agentId afbe8c5c3cd8202af) confirmed no Electron
Forge / Vite technical constraint on flat-entry paths. The flat
layout was template inertia.

### Q8 — Factory test discipline floor

Every Run 2 factory ships with a co-located `*.factory.spec.ts`
containing AT MINIMUM these 5 cases:

1. Happy path (valid input → valid typed output)
2. `{}` empty object → named error
3. `null` → named error
4. `undefined` → named error
5. One factory-specific hostile case (e.g., trailer:
   `"Concierge-Step: garbage:value"`; agents.json: `{"version": "1"}`
   string-where-number)

Vitest. `.spec.ts` not `.test.ts`. Co-located in same directory as
the factory.

## Run 2 deliverables (in dependency order)

(The layout refactor from Q7 is pre-completed on commit `dd7fd1b` and
is NOT a Run 2 deliverable. The 16 items below build on top of it.)

1. **`src/main/data-layer/fs/safeWrite.ts`** + co-located factory spec
   (Q1, Q8).
2. **`src/main/data-layer/git/trailers.ts`** — lenient
   Concierge-Step parser (Q3) + spec.
3. **`src/main/data-layer/git/branchState.ts`** — read current
   branch, ahead/behind, dirty/clean + spec.
4. **`src/main/data-layer/git/uncommittedPaths.ts`** — check whether a
   given path-set has uncommitted changes + spec.
5. **`src/main/data-layer/agents/manifest.ts`** — agents.json schema
   factory (Q4) + spec.
6. **`src/main/data-layer/agents/loader.ts`** — load + validate
   agents.json at boot + spec.
7. **`src/main/data-layer/agents/agents.json`** — the seeded
   manifest with Copilot CLI 1.0.54 verified entry (Q4 JSON above).
8. **`src/main/logging.ts`** — extend Run 1's pino config to
   date-rotated files + dev pretty-print (Q5). Co-located spec
   covering rotation behavior.
9. **`src/renderer/api/baseQuery.ts`** — RTK Query `ipcBaseQuery`
   function + `tagTypes` constant (Q6) + spec.
10. **`src/renderer/api/index.ts`** — `createApi` with the empty-
    endpoints API slice + `getAppVersion` proof endpoint (Q6).
11. **IPC handler** `app:getVersion` — main-process side of the
    `getAppVersion` proof loop. NOT a domain handler; just enough to
    prove the IPC bridge works through the new RTK Query shape.
12. **Preload bridge** extension for the `app:getVersion` channel
    only. Future channels added per-domain in later runs.
13. **Constitution amendment v1.0.4** PATCH — relax Principle I
    workspace-path-guard clause (Q2). Amendment-history entry.
14. **`docs/adr/0003-rtk-query-tagtypes-taxonomy.md`** — ADR for Q6.
15. **`.github/copilot-instructions.md`** updated for Run 2
    conventions (data-layer module paths, factory-spec convention,
    RTK Query tagTypes reference).
16. **`package.json`** updated: `@reduxjs/toolkit`, `react-redux`
    added to `dependencies` with pinned versions.

## Acceptance criteria

- `npm run typecheck` exits 0 with the new `src/main/index.ts` etc.
  paths actually being typechecked (verify with `--listFiles` or
  equivalent positive confirmation).
- `npm run lint` exits 0 with the new paths actually being linted
  (verify Pure/Effect layer rules applied at correct boundaries:
  renderer-side `src/renderer/api/` MUST NOT import Electron APIs
  or Node built-ins).
- `npm run test:coverage` exits 0. Every Run 2 factory has at least 5
  spec cases per Q8. Test count > 0 (Run 1 was zero).
- `npm run e2e` exits 0. The existing Run 1 smoke test (window
  opens, title matches, zero console errors) still passes against the
  restructured entry points.
- `npm run dev` launches the app; pino dev pretty-print is visible in
  terminal; the `getAppVersion` end-to-end RTK Query proof endpoint
  returns the version string from main process through preload bridge
  through RTK Query to a renderer-side `dispatch` call.
- `agents.json` parses cleanly on boot, logs the loaded manifest
  shape at `info` level (with the Copilot entry verified).
- `src/main/data-layer/fs/safeWrite.ts` produces files on disk with
  fsync applied (no atomicity claim, but durability).
- Lenient trailer parser correctly handles all 8 cases enumerated in
  its factory spec.
- Constitution v1.0.4 amendment landed; amendment-history entry
  documents the Principle I relaxation.
- ADR-0003 (RTK tagTypes taxonomy) landed.

## What this run does NOT introduce

(To prevent /speckit.specify from over-scoping.)

- NO IPC handlers beyond the `app:getVersion` proof endpoint
- NO Redux store / Provider mount (Run 4)
- NO HTTP server (Run 10)
- NO ACP client / Bound CLI supervisor (Run 3)
- NO Step Commit writers (Run 5)
- NO hook executor (Run 5)
- NO domain step factories (specify/clarify/plan/tasks/analyze factories
  — Runs 6-9)
- NO product UI beyond the `getAppVersion` proof rendering
- NO MCP integration (Run 11)
- NO JIRA submission integration in the app (Run 12)
- NO Windows packaging changes (Run 13)

## Rationale for any deviation

If `/speckit.specify` finds a deliverable above that it believes
should be deferred or split, it MUST flag the deviation explicitly in
the produced spec.md under a "Deviations from grill" section, not
silently restructure. The grill is the source of truth.
