# Grill — Run 1: Foundation Shell & Boundaries

> Grill-with-docs session per Principle XVI. Resolves ambiguities in
> ROADMAP_DECISIONS Run 1 scope before `/speckit.specify` is invoked.
> Format follows `.agents/skills/grill-with-docs/SKILL.md`.

**Scope (from ROADMAP_DECISIONS line 32-38):**
Electron Forge scaffold with Vite-renderer template, main / renderer /
preload split, TypeScript strict, ESLint with the Pure/Effect
layer-boundary rules, Vitest harness, Playwright harness, GitHub
Actions CI. Acceptance: `npm run dev` launches a blank window;
`npm run test:coverage` succeeds with zero tests; `npm run e2e`
succeeds with one smoke test.

**Locked in advance (no grilling needed):**

- Electron Forge + Vite (constitution + ROADMAP)
- TypeScript strict (ROADMAP)
- Pure/Effect ESLint rules promote into Run 1 (ROADMAP)
- pino logging promotes into Run 1 (ROADMAP)
- Vitest + React Testing Library (ROADMAP)
- Playwright via Electron `_electron` API (ROADMAP)
- GitHub Actions CI (ROADMAP)
- Run 1 Plan step authors `.github/copilot-instructions.md` (ROADMAP)
- Windows-only ship in v1; Mac/Linux dev-from-source (ROADMAP)
- Auto-update deferred (ROADMAP)

---

## Q1 — Windows installer maker

**Question:** Which Electron Forge maker for the Windows installer?

**Answer:** NSIS (`@electron-forge/maker-wix` or `electron-forge-maker-nsis`).

**Reasoning:**
- Auto-update already deferred per ROADMAP, so Squirrel's free
  auto-update doesn't earn its keep.
- NSIS plays nicer with corporate Windows (collette-travel internal
  tool): UAC, Group Policy, antivirus all friendlier.
- Squirrel.Windows has been in maintenance mode since ~2021; community
  is quietly migrating off.
- NSIS via Electron Forge "maker" abstraction is the easier path in
  practice — write a config block, get a predictable installer.

**ADR candidate?** Yes (hard-to-reverse: install/update contract is
baked in once users have the app; surprising-without-context: a future
reader will ask "why not Squirrel like everyone else?"; real
trade-off: Squirrel vs NSIS vs MSIX were all real alternatives).
**→ Create ADR-0001 during Plan step.**

---

## Q2 — CI matrix breadth

**Question:** Which OS matrix for GitHub Actions CI in Run 1?

**Answer:** Windows only.

**Reasoning:**
- Ship target is Windows-only in v1; CI matches the ship target
  exactly.
- Mac/Linux are dev-from-source only per ROADMAP — devs run things
  locally, they don't need CI signal on their personal dev surface.
- Fast, cheap, focused signal. Mac-only dev breakage caught by
  developers running things locally before opening a PR.
- Trivially reversible later if Mac/Linux contributors show up.

**ADR candidate?** No (easy to reverse — add a matrix entry; not
surprising — matches ship target).

---

## Q3 — Vitest coverage threshold in Run 1

**Question:** Coverage gate posture for Run 1 (which ships with zero
tests)?

**Answer:** Don't set a coverage threshold in Run 1. Coverage report
runs, prints numbers, no gate.

**Reasoning:**
- Zero tests in Run 1 means any threshold > 0 fails CI.
- A 0% threshold is meaningless theater.
- Defer the threshold to the run that introduces the first real
  cohort of tests; pick a number anchored to that real signal.
- ACP carve-out from constitution (`main/data-layer/acp/` may use
  recorded transcript contract tests instead of line coverage) gets
  resolved when the ACP run lands (Run 3); no need to pre-encode it
  in Run 1's vitest config.

**ADR candidate?** No (easy to reverse — add a threshold later;
defers a decision rather than locks one).

---

## Q4 — Pure/Effect ESLint rule enforcement level

**Question:** ESLint posture for the Pure/Effect layer-boundary rule in
Run 1?

**Answer:** `error` from day one. No `warn` phase, no escape-hatch
comment policy.

**Reasoning:**
- Constitution Principle I declares the Pure/Effect split
  non-negotiable. Enforcement should match.
- The rule polices *imports*, not function calls. Pure→Effect
  fire-and-forget calls (per project's runtime architecture: pure
  dispatches effects, effects dispatch actions back into the store)
  are fine — the rule never sees them.
- Hedging concern about "wet cement false positives during Run 1"
  was incoherent: ESLint only runs on files that exist. Run 1 has
  ~5 files, all of them placed correctly in their lanes; no false
  positives are possible.
- Initial-state literals in Redux slices live in pure-layer files
  and are static values, not effect-layer imports — no conflict.
- `warn`-mode would invite the broken-window problem by Run 4 with
  accumulated drift to clean up at once.

**ADR candidate?** No (the constitution already records the rule;
this is just its enforcement level).

---

## Q5 — Playwright smoke test scope

**Question:** What does Run 1's "one smoke test" actually assert?

**Answer:** The canonical Electron smoke trio: window opens, window
title matches expected string, zero console errors during launch.

**Reasoning:**
- Catches the three most common Electron breakage modes from day one:
  binary won't launch, preload broken, renderer module-load error.
- ~10 lines of test code over a bare "launch and quit" test.
- DOM-content assertions (option D) are overkill — Run 1's renderer
  is intentionally a blank window with no meaningful DOM to assert
  against. Real first-render assertions land with Run 4 (Renderer
  slice skeleton) and Run 6 (Specify vertical).

**ADR candidate?** No (easy to extend or tighten in any later run).

---

## Q6 — TypeScript strict-mode preset

**Question:** Which TypeScript strict posture for Run 1?

**Answer:** `"strict": true` + `noUncheckedIndexedAccess: true`. Defer
`exactOptionalPropertyTypes` for now.

**Reasoning:**
- `strict` bundle is the industry default; covers the seven core
  correctness flags.
- `noUncheckedIndexedAccess` turns `arr[0]` into `T | undefined`,
  forcing explicit handling of empty-list and missing-key cases.
  Catches a real class of crash for ~5 seconds of typing per access.
- `exactOptionalPropertyTypes` is more controversial — it bites at
  adapter boundaries with third-party library types. Reasonable
  future-add when patterns warrant; not worth Run 1 friction.

**ADR candidate?** No (pure compiler-flag posture; trivially
adjustable via tsconfig.json edit).

---

## Q-extra — Runtime schema library policy (cross-cutting, locked at Run 1)

**Question:** Does the project use a runtime schema library (Zod or
alternative) for trust-boundary validation, or does it use hand-written
factory functions only?

**Answer:** Factory pattern only. No runtime schema library. Every
cross-boundary payload (IPC main↔renderer, HTTP API in/out, ACP frames,
on-disk JSON, MCP responses) passes through a hand-written factory
function. The factory's return type IS the typed shape. No parallel
schema definition is maintained.

**Reasoning:**
- Constitution Principle IV (Factory-First Data Transformation) already
  mandates factories at every cross-boundary point; removing the
  schema library makes the factory the single source of truth instead
  of a downstream consumer of the schema.
- Maintenance tax: keeping schema-library schemas in sync with TS
  types is a continuous two-source-of-truth cost. For an internal
  Electron app with no third-party schema consumers (no GraphQL
  emission, no OpenAPI generation, no JSON-schema export), that cost
  earns no return.
- The Clarify factory's documented failure modes (LF/CRLF mixing,
  missing question text, malformed multiple-choice blocks, missing
  short-answer affordance, markdown-emphasis-at-line-start parsing
  bugs) are imperative checks against textual artifacts — they don't
  translate cleanly into declarative schema-library rules anyway.
  Hand-written factories make them first-class.
- Factory tests become the discipline replacement. Co-located test
  files per factory. Hostile-input fixtures (`{}`, `null`, missing
  fields, deep malformation, the specific clarify failure modes) are
  mandatory.
- Run 1 itself has no factories — first concrete ones land Run 2
  (Main Data Layer) and Run 4 (IPC Bridge). Locking the decision at
  Run 1 prevents downstream runs from accidentally re-introducing a
  schema library.

**Constitution / ROADMAP impact:** Constitution v1.0.3 PATCH bumps
the amendment-history entry documenting this. `ROADMAP_DECISIONS.md`
Build / Borrow lists and Run 4 description updated. `CONTEXT.md`
Step Contract glossary entry generalized.

**ADR candidate?** Strong yes (hard-to-reverse: every factory in the
codebase will be hand-written; reintroducing a schema library later
means refactoring every trust-boundary factory; surprising without
context: many TS-Electron projects use Zod by default; real
trade-off: Zod vs Valibot vs ArkType vs hand-written were all real
alternatives). **→ Create ADR-0002 during Plan step.**

(ADR-0001 reserved for the NSIS-vs-Squirrel installer decision from
Q1.)

