# Run 5 Research - Step Lifecycle & Hook Infrastructure

## Scope

This research resolves the implementation choices required by `specs/0005-step-lifecycle-hooks/spec.md`, `grill.md`, and `clarifications.md`. All decisions preserve Runs 2-4 and introduce no runtime dependencies.

## 1. Git `interpret-trailers` and Step Commit shell-out pattern

**Decision**: Extend `src/main/data-layer/git/gitCommand.ts` with write-side helpers that use `execFile('git', args, { cwd })` against a real repository. The Step Commit writer stages only manifest-approved files, writes the proposed commit message to a temporary file, appends exactly one `Concierge-Step: <step>:pass` trailer with `git interpret-trailers --in-place --trailer`, then commits with `git commit -F <message-file>`. Analyze may pass `--allow-empty`; no other step may. `--no-verify` is not accepted in the API or command args.

**Pattern**:

```ts
await runGit(repositoryPath, ['add', '--', ...files]);
await writeTemporaryCommitMessage(messageFile, message);
await runGit(repositoryPath, [
  'interpret-trailers',
  '--in-place',
  '--trailer',
  `Concierge-Step: ${step}:pass`,
  messageFile
]);
await runGit(repositoryPath, ['commit', '-F', messageFile, ...(allowEmpty ? ['--allow-empty'] : [])]);
```

**Rationale**:

- Real `git commit` is required so repository pre-commit hooks run. `simple-git`, nodegit, or libgit2-style paths can bypass hook semantics and are forbidden.
- `git interpret-trailers` avoids hand-formatting trailer blocks and keeps the trailer compatible with Run 2's lenient `parseConciergeStepTrailer`.
- `execFile` avoids shell interpolation. Args stay typed and auditable.
- A file-based commit message avoids quoting bugs in multiline messages and keeps trailer insertion deterministic.

**Error handling**:

- Preserve `GitCommandError` with command args and original cause.
- Pre-commit hook rejection is a hook failure that routes to Step Escape Hatch with hook output surfaced.
- The commit writer must verify the final commit contains exactly one `Concierge-Step: <step>:pass` trailer.

**Testing**:

- Use real temporary git repositories.
- Create a passing pre-commit hook to prove hooks run.
- Create a failing pre-commit hook to prove no `--no-verify` bypass exists and output is surfaced.
- Use Analyze no-diff repository state to prove only Analyze can commit with `--allow-empty`.

## 2. Trailer-history restoration pattern

**Decision**: Add a git-history reader beside the Run 2 trailer parser. It shells out to `git log` for current-branch commit subjects/bodies, parses each message through `parseConciergeStepTrailer`, and applies last-trailer-wins semantics per step before mapping to renderer state.

**Mapping**:

| Trailer status | Renderer `StepState` |
|---|---|
| `pass` | `complete` |
| `pending` | `pending` |
| `fail` | `not_available` |
| `skipped` | `not_available` |
| unknown or partial unrecoverable | ignored with parser warning |

**Rationale**:

- Git history is durable truth; renderer state is derived cache.
- Last-trailer-wins matches resume semantics and avoids replaying stale earlier state.
- The Run 2 parser is intentionally lenient and should remain the only text parser for `Concierge-Step` commit messages.

**Testing**:

- One status at a time using real or fixture commit messages.
- Duplicate trailers in one commit continue to use the Run 2 parser's "last trailer in message wins" behavior.
- Multiple commits for one step use "last commit with that step wins".

## 3. `createListenerMiddleware` effect patterns for step lifecycle

**Decision**: Fill `src/renderer/listeners/stepLifecycle.listener.ts` with listener effects for step restoration, dirty resume, Clarify re-ask, and Escape Hatch coordination. Use public actions and RTK Query endpoints as the observable interface; do not import main-process modules, Node APIs, Electron APIs, or internal supervisors.

**Pattern**:

- Listen for workspace activation/hydration actions and trigger trailer restoration through the existing preload/RTK Query boundary.
- Listen for lifecycle actions such as step pending, completion, reset, dirty resume, and Clarify malformation.
- Keep effect dependencies injectable where timing or ACP dispatch must be controlled in tests.
- Dispatch reducer actions only after process-boundary data has passed renderer-entry factories.

**Rationale**:

- Listener middleware is the constitutional cross-domain effect primitive.
- Reducers stay pure and enforce invariants; effects own logging, IPC, activity, and ACP prompts.
- Tests remain public-interface-oriented: dispatch actions into a product store and observe state/activity, not private helper calls.

**Clarify re-ask**:

- The listener catches `clarify/questionMalformed`.
- It prompts the Bound CLI to rewrite only the malformed question.
- It tracks attempts per `questionId`.
- Attempts 1 and 2 re-ask; the third failed rewrite reaches the bound and triggers Step Escape Hatch with `clarify-rigor-exhausted`.

## 4. Listener pattern for transcript capture and hang detection

**Decision**: Fill `src/renderer/listeners/transcriptCapture.listener.ts` with ACP stream event capture and hang detection. ACP events update activity and `lastAcpEventAt`. A 30-second check emits `hang-suspected` only when silence is at least 20 minutes. Hang detection never auto-fails, cancels, retries, or resets a step.

**Pattern**:

- Store latest ACP activity timestamp in renderer state.
- Use fake-timer-testable scheduling through listener middleware and injectable time.
- Deduplicate `hang-suspected` for the same silence window so the activity stream is not spammed.
- Reset the hang observation once a new ACP event arrives.

**Rationale**:

- ROADMAP lines 484-487 lock 20 minutes as the v1 threshold.
- The 30-second check interval is low overhead and precise enough for a soft warning.
- The soft-notification posture avoids false-negative interruptions for long-running agents.

**Testing**:

- ACP event appends activity and updates timestamp.
- No `hang-suspected` before 20 minutes.
- One `hang-suspected` at or after 20 minutes.
- No auto-fail/cancel/retry actions are dispatched.

## 5. Three-state monotonic reducer pattern

**Decision**: The `steps` slice uses `createEntityAdapter` records with `status: 'not_available' | 'pending' | 'complete'`. Ordinary reducers allow only `not_available -> pending -> complete`. `stepReset` is the only reducer that moves any step back to `not_available`.

**Pattern**:

```ts
const canBecomePending = (current: StepState) => current === 'not_available';
const canBecomeComplete = (current: StepState) => current === 'pending';
```

Reducer behavior:

- Missing entity is treated as `not_available`.
- `stepPending` inserts or updates to `pending` only from `not_available`.
- `stepCompleted` updates to `complete` only from `pending`.
- `stepsRestored` replaces cache from durable trailer restoration.
- `stepReset` sets `not_available` from any current state.
- Invalid reverse/skipping transitions leave state unchanged; the effect boundary logs the attempted invalid transition.

**Rationale**:

- The renderer should not expose git-trailer words (`pass`, `fail`, `skipped`) as UI state.
- `complete` is terminal during a session except Escape Hatch.
- Reducer no-ops for invalid transitions preserve Redux purity; logging belongs in listeners/hooks.

**Testing**:

- First test: empty slice -> `not_available`, then `pending`, then `complete`, with unrelated slices unchanged.
- Direct `not_available -> complete` rejection.
- `complete -> pending` rejection.
- `stepReset` resets `pending` and `complete` to `not_available`.

## 6. `.specify/extensions.yml` lifecycle hook registration shape

**Decision**: Register twelve lifecycle keys under the existing `hooks:` map. Each key gets a Concierge entry using the same list-entry shape already present in `.specify/extensions.yml`: `extension`, `command`, `enabled`, `optional`, `prompt`, `description`, and `condition`. The key name supplies the hook identity; the command points to the single dispatcher.

**Required keys**:

```yaml
before_specify:
after_specify:
before_clarify:
after_clarify:
before_plan:
after_plan:
before_tasks:
after_tasks:
before_analyze:
after_analyze:
before_review:
after_review:
```

**Concierge entry shape**:

```yaml
- extension: concierge
  command: concierge.stepLifecycle.dispatch
  enabled: true
  optional: false
  prompt: Execute Concierge <hook> lifecycle hook?
  description: <hook-specific lifecycle description>
  condition: null
```

**Rationale**:

- This preserves the existing extension file structure and hook evaluation rules used by Step Agents.
- The single dispatcher avoids divergent command entry points.
- Keeping existing extension entries avoids regressing git/spec-validate/concierge-jira hooks.

**Testing**:

- Assert all twelve keys exist.
- Assert each key has an enabled non-optional Concierge dispatcher entry.
- Assert existing hook entries are preserved.
- Assert unknown hook names are rejected by `dispatcher.ts`.

## 7. Agent-file frontmatter parsing for drift verifier

**Decision**: Add `src/main/hooks/driftVerifier.ts` with a small no-dependency parser that reads installed `.github/agents/speckit.*.agent.md` files, parses frontmatter and a designated output section, extracts declared output filenames, compares them against `STEP_ARTIFACT_MANIFEST`, and logs/records `agent-manifest-drift` as warn-not-fail.

**Parsing rules**:

- If a file starts with `---`, parse until the next `---` as frontmatter.
- Recognize simple `key: value`, YAML list lines under known keys, and nested list item blocks used by existing agent files.
- Prefer explicit declared output metadata when present.
- Fall back to a designated markdown section with output filenames if frontmatter does not declare outputs.
- Ignore chat chrome and command instructions that mention filenames outside the declaration section.

**Rationale**:

- No YAML parser can be added because FR-036 forbids new runtime dependencies and ADR-0002 forbids schema libraries by habit.
- Drift verification is a warning system, not a build gate. Conservative parsing should avoid false hard failures.
- Existing Step Agent frontmatter already uses a simple enough subset for hand parsing.

**Testing**:

- Frontmatter-only fixture.
- Designated-section fixture.
- Drift fixture logs `agent-manifest-drift` and records activity.
- Matching fixture produces no warning.
- Malformed agent file does not block startup; it emits a warn-level drift/parser warning.

## 8. Pino logging test discipline

**Decision**: Hook and handler logging tests mock `createMainLogger` from `src/main/logging.ts` and assert pino calls through the real logger creation seam. Tests must not pass duck-typed `{ info, warn, error }` shapes for new hook/handler logging behavior unless testing a pure helper that explicitly accepts a narrowed logger interface.

**Rationale**:

- The project logger owns path, stream, base fields, and redaction.
- Mocking the creation seam catches accidental bypasses and preserves Run 4 discipline.

**Testing**:

- Mock `createMainLogger`.
- Assert event names and fields: `event`, `step`, `sessionId`, optional `latencyMs`, optional `reason`, optional `trailer`.
- Assert no PII fields are included.

## 9. Runtime dependency posture

**Decision**: Run 5 adds zero runtime dependencies.

**Rationale**:

- All required primitives already exist: git shell-out, filesystem helpers, pino, RTK listener middleware, RTK Query, React Redux, ACP SDK, Vitest.
- YAML/frontmatter parsing can be hand-written for the narrow agent-file subset.
- Git trailer handling uses the installed `git` binary rather than an npm library.

**Verification**:

- `package.json` dependency diff has no runtime additions.
- Boundary grep proves no `simple-git`, `nodegit`, or schema library was introduced.
