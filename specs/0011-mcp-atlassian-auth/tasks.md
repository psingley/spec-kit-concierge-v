# Tasks: MCP Config Detection & Atlassian Auth

**Input**: Design documents from `specs/0011-mcp-atlassian-auth/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Required. Write failing tests before production code for new behavior.

## Phase 1: Setup

- [ ] T001 Add fixture JSON shapes under `src/main/data-layer/mcp-config/__fixtures__/` for empty, figma-only, legacy-atlassian, authv2-atlassian, malformed, matching-auth, stale-legacy, and no-token-companion states.
- [ ] T002 Add `workspaceGatePrerequisites` product constant with default `['github','copilot']`.

## Phase 2: Main Data Layer

- [ ] T003 [P] Add failing resolver tests for `COPILOT_HOME` and `os.homedir()` paths in `src/main/data-layer/mcp-config/paths.test.ts`.
- [ ] T004 Implement `src/main/data-layer/mcp-config/paths.ts`.
- [ ] T005 [P] Add failing parse/detect tests for Atlassian URL presence, legacy detection, and malformed refusal in `parse.test.ts`.
- [ ] T006 Implement pure parse/detect helpers in `parse.ts`.
- [ ] T007 [P] Add failing auth evidence tests proving exact `serverUrl` matching, stale legacy ignore, token companion presence, and no token reads in `authEvidence.test.ts`.
- [ ] T008 Implement `authEvidence.ts`.
- [ ] T009 [P] Add failing Copilot adapter tests for `mcp add --transport http` and malformed no-write behavior in `copilotMcp.test.ts`.
- [ ] T010 Implement `copilotMcp.ts` and `types.ts`.

## Phase 3: IPC Boundary

- [ ] T011 [P] Add factory tests for `mcp:config:check` and `mcp:config:fix` payloads/results.
- [ ] T012 Implement `src/main/ipc/mcpConfig.factory.ts`.
- [ ] T013 [P] Add IPC handler tests mirroring artifacts/read and tasks/detail patterns with mocked logger/data layer.
- [ ] T014 Implement `src/main/ipc/mcpConfig.ts` with structured pino logging.
- [ ] T015 Register MCP config IPC in main bootstrap and expose bridge in `src/preload/index.ts`.

## Phase 4: Renderer API And Auth Mapping

- [ ] T016 [P] Add renderer factory and endpoint tests for `mcpConfigApi`.
- [ ] T017 Implement `src/renderer/api/mcpConfig.factory.ts` and `mcpConfig.endpoint.ts` without adding a ninth slice.
- [ ] T018 [P] Add auth slice tests for MCP-derived Atlassian states and no fake success.
- [ ] T019 Update auth slice/actions/selectors so Atlassian chip state derives from MCP config status.
- [ ] T020 Repurpose Atlassian login/connect flow to call `mcp:config:fix`.

## Phase 5: Checker Listener

- [ ] T021 Add failing listener tests with fake timers for app launch and workspace repo bursts coalescing to one write.
- [ ] T022 Implement `mcpConfigChecker` listener and activity notices/errors.

## Phase 6: UI And Visual Contracts

- [ ] T023 Update sign-in/topbar auth chip copy for not configured, needs auth, authenticated, and write failed; do not call Atlassian optional.
- [ ] T024 Add visual contracts for the four real Atlassian states with honest thresholds.

## Phase 7: Verification And Docs

- [ ] T025 Add manual OAuth smoke note and Run 13 Windows smoke flag to Run 11 artifacts.
- [ ] T026 Run focused unit tests for mcp-config, IPC, auth, listener, and renderer API.
- [ ] T027 Run `npm run vd:dev` for new contracts and ensure existing contracts do not regress.
- [ ] T028 Run final gate: `rm -rf .vite/build && npm run typecheck && npm run lint && npm test && npm run e2e`.

## Dependencies & Execution Order

Main data-layer tests and implementation block IPC. IPC blocks preload and renderer API. Renderer API blocks listener and auth mapping. UI contracts depend on auth mapping.

## Notes

- Never read `.tokens.json` contents.
- Never implement Atlassian OAuth in Concierge.
- Never call Atlassian MCP tools in Run 11.
- Do not add a ninth Redux slice.
