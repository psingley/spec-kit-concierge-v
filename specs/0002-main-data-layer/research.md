# Run 2 Research - Main Data Layer Foundation

**Date**: 2026-05-27

## Decisions

### 1. RTK Query and Redux Toolkit versions

**Decision**: Add exact runtime dependency pins:

```json
"@reduxjs/toolkit": "2.12.0",
"react-redux": "9.3.0"
```

**Rationale**: `@reduxjs/toolkit` includes RTK Query and provides the `createApi` surface needed for the renderer IPC base-query shape. `react-redux` is the matching React binding dependency required by the renderer state stack, even though Run 2 does not mount a product Redux Provider. Exact pins satisfy the constitution's dependency-pin rule and keep downstream Run 4 store work deterministic.

**Alternatives considered**:

- Defer dependencies until Run 4: rejected because Run 2 owns the RTK Query base-query shape and proof endpoint.
- Use caret ranges: rejected because the constitution requires exact dependency pins.
- Add a different query library: rejected by Principle VI; RTK Query is the renderer IPC-crossing data primitive.

### 2. pino-pretty development transport

**Decision**: Add exact dev dependency pin:

```json
"pino-pretty": "13.1.3"
```

Use pino ndjson file output for the canonical log and add a dev-only pretty stream for terminal readability. Production logs remain ndjson.

Recommended shape:

```ts
const fileStream = pino.destination(logPath);
const prettyStream = pino.transport({
  target: 'pino-pretty',
  options: {
    colorize: true,
    singleLine: true,
    translateTime: 'SYS:standard'
  }
});

const streams = isDevelopment
  ? [{ stream: fileStream }, { stream: prettyStream }]
  : [{ stream: fileStream }];

const logger = pino(
  {
    level: process.env.CONCIERGE_DEBUG === '1' ? 'debug' : 'info',
    base: {
      pid: process.pid,
      hostname: os.hostname(),
      app: 'concierge',
      version: packageVersion
    },
    redact: []
  },
  pino.multistream(streams)
);
```

**Rationale**: The file remains machine-readable ndjson for audit/debug workflows, while `npm run dev` can show readable development output without changing production log shape. `redact: []` reserves the Run 3 token-redaction seam without pretending Run 2 has secrets to redact.

**Alternatives considered**:

- Pipe `electron-forge start` through `pino-pretty`: rejected because Electron Forge output is not only pino ndjson and script-level piping is brittle.
- Pretty-print the file log: rejected because SC-006 and Principle XV need structured local logs.
- Add size-based rotation or retention: rejected as out of scope; Run 2 rotates only by calendar date.

### 3. Direct write plus fsync Node API approach

**Decision**: Implement `safeWrite` with a writable file handle, direct overwrite, and explicit `FileHandle.sync()` before close:

```ts
import { open } from 'node:fs/promises';

const handle = await open(targetPath, 'w');
try {
  await handle.writeFile(contents, { encoding: 'utf8' });
  await handle.sync();
} finally {
  await handle.close();
}
```

This uses the file-handle form of `writeFile` so the same descriptor can be synced before it is closed. It does not write a temp file, does not rename, and does not fsync the parent directory as an atomic-replace protocol.

**Rationale**: `fs.promises.writeFile(path, ...)` closes its descriptor internally, so a later `fsync` would need a second open and would not represent the same write handle. A `FileHandle` keeps the write and `fsync` tied to one descriptor while honoring Q1's direct-overwrite decision.

**Error handling**: Write, sync, and close errors propagate to the caller according to normal async error behavior. The helper must not swallow write or sync failures. It logs the target path and calling Step context as the safety/audit contract; it does not block paths outside an active workspace.

**Alternatives considered**:

- `writeFile(path)` followed by reopening the file to sync: rejected because it is less direct and obscures the durability boundary.
- Temp file plus rename: rejected by Q1; Run 2 explicitly does not claim atomicity.
- Workspace path guard: rejected by Q2 and replaced by typed-helper audit logging.
