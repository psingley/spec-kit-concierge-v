# Contract: Localhost HTTP API Parity

The HTTP API exposes the same manifest and nudge actions available in the UI. HTTP handlers dispatch through the same validated main IPC/data-layer path as renderer actions; they do not create an alternate authority path.

## Common rules

- Versioned path prefix: `/v1/session-manifest`.
- Every request and response is factory-validated.
- Authentication uses the existing per-launch localhost token mechanism.
- Handlers re-read durable disk/git truth before returning a state-changing result.
- Responses include bounded audit summaries, never raw tokens or unrelated file contents.

## Endpoints

### `GET /v1/session-manifest`

Returns the reconciled manifest view for the active session, including derived renderer status projection and bounded audit summary.

### `POST /v1/session-manifest/reconcile`

Runs reconciliation for the active session and returns the same reconciled view exposed to the renderer.

### `GET /v1/session-manifest/audit`

Returns the bounded audit-trail inspection view for failed, remediated, and nudged sessions. The endpoint must satisfy SC-007 by returning the bounded user-visible audit view within 30 seconds.

### `GET /v1/session-manifest/doctor-status`

Returns doctor availability, per-step attempt budget, exhaustion state, and escalation reason without exposing raw prompt or transcript secrets.

### `POST /v1/session-manifest/nudge`

Requests `reconcileBranchToIntendedShape` for a terminal-stuck session. The handler rejects healthy, running, auto-recoverable, stale-branch, or ambiguous-precondition sessions before mutation.

## Contract tests

HTTP contract tests must prove:

- each endpoint uses the same factories as the IPC/preload/renderer bridge;
- failed authentication is rejected before disk reads;
- stale branch or feature context rejects state-changing requests;
- nudge mutations append audit records and re-run reconciliation before response;
- external-agent calls update the GUI through the same derived state path as a human click.
