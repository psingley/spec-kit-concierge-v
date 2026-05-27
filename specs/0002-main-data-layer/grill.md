# Grill — Run 2: Main Data Layer Foundation

> Grill-with-docs session per Principle XVI. Resolves ambiguities in
> ROADMAP_DECISIONS Run 2 scope before `/speckit.specify` is invoked.
> Format mirrors `specs/0001-foundation-shell/grill.md`.

**Scope (from ROADMAP_DECISIONS line 40-46):**
`main/data-layer/fs/safeWrite.ts`, git read primitives (read
`Concierge-Step:` trailers from log, read branch state, check for
uncommitted changes to a path set), workspace path guard, the
`agents.json` manifest shape and loader, pino-based structured logger
writing to `userData/logs/`. Plus the Round-6 audit promotion
(line 694-696): RTK Query custom `ipcBaseQuery` shape is decided in
Run 2 even though no UI consumes it yet — it shapes renderer data
access for everything downstream.

**Locked in advance (no grilling needed):**

- Factory-pattern-only validation (ADR-0002, constitution v1.0.3) —
  first real exercise lands here.
- pino as the structured logger (Run 1 locked the dependency; Run 2
  configures it).
- `main/data-layer/` is the only place I/O lives (constitution I).
- Workspace path guard exists; writes refuse paths outside active
  Workspace (constitution I).
- `Concierge-Step:` trailers are git-log read-only in Run 2 — the
  writer-side of step commits is Run 5 (Step Lifecycle).
- Run 2 introduces NO IPC handlers, NO renderer code, NO Redux
  slices, NO HTTP server. Pure main-process data-layer + the RTK
  Query base-query *shape definition* (not registration).
- Run 2 introduces the FIRST hand-written factories under
  `domain/factories/` — proof-of-concept against the agents.json
  manifest payload.

---

## Q1 — `fs/safeWrite.ts` atomicity contract

**Question:** What atomicity guarantee does `safeWrite` provide for the
file replace operation?

**Answer:** Direct overwrite. `safeWrite(path, contents)` performs a
plain `fs.writeFile(path, contents, { encoding: 'utf8' })` followed by
an `fsync` for durability. Errors mid-write may leave the target file
in a partial state.

**User decision (2026-05-27):** "direct" — explicitly chose plain
overwrites over write-temp-then-rename. Trade-off accepted: faster,
simpler, no temp-file litter; mitigated by the fact that every
Concierge writer is reachable via a factory whose Step Commit ALSO
serves as a rollback boundary (re-run the step, the factory rewrites
the file).

**Reasoning:**
- Simpler code path; no temp-file naming, no cross-platform rename
  semantics to defend.
- Step Commit boundaries (constitution III) already provide a
  coarse-grained rollback: a partially-written spec.md from a crashed
  `/speckit.specify` is simply a step in `pending` state with disk
  truth that doesn't match expectations — the next `/speckit.specify`
  run rewrites it.
- Power-loss-mid-write on user laptops is genuinely rare; the cost
  of defending against it (temp files, fsync ordering, rename
  semantics on Windows) was judged not worth it.
- `safeWrite` STILL enforces the workspace path guard (Q2). The
  "safe" in the name is about *boundary safety*, not *atomicity*.

**ADR candidate?** Maybe (it's a deviation from the
Concierge-jira convention; surprising-without-context: a reader might
ask "why not the same atomic-write as the rest of the family?"). User
explicitly chose direct, so the ADR documents the trade-off rather
than re-litigating it. **→ Tentative ADR-0003 during Plan step;
demote if Run 2 stays clean.**

---

## Q2 — Workspace path guard escape policy

**Question:** When `safeWrite` is called with a path outside the
active Workspace, what happens?

**Answer:** Nothing special. `safeWrite` writes wherever it's told.
There is no workspace path guard in Run 2.

**User decision (2026-05-27):** Explicitly rejected the guard:
"sometimes we work in other directories. i trust our users and do
not want ANY permissions hiccups or blockers." Settled ground; the
trust posture is permissive-by-default.

**Reasoning:**
- User runs Concierge as a trusted local tool on their own machine,
  not as a sandboxed multi-tenant service.
- Concierge legitimately needs to read/write outside any single
  workspace (e.g., `~/.copilot/`, the user's other repos when
  cross-referencing, the agents.json that may live in the
  application's userData rather than the workspace).
- A path guard would introduce a permanent friction surface for
  zero realistic threat in this deployment shape.

**Constitution drift note:** Constitution Principle I currently
references "Filesystem writes go through a workspace-scoped helper
that refuses writes outside the active Workspace path." That line is
now stale with respect to this decision. The constitution should be
amended in the Plan step of Run 2 to relax that clause — likely to
"Filesystem writes go through a typed helper that logs the target
path and the calling Step." The audit trail (where, when, by which
step) replaces the gate.

**ADR candidate?** No (the constitution amendment itself is the
record).

---

## Q3 — `Concierge-Step:` trailer parsing strictness

**Question:** How strict is the trailer parser? What does it do with
malformed trailers, duplicated trailers in one commit, or trailers in
unexpected casings?

**Answer:** Lenient parser. Best-effort interpretation with structured
warnings to the pino logger.

- **Key match:** Case-insensitive (`concierge-step`, `Concierge-Step`,
  `CONCIERGE-STEP` all accepted).
- **Value match:** Same regex as a normalizing filter, but partial
  values (`specify` with no status, `: pass` with no step) are
  accepted as `{step: 'specify', status: 'unknown'}` or
  `{step: 'unknown', status: 'pass'}` and logged at `warn`.
- **Duplicates:** Last-trailer-wins. Earlier duplicates logged at
  `warn` with the commit SHA.
- **No trailer:** Silently skipped (not a step commit).

The parser ALWAYS returns a parsed shape, never throws. The shape
includes an `interpretation: 'exact' | 'normalized' | 'partial'` tag
so downstream consumers can choose how to treat fuzzy hits.

**User decision (2026-05-27):** "lenient" — match the permissive
trust posture from Q2. User-authored commits (the user themselves
typing trailers by hand, or future hooks doing it imperfectly) should
not crash the step-state replay.

**Reasoning:**
- Step-state replay (Run 5) becomes a "show me what we know"
  surface, not "fail if anything's weird." `interpretation` tag lets
  the UI flag fuzzy commits without blocking the whole replay.
- pino's `warn` channel gives observability without blocking. The
  user can grep `<userData>/logs/concierge-*.log` for "trailer" if
  they care.
- The strict factory pattern (constitution IV) still applies to
  trust-boundary IPC payloads. Trailer-reading is a *recovery* path
  (reading the user's git history), not a *trust-boundary* path.
  Different posture is appropriate.

**ADR candidate?** Maybe — the parser-leniency posture is a
generalizable pattern ("trust-boundary factories are strict;
disk-recovery factories are lenient"). Likely deferred to Run 5
when step-state replay is the active concern.

---

## Q4 — `agents.json` schema shape

**Question:** What does an `agents.json` manifest entry look like in
v1, given only Copilot CLI is bound?

**Answer:** Concrete values, no placeholders. The ACP-mode flag is
verified against the installed Copilot CLI's `--help` AT GRILL TIME
(2026-05-27) rather than deferred to Run 3.

**Verification (2026-05-27):**
```
$ copilot --version
GitHub Copilot CLI 1.0.54.

$ copilot --help | grep -i acp
  --acp                                 Start as Agent Client Protocol server
```

Run 2 ships the manifest with the verified flag in place:

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

**User decision (2026-05-27):** "why dont we just do the thing we
need from run 3 now?" — pulled the ACP-flag verification forward.
30 seconds of `copilot --help` produced the value; no need for a
placeholder.

**Reasoning:**
- Eliminates a Run 3 task and a placeholder lifecycle from Run 2.
- `verifiedAgainst` block makes the audit trail explicit: future
  readers know exactly which Copilot version was checked and when.
  Run 3's contract tests can re-verify and bump the date if the
  installed CLI changes.
- `defaultModel: null` still means the bound CLI's own default.
- `capabilities` is an open-ended string array; v1 documents `"text"`,
  `"tools"`, `"vision"`, but the loader doesn't enforce membership.
- The factory still must handle a *future* unverified entry (someone
  adds a second agent to agents.json before Run 3 verifies it), so
  the `verifiedAgainst` block being absent is treated as "agent not
  verified" and surfaced in logs at `warn`. The loader does not throw.

**ADR candidate?** No (concrete values now, contract is simple,
extensibility shape is obvious).

---

## Q5 — pino logger structure + log rotation

**Question:** What does the pino logger config look like in Run 2,
and does it rotate?

**Answer:** Single ndjson stream to
`<userData>/logs/concierge-<ISO-date>.log`. New file per calendar day
(rotated by date prefix, not by size). No deletion policy in Run 2;
log retention is a Run 13 (Windows packaging) consideration.

Pino config:
- `level: 'info'` default; `level: 'debug'` when
  `process.env.CONCIERGE_DEBUG === '1'`.
- Base fields: `pid`, `hostname`, `app: 'concierge'`, `version` (from
  package.json at boot).
- ndjson format (pino default). NO pretty-print in production; pretty
  is a dev-only `pino-pretty` pipe in `npm run dev`.
- Redaction: nothing in Run 2 (no secrets touch the logger yet);
  redaction config exists as empty `redact: []` array so Run 3 (which
  introduces tokens) has an obvious place to add `['auth.token',
  'github.token']`.

**Reasoning:**
- Date-based rotation is simple and matches the user's workflow (one
  log file per day of usage).
- ndjson is what `jq` parses; events.jsonl pattern from Run 1 fire
  scripts is the same shape.
- Empty `redact` placeholder = the schelling point for Run 3's token
  arrival. Avoiding "add redaction later" drift.

**User decision (2026-05-27):** "your idea works" — date-rotated +
pretty-in-dev confirmed.

**ADR candidate?** No (config posture; reversible per-flag).

---

## Q6 — RTK Query `ipcBaseQuery` cache shape (Round-6 promotion)

**Question:** Per ROADMAP line 694-696, Run 2 owns the `ipcBaseQuery`
*shape*. What is its cache-invalidation strategy and initial
`tagTypes`?

**Answer:** Tag-based invalidation (RTK Query's standard pattern), NOT
polling and NOT manual `apiSlice.util.invalidateTags` everywhere.

Initial `tagTypes` declared in Run 2 (even though no endpoints exist
yet) so downstream runs slot into a stable taxonomy:

```ts
tagTypes: [
  'Workspace',       // active workspace path, agents.json contents
  'StepState',       // per-step status from trailer reader
  'GitState',        // branch, uncommitted paths, log
  'Agent',           // agents.json entries, current bound CLI
  'Session',         // ACP session (Run 3 populates)
  'Step',            // step artifacts (spec.md, plan.md, etc.)
  'Transcript',      // ACP transcript files (Run 3 populates)
  'Preferences'      // user prefs (Run 4 populates)
] as const
```

`ipcBaseQuery` is a function: `(args: IpcQueryArgs) => Promise<{data}|{error}>`
that wraps `window.electronAPI.invoke(channel, payload)`. Errors from
the main process surface as `{error: {status: 'IPC_ERROR', data:
{...}}}`; renderer never sees a thrown Error from IPC.

Run 2 ships ONLY: the `tagTypes` constant, the `ipcBaseQuery` function
signature + implementation, and a single trivial endpoint
(`getAppVersion`) wired through it to prove the shape. No domain
endpoints yet.

**Reasoning:**
- Tag-based invalidation is the RTK Query happy path; polling burns
  cycles and manual invalidation accumulates drift.
- Defining `tagTypes` upfront prevents per-run drift where each Run
  invents a new tag string and naming diverges (`'step'` vs `'Step'`
  vs `'steps'`).
- The trivial `getAppVersion` endpoint exercises the whole pipeline
  end-to-end (preload bridge, IPC handler, factory, RTK Query) with
  zero domain coupling — same role as Run 1's smoke test, scaled to
  IPC.
- Run 2 introduces the `ipcBaseQuery` shape in `renderer/api/` (yes,
  the renderer dir exists from Run 1) but does NOT mount any RTK
  Provider in the actual UI — Run 4 (IPC Bridge & Redux Skeleton)
  does that.

**User decision (2026-05-27):** "upfront seems good" — locked. User
also asked for first-pass verification of installed reality before
finalizing. Findings:

- **RTK / Redux NOT yet installed.** Run 1 ships `react`,
  `react-dom`, `pino` only. Run 2 adds `@reduxjs/toolkit` (includes
  RTK Query) and `react-redux` as new `dependencies`. Versions: pin
  to current latest stable at install time, document in plan.md.
- **No existing `tagTypes` shape to reconcile** — clean slate.
- **No `renderer/api/` directory exists yet.** Run 1's renderer is a
  single `src/renderer.tsx` file. Run 2 introduces the
  `src/renderer/api/` subdirectory (or equivalent under whichever
  layout Q7 settles).
- **TypeScript `const` assertion verified:** TS 5.7.2 in
  package.json supports `as const` array syntax for tagTypes
  declaration. No compiler-flag changes needed.

**ADR candidate?** Yes (the `tagTypes` taxonomy is hard-to-rename
once 8+ downstream runs are coupled to it; surprising-without-context:
many RTK Query projects defer `tagTypes` definition to first
endpoint; real trade-off: this-upfront vs lazy-grow). **→ Create
ADR-0003 during Plan step.**

---

## Q7 — Layout drift: flat entrypoints vs constitution-literal paths

**Question:** Constitution + ROADMAP reference `main/data-layer/X`,
`renderer/api/X`, etc. Run 1 shipped a flat Electron Forge default
layout (`src/main.ts`, `src/renderer.tsx`, `src/preload.ts` at root +
`src/main/logging.ts` subdir). Reconcile.

**Answer:** Run 2's Plan step performs a one-shot layout refactor to
match constitution-literal paths. The refactor is six mechanical
file edits with the four-command verification suite as the gate.

**Moves:**
- `src/main.ts` → `src/main/index.ts`
- `src/renderer.tsx` → `src/renderer/index.tsx`
- `src/preload.ts` → `src/preload/index.ts`

**Six config files updated in lockstep:**
1. `electron-forge.config.ts` (Vite plugin entry paths)
2. `vite.main.config.ts` (`build.lib.entry`)
3. `vite.preload.config.ts` (`build.lib.entry`)
4. `tsconfig.node.json` (`include` globs)
5. `tsconfig.renderer.json` (`include` globs)
6. `eslint.config.mjs` (file globs for Pure/Effect layer-boundary
   rules)

**Verification gate:**
```
npm run lint && npm run typecheck && npm run test:coverage && npm run e2e
```
Plus a positive file-list confirmation: `npm run lint -- --debug 2>&1
| grep "src/main/index.ts"` (or equivalent) to prove the new paths
are actually being checked — guard against the silent-skip gotcha
where typecheck/lint pass because the new files aren't in any
include glob.

**User decision (2026-05-27):** "restructure, but do so by having
codex collaborator review your proposed restructuring here" →
codex-rescue spawned, returned "hybrid" (option C) on round 1.
User pushed back: "is there some reason we can't just refactor
this now and verify?" Round 2 codex-rescue verdict (agentId
afbe8c5c3cd8202af): "no technical Forge/Vite constraint requires
flat entry files; `src/main/index.ts` should work if every explicit
reference is updated. The flat layout was Electron Forge template
inertia, full stop."

**Reasoning:**
- @electron-forge/plugin-vite v7.6.0 `entry` is typed as Vite's
  standard `LibraryOptions['entry']` — accepts any resolvable path.
  No path-flatness constraint.
- vite.main.config.ts and vite.preload.config.ts `build.lib.entry`
  same shape — any path.
- Run 1's flat layout was Copilot taking the Electron Forge README
  example verbatim, not a deliberate architectural choice.
- Doing the refactor in Run 2 (before any other module code is
  written) costs ~6 file edits. Doing it in Run 5 or later would
  cost ~6 file edits PLUS rewriting every existing import path
  across however many modules have landed by then. Now is cheapest.
- The hidden gotcha codex flagged (tsconfig/eslint globs silently
  skipping new files) is defended against by the verification gate
  explicitly checking the new paths appear in lint/typecheck output.

**Consequence for everything downstream:** From Run 2 onward, the
constitution's `main/data-layer/X` path IS the literal path
`src/main/data-layer/X` on disk. No more shorthand mapping; docs
match disk exactly.

**ADR candidate?** Maybe — the rename is hard to undo once factories
land underneath. But the *decision* is mostly "restore consistency
with constitution," which the constitution already asserts. Defer
ADR; capture in plan.md instead.

---

## Q8 — Factory test discipline for Run 2's first factories

**Question:** Constitution IV mandates "hostile-input fixtures" for
every factory. What's the test discipline floor for Run 2's
factories?

**Answer:** Every factory in Run 2 ships with a co-located
`*.factory.spec.ts` file containing AT MINIMUM:
- Happy path (valid input → valid typed output).
- Empty object `{}` → named error.
- `null` input → named error.
- `undefined` input → named error.
- One factory-specific hostile case (e.g., for the trailer factory:
  `"Concierge-Step: bogus:value"`; for the agents.json factory:
  `{"version": "1"}` (string instead of number).

Co-located = same directory as the factory, `.spec.ts` not
`.test.ts` (Vitest convention from Run 1).

**Reasoning:**
- The four common hostile inputs (`{}`, `null`, `undefined`, +
  type-specific bad case) catch ~80% of real-world breakage with
  minimal test surface.
- Co-location keeps the discipline visible: PR review can't miss
  "where's the test for this factory?"
- Setting the floor in Run 2 (the FIRST factory run) means downstream
  runs inherit a discipline norm rather than negotiating it per-PR.

**User decision (2026-05-27):** "yes" — 5-case floor locked.

**ADR candidate?** No (test-discipline floor is project convention,
not a hard-to-reverse architectural decision).

---

## Grill resolution summary

All 8 questions resolved through user conversation (2026-05-27). Run 2
scope is now fully locked, no open ambiguities. Decisions sit in
each Q above with explicit user-decision attribution where applicable.

| Q | Topic | Decision | ADR? |
|---|---|---|---|
| Q1 | safeWrite atomicity | direct overwrite + fsync | tentative ADR-0003 |
| Q2 | path guard | none (permissive); constitution amend in Plan | constitution amend |
| Q3 | trailer parser | lenient + `interpretation` tag | maybe Run 5 |
| Q4 | agents.json shape | concrete (--acp verified at grill-time) | no |
| Q5 | pino config | date-rotated + pretty-in-dev | no |
| Q6 | RTK tagTypes | upfront, 8 tags | ADR-0003 |
| Q7 | layout drift | restructure to constitution-literal paths | maybe |
| Q8 | factory tests | 5-case floor, co-located *.factory.spec.ts | no |

**Run 2 deliverables (final):**
1. Layout refactor (Q7): `src/main/index.ts` + `src/renderer/index.tsx`
   + `src/preload/index.ts`; six config files updated; four-command
   verification.
2. `src/main/data-layer/fs/safeWrite.ts` — direct overwrite + fsync
   (Q1).
3. `src/main/data-layer/git/` — trailer reader (lenient, Q3),
   branch-state reader, uncommitted-path-set checker.
4. `src/main/data-layer/agents/` — agents.json schema + loader (Q4),
   verified Copilot CLI 1.0.54 entry shipped.
5. `src/main/logging.ts` extended to date-rotated pino config (Q5).
6. `src/renderer/api/` — RTK Query `ipcBaseQuery` shape + 8 tagTypes
   (Q6) + trivial `getAppVersion` proof endpoint.
7. `src/main/data-layer/` factories all ship with co-located
   `*.factory.spec.ts` at 5-case floor (Q8).
8. Constitution amendment: relax Principle I's "refuse writes outside
   workspace" clause to "log writes with calling Step" (Q2).
9. ADR-0003: RTK Query tagTypes taxonomy (Q6).

Run 2 does NOT introduce: IPC handlers, Redux Provider mount, HTTP
server, ACP client, Step Commit writers, hook executor, factories for
domain steps. Those land in Runs 4-5.
