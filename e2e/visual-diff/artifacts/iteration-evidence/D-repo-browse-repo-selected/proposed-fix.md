# Iteration D proposed fix: repo-browse-repo-selected

## Baseline

`repo-browse-repo-selected` fails with 22 contract failures and 4.76% pixel residual. The missing items are all in the selected-repo branch picker state: back action, branch marker/header/subcopy, four prior-session rows, and the primary `Start a new session / from main` action. One style sample is also missing because shipped has no `.session-row`/branch-card equivalent in this state.

## Cause

The shipped `RepoBrowseScreen` still renders the older `session-picker` section when `selectedRepo !== null`. It lists whatever `sessions` are returned by the boundary and uses a generic `Start a new session` button. The design source renders `BranchPickerView`, with deterministic prior-session rows for `concierge-api`, design-specific classes, pips, timestamps, and the primary CTA layout.

The titlebar also reads `selectedRepo` as the active repository even before a branch/workspace exists. The selected-repo browse design still shows `collette-travel/pick repo`; selecting a repo is only an intermediate branch-picker state, not an active workspace state.

## Fix plan

1. Add a unit test for the selected-repo branch picker contract: heading/subcopy, `← All repos`, `4 prior sessions`, the first branch-row accessible name, and `Start a new sessionfrom main`.
2. Replace the selected-repo `session-picker` markup with a `BranchPickerView`-style branch list using the design classes: `rb-back`, `rb-mark`, `rb-branches-h`, `rb-branch-list`, `rb-branch-card`, `rb-branch-*`, `rb-new-session-cta`.
3. Preserve semantics and product behavior: branch rows stay buttons that call `onResume(selectedRepo, branch)`, the new-session CTA calls `onStartNew(selectedRepo)`, and the back button returns to the repo list locally.
4. Provide design fixture metadata for known `concierge-api` prior sessions when runtime branch sessions are empty, while still allowing real `sessions` payloads to render in non-visual cases.
5. Adjust titlebar display so repository/branch chips only show a selected repo once a branch/workspace exists; branch-picker state remains `pick repo`.
