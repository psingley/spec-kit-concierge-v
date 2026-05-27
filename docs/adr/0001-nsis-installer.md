# ADR-0001: Use NSIS for the Windows installer

**Status:** Accepted

## Context

Run 1 needs a Windows installer contract that is hard to reverse later. Auto-update is deferred, so the installer choice is about install shape and enterprise compatibility, not update machinery.

## Decision

Use Electron Forge’s NSIS maker for Windows packaging.

## Rationale

NSIS fits the run’s deferred-update posture and plays better with corporate Windows environments than Squirrel. It gives us a predictable installer surface without committing to an update stack we are not ready to own yet.

## Consequences

- Windows packaging is explicit from Run 1.
- Auto-update remains a later decision.
- Reversing this choice later means changing the shipped install contract.

## References

- `specs/0001-foundation-shell/grill.md` — Q1
- `ROADMAP_DECISIONS.md` — Run 1 packaging posture
