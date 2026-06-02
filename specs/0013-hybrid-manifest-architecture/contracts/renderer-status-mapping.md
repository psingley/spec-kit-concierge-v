# Contract: Renderer Status and Audit Mapping

Renderer state is derived from reconciliation results. It is never an authority for completion, recovery, or nudge eligibility.

## Status mapping

| Reconciliation status | Renderer step state | UI affordance |
|-----------------------|---------------------|---------------|
| `pending` | `pending` | waiting or ready to run |
| `running` | `pending` with activity metadata | progress visible, nudge hidden |
| `pass` | `complete` | completion shown only after manifest, trailer, and artifact agreement |
| `failed` | `not_available` with failure detail | failed marker and audit trail visible |
| `killed` | `not_available` with interruption detail | failed marker and audit trail visible |
| `interrupted` | `not_available` with interruption detail | failed marker and audit trail visible |
| `terminal-stuck` | `not_available` with terminal-stuck detail | nudge visible only when `canNudge` is true |

## Audit trail endpoint

The manifest API exposes a bounded audit view derived from manifest audit records, anomalies, interventions, doctor invocations, failed markers, and nudge requests.

Rules:

- The endpoint validates all bridge payloads through factories.
- The renderer receives bounded records with event type, step, timestamp, summary, and evidence references.
- Raw transcripts, secrets, unrelated file contents, and unbounded logs are never returned.
- Failed, remediated, and nudged sessions must surface the audit trail within the SC-007 30-second inspection target.

## Listener rules

- Listener middleware updates session and steps slices from reconciliation and audit responses.
- Listener middleware does not infer completion from UI events, terminal prose, or cache state.
- Cache invalidation follows manifest, reconcile, doctor-status, nudge, and audit-trail mutations.
