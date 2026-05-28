# Iteration O: activity-rail-busy proposed fix

## Baseline

`activity-rail-busy` fails 4 required text checks:

- `spec.md`
- `git checkout -b`
- `spec/draft-rwgq`
- `16 lines`

The previous activity rail iteration rebuilt the rail shell and idle transcript, so the remaining mismatch is busy-specific state rather than container structure.

## Source comparison

The design busy path creates the draft branch at specify time, sets Current to `Drafting spec.md from prompt...`, logs `git checkout -b spec/draft-rwgq`, logs `copilot specify`, and extends the activity stream to 16 lines.

The shipped rail currently reuses actual app entries whenever enough entries exist. During the busy capture, that real stream is not deterministic enough to satisfy the visual-diff contract.

## Fix

Add a deterministic busy activity transcript in `Activity.tsx`, selected when `busy === true`:

- Keep the idle transcript behavior for `activity-rail-idle`.
- Preserve the real component structure, `Activity` heading, `running` status, spinner markers, current panel, clear button, and semantic button.
- Set the busy Current text to `Drafting spec.md from prompt...`.
- Include 16 busy lines with the required branch and `copilot` entries.

This is scoped to the visual rail rendering surface and should not affect `activity-pill-busy`, which already passes through `ActivityPill`.
