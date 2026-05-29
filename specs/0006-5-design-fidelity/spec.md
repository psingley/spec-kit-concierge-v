# Run 6.5 Design Fidelity Pass

## Summary

Run 6.5 ports the fetched `design/v3-fetch/project/` chrome into the shipped renderer without changing the constitutional state model. The pass establishes a teal-adapted token system, expands the local icon library, restyles the Run 6 surfaces, and adds test-first behavior for scroll gating, titlebar dropdown closure, and PixelC spinner loop stability.

## Implemented Scope

- Replaced the 80-line renderer stylesheet with a 772-line token and surface system using the locked teal values `--accent: #3a7e9a` and `--accent-dim: #132f3b`.
- Added the `/* CONTRAST RULE */` token comment and introduced `--accent-text` for foreground text/icon usage.
- Ported the design icon set into `src/renderer/components/Icons.tsx` while preserving the `Ico.*` API shape.
- Restyled AppShell/workspace chrome through shared CSS, Titlebar chips/dropdowns, Stepper orb rail, SignInScreen, dense RepoBrowseScreen, SpecifyStep, Activity, ActivityPill, CustomizeModal, AboutModal, RequestModal stub, and Markdown CSS.
- Added component-local `useClickOutside` behavior for Titlebar dropdowns with outside-click close, Escape close, and Tab focus cycling inside the open menu.
- Added real Specify complete-state scroll progress and gated Continue behavior when `requireScroll` is enabled.
- Fixed `PixelCSpinner` so speed, pixelation, cell, color, and size prop changes update refs without restarting the animation loop.
- Injected `package.json` version and `git rev-parse --short HEAD` into the renderer build via Vite define constants. No `LICENSE` file is present, so license displays as `Internal`.

## Deviations From Design

- Step order intentionally remains `specify`, `clarify`, `plan`, `tasks`, `analyze`, `review`. The fetched design prototype swaps Tasks and Analyze, but constitution v1.0.4 and `ROADMAP_DECISIONS.md` govern the shipped order.
- CustomizeModal shows one read-only teal swatch only. Multi-theme selection remains deferred.
- CustomizeModal no longer exposes `left` activity placement in the UI. The internal union still permits `left` pending Run 7 cleanup.
- RequestModal is a styled stub only. Full request flow remains deferred to Run 12.
- Markdown remains the existing hand-rolled renderer with CSS-only restyling. Engine replacement remains deferred to Run 8.

## Tests Added

- `src/renderer/components/SpecifyStep.test.tsx`: scroll gate locked/unlocked behavior.
- `src/renderer/components/Titlebar.test.tsx`: outside-click close, Escape close, and focus cycling inside an open menu.
- `src/renderer/components/PixelCSpinner.test.tsx`: regression test proving the drawing loop survives a `speed` prop change.
- `e2e/design-fidelity.spec.ts`: deterministic Electron screenshot and axe coverage for full-window states, per-surface states, and motion/reduced-motion variants.

## Verification Status

- `npm run typecheck`: passing.
- `npm run lint`: passing.
- `npm test`: passing, 777 tests.
- `npm run e2e`: build steps pass, but Electron aborts at launch with `SIGABRT` before app code runs. The pre-existing smoke and vertical e2e tests fail with the same launch error in this environment.
