# Implementation Plan: MCP Config Detection & Atlassian Auth

**Branch**: `spec/0011-mcp-atlassian-auth` | **Date**: 2026-05-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/0011-mcp-atlassian-auth/spec.md`

## Summary

Run 11 replaces the Atlassian auth stub with real Copilot MCP config detection and passive repair. Concierge remains Observer-Only: it reads Copilot MCP config, checks non-secret OAuth metadata plus token-file presence, delegates writes to `copilot mcp add --transport http`, and maps MCP truth into the existing auth chip without implementing OAuth or reading token values.

## Technical Context

**Language/Version**: TypeScript strict, Electron main/preload/renderer split

**Primary Dependencies**: Electron IPC, Redux Toolkit / RTK Query, pino, Vitest, Playwright, existing visual-diff harness

**Storage**: Copilot-owned files under `COPILOT_HOME` or `os.homedir()/.copilot`; Concierge writes no token store

**Testing**: Vitest co-located unit/factory/IPC/listener tests, renderer component tests, visual-diff contracts, Playwright e2e

**Target Platform**: macOS for Run 11 implementation; Windows path smoke deferred to Run 13

**Project Type**: Electron desktop app

**Performance Goals**: Coalesced checker avoids repeated shell-outs during app launch and workspace restore bursts

**Constraints**: Principle X Observer-Only, 8-slice lock, no new runtime dependencies, no Atlassian OAuth implementation, no token-value reads, no `%APPDATA%` path branch

**Scale/Scope**: One MCP server prerequisite (Atlassian) with extension-friendly module boundaries but no plugin framework

## Constitution Check

- **Principle I Layered Architecture**: PASS. Filesystem and child process access live in main data-layer modules and IPC handlers; renderer only uses preload/RTK Query.
- **Principle II Disk Is Truth**: PASS. Copilot disk config and OAuth metadata are observed as the source for Atlassian readiness.
- **Principle IV Factory-First**: PASS. IPC and renderer payloads receive factory coverage.
- **Principle V Pure/Effect**: PASS. Parse/detect helpers are pure; filesystem and `copilot` shell-out stay in data-layer effect files.
- **Principle VI State Management**: PASS. Uses existing auth slice and RTK Query API inventory; no ninth slice.
- **Principle X Observer-Only**: PASS. Concierge configures and observes Copilot MCP state only; no Atlassian OAuth, tokens, or direct MCP calls.

## Project Structure

### Documentation (this feature)

```text
specs/0011-mcp-atlassian-auth/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
├── fixtures/
├── checklists/
└── tasks.md
```

### Source Code (repository root)

```text
src/main/data-layer/mcp-config/
├── paths.ts
├── parse.ts
├── authEvidence.ts
├── copilotMcp.ts
├── types.ts
└── *.test.ts

src/main/ipc/
├── mcpConfig.factory.ts
├── mcpConfig.ts
└── mcpConfig*.test.ts

src/preload/index.ts

src/renderer/api/
├── mcpConfig.endpoint.ts
├── mcpConfig.factory.ts
└── mcpConfig*.test.ts

src/renderer/listeners/
└── mcpConfigChecker.ts

src/renderer/slices/auth.ts
src/renderer/components/*
src/renderer/product/workspaceGatePrerequisites.ts
```

**Structure Decision**: Main owns all file and child-process work; preload exposes `mcp:config:*`; renderer RTK Query and listener middleware consume that bridge; the existing auth slice stores the UI projection.

## Complexity Tracking

No constitution violations.
