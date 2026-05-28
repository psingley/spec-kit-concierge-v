# Iteration C Proposed Fix: signin-all-ok

## Baseline

- Screen: `signin-all-ok`
- Baseline harness result: FAIL
- Priority score: 100
- Pixel residual: 4.17%
- Failure count: 39

## Diagnosis

The design transitions to the authenticated repo-picker after all three auth providers are connected. The shipped app does transition, but the repo-picker is still the older hero-card/list implementation and it renders outside the titlebar shell. That misses the design titlebar text/controls, the `brand-orb` marker, the repo list copy, recent-session counts, and the `.repo-card` style sample.

## Fix Plan

- Render the repo browser inside the same titlebar shell used by workspace screens.
- Rebuild `RepoBrowseScreen` toward the design `rb-stage` / `rb-card` / `rb-repo` structure while keeping real buttons and the existing search behavior.
- Expand the Run 6 visual/e2e repository fixture to include the design repo set.
- Add a renderer unit test first for the repo-picker copy, titlebar shell expectation, and button names required by the visual contract.

## Regression Risk

The main risk is the existing e2e path that picks the first repo and starts a session. The first repo remains `concierge-api`, and the button remains discoverable by role/name, so the existing setup should continue to navigate.
