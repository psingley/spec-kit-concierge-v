# ADR-0017: Hybrid manifest print-mode step execution

**Status:** Accepted (2026-06-02)

## Context

Run 13 implements the Hybrid Manifest Architecture on the dogfood branch
`build/manifest-architecture-dogfood` while `.specify/feature.json` points at
`specs/0013-hybrid-manifest-architecture`. The normal Spec Kit branch rule
requires numbered feature branches, but this run has a constitution-approved
dogfood exception so the app can build the recovery architecture in place.

Run 13 also replaces ACP as the passive step-agent execution transport. ACP
remains the default Bound CLI integration posture, but step execution needs the
typed Copilot print-mode contract so the facilitator can capture deterministic
spawn recipes, assistant identities, terminal results, and log checksums before
returning to reconciliation.

## Decision

For Run 13 step execution only, Concierge invokes step agents through:

```bash
copilot -p --agent speckit.<step> --output-format json --session-id <uuid> --log-dir <dir>
```

This exception is not a general non-ACP Bound CLI expansion. The print-mode
adapter must live under `src/main/data-layer/agents/`; IPC handlers may validate
and orchestrate but must not spawn coding-agent binaries directly.

The implementation branch exception is equally narrow:
`.specify/scripts/bash/check-prerequisites.sh` may accept
`build/manifest-architecture-dogfood` only when `.specify/feature.json` resolves
to `specs/0013-hybrid-manifest-architecture`. Other branches keep the numbered
feature-branch validation rule.

## Authority boundaries

Deterministic app code remains the only writer of manifest state, step
commits/trailers, failed markers, guarded mutations, and completion status.
Step-agent output, doctor recommendations, renderer memory, and transcript
prose are never authoritative.

Completion is displayed only after reconciliation agrees across:

1. `.concierge/session-manifest.json` attempt state.
2. Branch history containing valid `Concierge-Step: <step>:pass` evidence.
3. Step-owned artifact snapshots.
4. Dirty-diff gates and failed-marker evidence.

## Recovery and doctor constraints

Deterministic guarded recovery runs before doctor escalation and is limited to
the safe recovery catalog: relocate a step-owned artifact, adopt valid
completion, refresh a failed marker, revert a proven unrelated file, cancel an
observed active step, and restart with pinned context only after explicit user
confirmation or an approved guarded doctor request.

Recovery must audit, return to reconciliation, and never silently re-run a step,
mark completion directly, or write completion trailers outside hook ownership.
The doctor is a bounded anomaly intermediary with exactly six read-only tools and
six guarded mutating tools; every mutating tool re-reads disk truth, validates
preconditions, appends audit records, and returns to reconciliation.

## Verification rule

Run 13 implementation uses vertical TDD tracer bullets. Each RED task records
visible failing output before its paired GREEN implementation begins, then
targeted GREEN output proves the behavior. Full validation includes
`npm run test:coverage` plus the existing typecheck, lint, unit, and E2E gates
when the relevant story surfaces exist.

## Consequences

- Step execution moves away from ACP only for this Run 13 path.
- Bound CLI ACP modules remain valid for non-step integrations.
- Renderer session and step state are projections of reconciliation and audit
  responses, not completion authority.
- Nudge appears only for terminal-stuck sessions after deterministic recovery
  and doctor paths fail or are unavailable.
- Failed, remediated, and nudged sessions expose bounded audit inspection
  without raw transcripts, secrets, or unrelated file contents.

## References

- `specs/0013-hybrid-manifest-architecture/plan.md`
- `specs/0013-hybrid-manifest-architecture/tasks.md`
- `specs/0013-hybrid-manifest-architecture/contracts/facilitator-nudge.md`
- `specs/0013-hybrid-manifest-architecture/contracts/reconciliation.md`
- `.specify/memory/constitution.md`
