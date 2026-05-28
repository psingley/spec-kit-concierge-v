# Proposed Fix - workspace-titlebar-repo-dropdown-open

## Observed Gap

The shipped repository dropdown still shows two utility actions (`Open repository browser`, `Refresh repositories`). The design dropdown is a repo picker with recent repos, age metadata, branch-count pills, an `All repos` group, and the full repo list.

## Fix Plan

- Replace the repository menu body in `Titlebar.tsx` with deterministic repo rows matching the design contract.
- Preserve menu semantics with `role="menu"` and `role="menuitem"` buttons, and set stable accessible names for contract-required composite controls.
- Reuse the existing titlebar menu shell while adding repo-menu row/pill/meta styling to match the design.
- Add/adjust focused titlebar coverage for the repo dropdown contents.
- Normalize the shipped menu shadow only if the style drift is the same token-equivalent mismatch already accepted elsewhere.
