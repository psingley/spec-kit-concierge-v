# App-Managed Repository Clones

The Concierge App clones repositories into `{userData}/repos/{owner}/{name}` (e.g. `C:\Users\jneed\AppData\Roaming\spec-kit-concierge-v\repos\collette-travel\kitten-contenders`). These clones exist solely for the app — they are not shared with the user's normal development workflow, IDE, or other tools. This lets the app own git configuration, credential handling, and branch lifecycle without interfering with or depending on the user's global git setup.

## Considered Options

1. **Use existing local clones** — require the user to point at a pre-existing checkout. Rejected because it couples the app to the user's git config, risks conflicts with uncommitted work in their working tree, and creates a dependency on the user having already cloned the repo.

2. **User-visible location (e.g. `~/concierge-repos/`)** — rejected because these repos are not for human editing. Putting them in `userData` makes their "app internal" status clear and avoids polluting the user's visible filesystem.

3. **Full clone** — rejected because the app creates its own `spec/draft-*` branches from HEAD and never traverses deep history. Shallow (`--depth=1`) is faster and uses less disk.

## Key Decisions

- **Shallow clone (`--depth=1`)** on first session against a repo. Subsequent sessions skip the clone and do `git fetch origin` + `git checkout {defaultBranch}`.
- **Clone triggered lazily** — only on "Start New Session", not at repo selection or app startup.
- **Clone and push via `gh` CLI** — `gh repo clone {owner}/{repo} -- --depth=1` for cloning, `gh` credential handling for pushes. No manual credential helper configuration needed since `gh` is already authenticated at sign-in time.
- **Auto-push** — the draft branch is pushed immediately after creation; Step Commits are pushed after each commit. The app owns these branches and there are no conflict risks.
- **Path resolution at the IPC boundary** — the renderer works with GitHub identifiers (`owner/repo`); the main-process IPC handler resolves to the local absolute path (`{userData}/repos/{owner}/{repo}`) before invoking git.

## Consequences

- The app needs a "clone in progress" UX state (inline spinner, disabled button).
- Git IPC handlers gain a path-resolver dependency that maps `owner/repo` → local absolute path.
- Disk usage grows with each unique repo cloned (shallow clones are small, but not zero).
- Uninstalling the app leaves orphaned repos in `userData` unless the uninstaller cleans them up.
