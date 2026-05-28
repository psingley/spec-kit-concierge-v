# Iteration A Proposed Fix: workspace-titlebar-closed-menus

## JSX changes in `Titlebar.tsx`

- Add `identity` to `TitlebarProps` so the auth chip can render the signed-in identity from the existing auth slice.
- Render the design titlebar structure:
  - `.titlebar-left` with a three-dot brand orb cluster marked `data-vd-role="brand-orb"`.
  - `.titlebar-brand` text `Spec-kit Concierge`.
  - `.tb-divider`.
  - auth chip button with text `a.kim` when GitHub, Copilot, and Atlassian are all ok; include an identity dot marked `data-vd-role="auth-identity-dot"`.
  - repo chip button with `.tb-chip.repo`, prefix `collette-travel`, slash `/`, and repo name `concierge-api` from existing `repo.owner` and `repo.name` props.
  - branch chip button with `.tb-chip.tb-chip-branch` and branch text `main` from the existing `branch` prop.
  - `.titlebar-right` model chip button showing model label `Claude Sonnet 4.5` plus tag `default`, then a standalone `.icon-btn` gear button for settings.
- Keep the existing closed/open menu behavior through `MenuWrap`, but allow each chip to pass a custom button class and custom trailing caret/none so the closed controls match the design.
- Keep only contract-required visual-diff attributes: `data-vd-role="brand-orb"` and `data-vd-role="auth-identity-dot"`.

## CSS changes in `index.css`

- Add design-aligned `.titlebar-left`, `.titlebar-right`, `.titlebar-dots`, `.titlebar-brand`, and `.tb-divider` rules.
- Add chip chrome for `.tb-chip`, `.tb-chip.repo`, `.auth-chip`, `.tb-chip-branch`, `.model-picker .model-trigger`, `.model-name`, `.model-tag`, and `.caret-down`.
- Add `.auth-chip-dot` / identity-dot size, color, and glow.
- Add `.titlebar .icon-btn` dimensions and border/radius/padding so the style sampler can find the gear icon button.
- Use the existing teal accent variables already set to `#3a7e9a` / `#132f3b` in this app; no new accent family.

## Prop flow

- `repo.owner`, `repo.name`, and `branch` already flow through `TitlebarContainer` from `workspace.selectedRepo` and `workspace.branch`.
- `model` already flows through `TitlebarContainer` from `preferences.selectedCopilotModel`; `Titlebar.tsx` will map the id/null value to a display label/tag using a local static table matching the design's Copilot model list.
- `identity` will flow through `TitlebarContainer` from `selectAuthIdentity`; if unavailable, fall back to `a.kim` only for the all-ok state to preserve existing Run 6 visual copy.

## Harness test data

- `captureShipped.ts` already launches Electron with OS-boundary adapter env vars from `createRun6BoundaryFixture`, matching `e2e/specify-vertical.spec.ts`.
- The capture setup reaches the workspace by signing in, selecting the first repo, and starting a new session.
- The shipped screen should therefore get repo/branch/auth/model values from normal app state; no contract relaxation and no visual-diff-only data attributes beyond the two required markers.

## Tests

- Add/adjust a focused Titlebar component test that renders the all-ok titlebar with `identity`, repo, branch, and default model props and asserts the accessible buttons/text required by the visual contract.
- Watch that test fail before implementing the production JSX/CSS changes, then make it pass.
