# ADR-0016: Worktree-per-session isolation

**Status:** Accepted (2026-06-01)

## Context

The Concierge app drives spec-kit, which creates one feature branch per
`/speckit.specify` run via its mandatory `before_specify` git hook
(`speckit.git.feature` → `create-new-feature.sh` → `git checkout -b
NNN-slug`) **in a single shared working directory** (the cloned repo at
`<documents>/Concierge/<owner>/<repo>`).

Live dogfooding (the app building itself) exposed that the shared working
directory is actively unsafe once a session has uncommitted work:

- `git checkout <branch>` to inspect or switch sessions carries
  uncommitted files across branches (smearing) or blocks.
- Start-new's `resetToCleanMain` runs `git reset --hard` + `git clean -fd`,
  which destroys any other session's uncommitted work in the shared tree.
- Resume of a "dirty" (uncommitted) session is unsafe for the same reason.
- `listBranchSessions` checks out each branch to read its state — the
  inspection itself can smear.

This is the same failure class as the documented parallel-codex
working-dir collision (`docs/session-audit-2026-05-31.md`): concurrent
work in one tree corrupts branches and deletes untracked files.

ROADMAP_DECISIONS.md originally deferred worktrees to post-v1. That
decision was **amended 2026-06-01** to pull worktree isolation into scope,
because the shared-dir model is not merely limited but data-loss-prone for
the core resume/dirty-session feature.

Investigation (local + community, 2026-06-01) established:

- spec-kit has **no native worktree support**. The official worktree PR
  (#1547) was closed unmerged; the only community extension is a 2-commit
  toy that acts *after* specify (does not prevent during-run smearing).
- The branch-name-chosen-mid-run problem is solvable with machinery the
  installed git extension already ships: `create-new-feature.sh` supports
  `--dry-run` (compute the `NNN-slug` name with no side effects) and a
  `GIT_BRANCH_NAME` env override (force an exact branch name, bypassing
  generation). So the app can know/decide the branch name *before* the run.
- The industry pattern (Claude Code, Worktrunk, etc.) is: the host
  pre-creates the worktree + branch, then the agent works inside it via
  `--cwd`.

## Decision

Each Concierge session gets its own **git worktree** — an isolated working
directory backed by the same shared object store as the clone. The clone
stays the control center (on the default branch); sessions never share a
working tree.

Session tuple becomes `(workspace, worktree, branch, CLI, model)`.

### Lifecycle

1. **Start new session:** the app decides the branch name up front
   (compute via `create-new-feature.sh --dry-run --json`, or allocate
   centrally), then `git worktree add <worktreeDir> -b <branchName> <base>`
   where `base` is the up-to-date default branch (`origin/<default>` after
   fetch). spec-kit's specify agent runs with `--cwd <worktreeDir>` and
   `GIT_BRANCH_NAME=<branchName>` so its `before_specify` hook reuses the
   pre-created branch instead of making a second one.
2. **Resume a session:** the session's worktree already exists with its
   exact state (committed + any uncommitted work) preserved. Resume points
   the app's active cwd at that worktree and restores step-state from the
   branch's `Concierge-Step` trailers + working-tree artifacts. No checkout,
   no smear risk.
3. **List sessions:** enumerate worktrees (and their branches) and read each
   one's state **in place** — never checkout-shuffle a shared tree.

### Worktree home

Worktrees live in a per-repo, app-managed location, gitignored and outside
the user's editing path. Default: `<clone>/.worktrees/<sessionId>/` (matches
the community/Claude-Code inside-repo convention; must be gitignored) OR a
central `<userData>/worktrees/<repo>/<sessionId>/`. Implementation picks one
and documents it; the key invariant is that worktrees are app-owned and
isolated, not the user's clone root.

### Concurrency / numbering

The `NNN` sequential prefix is computed at run time from branches + remote
+ `specs/` dirs, so concurrent sessions can collide on a number. Mitigate by
either pre-allocating the branch name centrally in the app (then forcing via
`GIT_BRANCH_NAME`) or using timestamp branch numbering. The app owns name
allocation; spec-kit is told the name, it does not choose it.

### Cleanup / safety

- `git worktree remove` when a session is explicitly discarded; never
  auto-delete a branch with uncommitted or unpushed work without
  confirmation.
- Removing a worktree must not touch sibling worktrees or the clone.

## Rationale

- Isolation is mandatory, not optional: the shared-dir model loses
  uncommitted and untracked work, which is exactly the dirty/in-progress
  resume state the product depends on.
- Building the layer ourselves (vs. spec-kit / the dead PR / the toy
  extension) is the only viable path — verified no upstream support exists.
- `GIT_BRANCH_NAME` + `--dry-run` make branch naming deterministic, removing
  the only hard part (the agent naming the branch mid-run).
- Shared object store keeps worktrees cheap (no re-clone, no duplicate
  history).

## Consequences

- A new app-owned worktree manager handles create/list/resume/remove,
  keyed by sessionId, with branch-name pre-allocation.
- `resetToCleanMain` (destructive shared-dir reset) is replaced by
  fresh-worktree creation for start-new; the destructive `clean -fd` path
  is removed from the multi-session flow.
- `listBranchSessions` reads worktrees in place instead of checking out
  each branch in the shared tree.
- spec-kit invocations gain `--cwd <worktree>` + `GIT_BRANCH_NAME`.
- Untracked local config (if any session needs it) requires an explicit
  propagation step into new worktrees (a `.worktreeinclude`-style copy).
- The session tuple and any persisted session metadata gain a `worktree`
  (path) field.

## References

- `ROADMAP_DECISIONS.md` — Worktree Isolation (amended 2026-06-01, pulled into scope)
- `.specify/extensions/git/scripts/bash/create-new-feature.sh` — `--dry-run` (compute name), `GIT_BRANCH_NAME` override (lines 305-307), `git checkout -b` (line ~383)
- `.specify/extensions/git/commands/speckit.git.feature.md` — `GIT_BRANCH_NAME` documented; "branch creation only"
- `.specify/extensions.yml` — `before_specify` → `speckit.git.feature` mandatory hook
- `docs/session-audit-2026-05-31.md` — parallel-codex working-dir collision (the same failure class)
- spec-kit worktree PR #1547 (closed unmerged); community `spec-kit-worktree` (2-commit, post-specify only)
- Claude Code worktrees, Worktrunk — host-pre-creates-worktree industry pattern
