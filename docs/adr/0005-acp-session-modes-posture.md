# ADR-0005: Default ACP sessions to Agent mode and keep Autopilot opt-in

**Status:** Accepted

## Context

The verified Copilot CLI 1.0.54 ACP `session/new` response advertises three session modes:

- `https://agentclientprotocol.com/protocol/session-modes#agent`
- `https://agentclientprotocol.com/protocol/session-modes#plan`
- `https://agentclientprotocol.com/protocol/session-modes#autopilot`

Autopilot changes the human-in-the-loop posture because it enables allow-all style autonomous execution. The grill recorded the user decision `allow`, so Autopilot is permitted but must not become the default.

## Decision

Default v1 ACP sessions to Agent mode.

Support all three verified modes: Agent, Plan, and Autopilot. Autopilot is opt-in only, and the user's `allow` decision must be recorded when selected. Run 3 supports mode selection at session startup; broader renderer settings and warning UI are deferred.

## Rationale

Agent mode matches Concierge's default conversational Step Agent posture. Plan mode is a valid ACP capability but overlaps with planning workflows and should be explicitly selected. Autopilot is useful and explicitly allowed by the user, but it carries higher autonomy risk and must require explicit opt-in.

Autopilot does not bypass top-level cancellation. Future renderer cancel confirmation still applies.

## Consequences

- Mode constants must use full ACP URIs, not short names.
- Session creation defaults to Agent when no mode is provided.
- Autopilot selection must preserve evidence of user opt-in.
- Product UI for warnings and switching modes remains out of Run 3 scope.

## References

- `specs/0003-acp-adapter/grill.md` - Q7
- `specs/0003-acp-adapter/spec.md` - FR-011, SC-008
- `tests/fixtures/acp-transcripts/copilot-1.0.54-session-new-full.jsonl`
