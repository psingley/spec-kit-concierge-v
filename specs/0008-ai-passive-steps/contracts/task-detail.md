# Contract: Task Detail

## Capability

```text
tasks:detail
```

## Request

```ts
type TaskDetailRequest = {
  repositoryPath: string;
  branchName: string;
  taskId: string;
};
```

Validation:
- Active feature directory resolves from `.specify/feature.json` when present.
- `taskId` must be non-empty and match a parsed task in the validated `tasks.md`.
- The renderer does not parse task detail from stale in-memory markdown.

## Response

```ts
type TaskDetailResponse = {
  id: string;
  title: string;
  phase?: string;
  area?: string;
  dependencies: string[];
  files: string[];
  acceptanceNotes: string[];
  estimate?: string;
  sourceLine?: number;
};
```

Rules:
- `id` and `title` are required.
- `phase`, `area`, `dependencies`, `files`, `acceptanceNotes`, and `estimate` are included when present in `tasks.md`.
- Missing optional fields are omitted or empty arrays, not invented.
- Dependency references must remain stable enough for user presentation.

## Validation Errors

Tasks contract rejects:
- Duplicate task ids.
- Missing task ids or titles.
- Dependency references that cannot be understood safely.
- Task structures that collapse multiple tasks into one ambiguous row.
- Unsafe or parser-confusing markdown that prevents stable presentation.

## UI Requirements

Task viewer:
- Opens on explicit user action from a validated Tasks row.
- Has accessible dialog semantics and keyboard dismissal.
- Labels id, title, phase/area, dependencies, files, acceptance notes, and estimate.
- Does not fetch task details before the user opens the row.
