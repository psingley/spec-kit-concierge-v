# Iteration Q: repo-browse-empty-search proposed fix

## Baseline

`repo-browse-empty-search` has 1 failure:

- Missing style sample `repo browser empty state`

Pixel residual is already below threshold at 1.34%.

## Source comparison

The shipped app exposes the repo browser root as `.repo-browser`, and the shipped style sample is found.

The design bundle for `repo-browse.jsx` uses `.rb-stage` as the root wrapper, not `.repo-browser`, so the design-side style sample is missing even though the rendered screen is visually aligned.

## Fix

Update the visual-diff style snapshot harness to resolve design selector `.repo-browser` to `.rb-stage` when the design bundle lacks `.repo-browser`.

This keeps the contract intact, does not loosen required items, and avoids editing the design bundle JSX/CSS for anything other than selector-hook comments.
