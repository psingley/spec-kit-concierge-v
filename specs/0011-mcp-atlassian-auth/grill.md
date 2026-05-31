# Collaborative Grill - Run 11 MCP Config Detection & Atlassian Auth

Captured: 2026-05-31

Branch observed: `spec/0011-mcp-atlassian-auth` at `2bfb7047e312816a3003840fe8ebfc8d0feda4bd`.

Prompt expected branch off main HEAD `950094d`; live repo HEAD did not match. Pre-existing dirty files were present under `e2e/artifacts/run6-manual-trace/` plus untracked `specs/0008-ai-passive-steps/fixtures/contract-honesty-audit.md`. This grill left those untouched.

## S1 - Run 11 Scope Distilled

Run 11 is the external-prerequisite run that makes the Atlassian MCP prerequisite real enough for Run 12 JIRA submission, without building JIRA submission itself. Roadmap lines 121-126 define the run as: an `mcp-config` data-layer module, `mcpConfigChecker` listener, Atlassian auth via browser/localhost as originally assumed, and auth-chip third-prerequisite UI.

The verified-now correction is important: "Atlassian OAuth via system browser to localhost callback" should not mean Concierge owns Atlassian OAuth tokens. Atlassian and Copilot evidence show the MCP client initiates OAuth and Copilot stores MCP OAuth state. Run 11 should reframe Atlassian auth as "detect/configure Copilot's Atlassian MCP entry and surface Copilot-owned MCP auth readiness."

In scope:

- Main-process `src/main/data-layer/mcp-config/` module to read, parse, validate, and idempotently merge the required Copilot MCP entry.
- IPC boundary for `mcp:config:check` and `mcp:config:fix`, matching roadmap lines 352 and 404-409.
- Renderer RTK Query endpoint under the existing API inventory and auth slice, not a ninth slice.
- `mcpConfigChecker` listener on app launch and `workspace.repo` change.
- One-time activity entry when Concierge writes the missing Atlassian entry.
- Passive auth-chip/sign-in states for configured, missing, check failed, and Copilot/MCP auth pending.
- Visual contracts for real Atlassian states.

Explicitly out:

- Run 10 localhost HTTP API remains deferred/out of this run (roadmap lines 116-119).
- Run 12 JIRA submission outer loop remains out (roadmap lines 128-132).
- Multi-MCP plugin architecture is post-v1; v1 required set is Atlassian only (roadmap lines 517-531).
- Concierge speaking to Atlassian MCP, listing Atlassian tools, creating Jira issues, or storing Atlassian OAuth tokens is out under Principle X.

## S2 - Inheritance Audit

1. `mcp-config` data layer module

- Exists: no `src/main/data-layer/mcp-config/` module exists today.
- Delta: add a focused main-process effect module with pure parse/merge helpers. It must target Copilot CLI's real path `~/.copilot/mcp-config.json`, not the roadmap guess.

2. `mcpConfigChecker` listener

- Exists: roadmap inventory names it, but no implemented listener file exists for MCP config.
- Delta: listener should call `mcpConfigApi.check`, then `fix` only when missing. It should debounce repo changes enough to avoid duplicate writes during startup/session restore.

3. Atlassian auth

- Exists: `src/renderer/slices/auth.ts` has `atlassian: 'out'` and `atlassianLoginSucceeded()` only flips state to `ok`; `src/main/ipc/auth.ts` returns `{ provider: 'atlassian', label: 'Atlassian visual stub' }` after 200 ms.
- Delta: replace the fake success with status derived from Copilot MCP config/auth readiness. Recommended model: no Concierge OAuth callback server, no token payloads, no Atlassian credential store.

4. Auth IPC

- Exists: `auth:status`, `auth:gh:login`, `auth:copilot:login`, and `auth:atlassian:login` exist. Status factory only accepts `copilot | github`, and status response only has `copilotLoggedIn` and `githubLoggedIn`.
- Delta: either extend `auth:status` to include Atlassian readiness or keep Atlassian status in `mcp:config:check`. Avoid duplicating MCP truth in two IPC surfaces.

5. Auth chip / sign-in UI

- Exists: sign-in row and titlebar menu render Atlassian. Titlebar hard-codes "Atlassian visible, not required"; workspace gate is GitHub + Copilot only.
- Delta: represent real states: missing config, configured but not yet authorized, connected/usable by Copilot, and check failed. Copy should not call Atlassian "optional"; Run 6 memory says avoid that wording even if non-gating.

6. Visual contracts

- Exists: v3 design files show the row and titlebar chip shape, but they are mock actions.
- Delta: add state-specific contracts for passive warning and connected state while preserving current visual hierarchy.

GitHub/Copilot auth pattern to inherit:

- Main IPC validates payloads with factories, logs invocation, and delegates side effects to `src/main/data-layer/auth/cliAuth.ts`.
- GitHub and Copilot use shell boundaries: `gh auth login`, `copilot auth login`, and `auth status`.
- Test determinism comes from env adapter files (`CONCIERGE_TEST_GH_ADAPTER`, `CONCIERGE_TEST_COPILOT_ADAPTER`), not real browser automation in tests.
- Atlassian should mirror the boundary discipline, but the owned side effect is Copilot MCP config and Copilot-triggered auth, not direct Atlassian OAuth.

## S3 - Architectural Choice Points

1. Who owns Atlassian OAuth?

- A. Concierge implements OAuth 2.1 PKCE with localhost callback and stores tokens.
- B. Copilot CLI/MCP client owns OAuth after Concierge writes config.
- C. Concierge shells out to `copilot` to force an MCP connection/auth handshake.

Recommendation: B. It matches Principle X and the verified Copilot/Atlassian model. Override word: `OWN_OAUTH`.

2. Canonical Atlassian endpoint?

- A. `https://mcp.atlassian.com/v1/mcp/authv2`
- B. `https://mcp.atlassian.com/v1/mcp`
- C. legacy `https://mcp.atlassian.com/v1/sse`

Recommendation: A for new writes, B as legacy-compatible detection, C rejected because Atlassian says SSE support ends after 2026-06-30. Override word: `LEGACY_MCP`.

3. Server key?

- A. `atlassian`
- B. `atlassian-rovo-mcp`
- C. preserve any key whose URL matches Atlassian.

Recommendation: write `atlassian`; detect any existing server with an Atlassian URL as satisfying presence, then optionally warn if key differs. Override word: `STRICT_KEY`.

4. Config path?

- A. `~/.copilot/mcp-config.json`
- B. `~/Library/Application Support/github-copilot/mcp.json`
- C. ask Copilot dynamically each launch.

Recommendation: A, with platform expansion and `COPILOT_HOME` support if GitHub documents it for config dir. B is disproven locally. Override word: `APP_SUPPORT_PATH`.

5. Merge strategy?

- A. parse-modify-write preserving all existing entries.
- B. atomic rewrite of a canonical file.
- C. run `copilot mcp add` instead of editing JSON.

Recommendation: A with atomic temp-file rename after parse succeeds. C is useful for manual recovery but harder to make deterministic. Override word: `CLI_ADD`.

6. Malformed config?

- A. refuse write, surface passive warning, keep original file.
- B. back up malformed file and replace with canonical minimal config.
- C. attempt JSON repair.

Recommendation: A by default, with an explicit future repair affordance if needed. Silent replacement violates "preserve user-managed entries." Override word: `BACKUP_REPLACE`.

7. Existing `/v1/mcp` entry found?

- A. treat as present and leave unchanged.
- B. silently rewrite URL to `/authv2`.
- C. add second `atlassian` entry under another key.

Recommendation: A for v1 safety, plus report `legacyEndpoint: true` in check result. Do not churn user config unless missing. Override word: `UPGRADE_URL`.

8. Checker timing?

- A. app launch + every `workspace.repo` change.
- B. app launch only.
- C. before every passive step and before JIRA only.

Recommendation: A, as roadmap says, but coalesce duplicate launch/repo events and make writes idempotent. Override word: `LAUNCH_ONLY`.

9. What if write fails?

- A. passive auth-chip warning + activity error, no modal.
- B. blocking modal.
- C. silently ignore.

Recommendation: A. It is observable without turning MCP config into a user-driven repair workflow. Override word: `BLOCKING_MCP`.

10. Does Atlassian gate workspace entry?

- A. require GitHub + Copilot + Atlassian before repository selection.
- B. keep GitHub + Copilot as workspace gates; Atlassian gates only JIRA submission.
- C. no auth gates at all; lazy fail later.

Recommendation: B. Run 6 explicitly superseded all-three gating, and Run 11's verified model makes Atlassian a JIRA prerequisite rather than a Specify/Plan/Tasks/Analyze prerequisite. Override word: `THREE_GATE`.

11. Where does Atlassian token state live?

- A. Concierge keychain.
- B. Copilot CLI `~/.copilot/mcp-oauth-config/`.
- C. Atlassian browser session only.

Recommendation: B. Local evidence shows Copilot writes MCP OAuth metadata/tokens. Concierge should never read token values. Override word: `KEYCHAIN`.

12. How should status be checked?

- A. config presence only.
- B. config presence plus non-secret Copilot MCP status where available.
- C. attempt a live Atlassian MCP tool call.

Recommendation: B if `copilot mcp get/list` exposes enough non-secret status; otherwise A plus "authorization happens when Copilot connects." C is out for grill and likely out for Observer-Only. Override word: `LIVE_TOOLCALL`.

13. Which IPC surface owns this?

- A. `mcp:config:*` only.
- B. `auth:atlassian:*` only.
- C. `mcp:config:*` for config truth, auth API maps it to auth UI state.

Recommendation: C. Preserve roadmap inventory and avoid pretending Atlassian is a normal login provider. Override word: `AUTH_ONLY`.

14. Test strategy?

- A. fixture-driven parse/merge unit tests plus IPC/listener tests with temp home.
- B. browser OAuth E2E.
- C. manual-only.

Recommendation: A. OAuth is Copilot-owned and should be covered by a manual smoke note, not automated against real Atlassian. Override word: `OAUTH_E2E`.

15. Activity copy?

- A. "Configured Atlassian MCP for GitHub Copilot CLI."
- B. "Signed into Atlassian."
- C. "Fixed Atlassian."

Recommendation: A. It is precise and avoids false auth claims. Override word: `SIGNED_IN_COPY`.

## S4 - Verify-Now Evidence

Fixture files:

- `specs/0011-mcp-atlassian-auth/fixtures/copilot-mcp-config-probe.md`
- `specs/0011-mcp-atlassian-auth/fixtures/atlassian-mcp-docs-probe.md`

Load-bearing unknown 1: actual Copilot MCP config path and schema.

- Resolved path: `~/.copilot/mcp-config.json`.
- Disproven roadmap guess: no `~/Library/Application Support/github-copilot/mcp.json` was found locally.
- CLI help says config sources are user `~/.copilot/mcp-config.json`, workspace `.mcp.json`, and plugins.
- GitHub docs say `mcp-config.json` defines user-level MCP servers; project-level `.mcp.json` or `.github/mcp.json` can take precedence.
- Local schema is:

```json
{
  "mcpServers": {
    "atlassian": {
      "type": "http",
      "url": "https://mcp.atlassian.com/v1/mcp"
    }
  }
}
```

- `copilot mcp list --json` normalizes with `tools: ["*"]` and `source: "user"`.

Load-bearing unknown 2: Atlassian MCP entry shape and auth model.

- Atlassian current recommended endpoint: `https://mcp.atlassian.com/v1/mcp/authv2`.
- Transport: remote HTTP/Streamable HTTP, not stdio for Copilot CLI's native remote support.
- Auth model: OAuth 2.1 initiated by the MCP client; dynamic client registration means no manual OAuth app for compatible clients.
- Copilot logs show it initiates OAuth and starts the remote Atlassian server with OAuth.
- Recommended new-write entry:

```json
{
  "mcpServers": {
    "atlassian": {
      "type": "http",
      "url": "https://mcp.atlassian.com/v1/mcp/authv2",
      "tools": ["*"]
    }
  }
}
```

Key conclusion: the original roadmap phrase "Atlassian OAuth via system browser to localhost callback" is stale or at least misassigned. The browser OAuth flow exists, but it belongs to the Copilot MCP client, not Concierge.

## S5 - Risks

- Wrong config path risk is now concrete: implementing the roadmap's macOS guessed path would silently fail Run 11.
- Endpoint drift risk: local Copilot works with `/v1/mcp`, but Atlassian docs recommend `/v1/mcp/authv2`; the spec must define detection and write behavior for both.
- Observer-Only violation: direct Atlassian OAuth or MCP calls from Concierge would cross Principle X.
- User config clobber risk: malformed or comment-like JSONC handling must not lead to silent overwrite. GitHub's MCP config examples are JSON; do not assume comments are safe unless verified.
- Status ambiguity: config present does not prove the user has completed OAuth. The UI must distinguish "configured" from "authorized/ready" unless Copilot exposes readiness.
- Workspace gating regression: making Atlassian a workspace-entry gate would contradict the Run 6 supersession unless deliberately reopened.
- Token exposure: fixtures and logs must never read or persist token values from `~/.copilot/mcp-oauth-config/*.tokens.json`.
- Enterprise/admin risk: Atlassian org admins can restrict MCP access, API token auth, domains, and IPs; Run 11 should surface failure, not diagnose policy deeply.
- Version drift: local `copilot` is 1.0.56 while manifest says verified against 1.0.55. Run 11 should update verification facts before coding.

## S6 - Cost

Honest range: 2.5-4.5 focused engineering days.

- 0.5 day: spec/data-model/tasks update from this grill, including stale roadmap correction.
- 0.75-1.25 days: mcp-config parse/merge module with temp-home tests, malformed/missing cases, and path resolution.
- 0.5-0.75 day: IPC factories/preload/RTK Query endpoint integration.
- 0.5-0.75 day: listener wiring, one-time activity notification, and debounce/idempotency tests.
- 0.5-0.75 day: auth chip/sign-in state model, copy, and visual contracts.
- 0.25-0.5 day: manual Copilot MCP smoke and docs evidence update.

OAuth owned directly by Concierge would add at least 3-6 days and create a constitutional conflict.

## S7 - Recommended Sub-Decisions

Default set:

- `COPILOT_OWNS_ATLASSIAN_OAUTH`: Concierge writes/checks Copilot MCP config; Copilot owns OAuth and tokens.
- `CANONICAL_ENDPOINT_AUTHV2`: new writes use `https://mcp.atlassian.com/v1/mcp/authv2`.
- `LEGACY_ENDPOINT_PRESENT`: an existing `https://mcp.atlassian.com/v1/mcp` entry counts as present for v1; do not rewrite unless explicitly chosen.
- `USER_CONFIG_PATH`: use `~/.copilot/mcp-config.json`, with future `COPILOT_HOME` support if verified.
- `MERGE_PRESERVE`: parse-modify-write preserving all user entries; refuse malformed config rather than replacing it silently.
- `NON_GATING_WORKSPACE`: GitHub + Copilot still gate workspace; Atlassian gates JIRA submission readiness only.
- `AUTH_UI_FROM_MCP_STATUS`: the Atlassian row/chip is driven by MCP config/status, not a standalone OAuth login result.

Override words:

- `OWN_OAUTH`
- `UPGRADE_URL`
- `THREE_GATE`
- `BACKUP_REPLACE`
- `AUTH_ONLY`
- `LIVE_TOOLCALL`

## Source Citations

- Constitution Principle I: `.specify/memory/constitution.md:23-60`
- Constitution Principle III: `.specify/memory/constitution.md:91-127`
- Constitution listener/MCP inventory: `.specify/memory/constitution.md:181-214`
- Roadmap Run 11: `ROADMAP_DECISIONS.md:121-126`
- Roadmap MCP detection: `ROADMAP_DECISIONS.md:195-209`
- Roadmap API/listener inventory: `ROADMAP_DECISIONS.md:330-409`
- Roadmap MCP scope v1: `ROADMAP_DECISIONS.md:517-531`
- Auth slice stub: `src/renderer/slices/auth.ts:20-60`
- Main auth IPC stub: `src/main/ipc/auth.ts:113-122`
- Auth factory token guard: `src/main/ipc/auth.factory.ts:75-110`
- Renderer auth endpoint stub activity: `src/renderer/api/auth.endpoint.ts:74-91`
- Run 6 non-gating decision: `specs/0006-specify-vertical/spec.md:120-122`
- Atlassian docs: `https://support.atlassian.com/atlassian-rovo-mcp-server/docs/getting-started-with-the-atlassian-remote-mcp-server/`
- Atlassian OAuth docs: `https://support.atlassian.com/atlassian-rovo-mcp-server/docs/configuring-oauth-2-1/`
- GitHub Copilot CLI config docs: `https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference`
- GitHub Copilot CLI MCP docs: `https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers`

## Read This First

Run 11 should not build a Concierge-owned Atlassian OAuth flow. The verified path is: Concierge silently ensures Copilot CLI has the Atlassian remote MCP entry in `~/.copilot/mcp-config.json`; Copilot's MCP client initiates OAuth 2.1 and owns tokens; Concierge surfaces readiness and failures without calling Atlassian MCP directly.
