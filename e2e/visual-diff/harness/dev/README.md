# Visual Diff Dev Loop

`npm run vd:dev -- <screen>` is an opt-in warm-loop accelerator for single-screen visual-diff work.

It preserves the gold-standard `vd:loop`, `vd:capture`, `vd:diff`, and `vd:report` scripts. Use `vd:dev` for inner-loop adjustments, then finish each accepted iteration with `npm run vd:loop` and the standard verify chain.

The dev loop:

- builds Electron only when `.vite/build/main.js` is stale or missing
- starts one design HTTP server, one Chromium browser, and one Electron app inside the script session
- hashes `design/v3-fetch/project/**`, the selected contract, `screens.config.ts`, and capture helpers
- skips design capture when that SHA-256 cache key is unchanged
- captures shipped output fresh every run
- times each capture step out after 90 seconds and restarts Electron before retrying a shipped capture once

Use `npm run vd:dev -- --reset-cache` to clear `e2e/visual-diff/artifacts/dev-cache/`.
