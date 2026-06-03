import { describe, expect, it } from 'vitest';
import { parseJiraTicketModel } from './parser';
import { buildTicketDocument } from './ticketDocument';

const specMarkdown = `# Hybrid Manifest Architecture

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Deterministic Step Completion (Priority: P1)

As a user running the six-step pipeline, I need trustworthy terminal outcomes.

**Why this priority**: This is the core value.

**Independent Test**: Replay a completed-step fixture before integration.

**Acceptance Scenarios**:

1. **Given** durable evidence exists, **When** reconciliation runs, **Then** the step is shown as passed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST maintain a durable manifest.

## Success Criteria *(mandatory)*

- **SC-001**: 100% of passed steps have matching evidence.
`;

const tasksMarkdown = `# Tasks

## Phase 1: User Story 1 - Deterministic Step Completion
- [ ] T006 [US1] Implement reconciliation in \`src/main/domain/reconciliation/sessionReconciler.ts\`
- [ ] T007 [US1] Add hook checks in src/main/hooks/hookHelpers.ts
`;

describe('JIRA Ticket Document builder', () => {
  it('builds a gold-standard subtask document with parent contribution, affected files, and done-when', () => {
    const model = parseJiraTicketModel({ featureSlug: '0013-hybrid', specMarkdown, tasksMarkdown });
    const subtask = model.subtasks[0]!;
    const document = buildTicketDocument(model, subtask.id);

    expect(document.summary).toBe('T006 Implement reconciliation in `src/main/domain/reconciliation/sessionReconciler.ts`');
    expect(document.markdown).toContain('**Contributes to:** Deterministic Step Completion');
    expect(document.markdown).toContain('Implement reconciliation in `src/main/domain/reconciliation/sessionReconciler.ts`');
    expect(document.markdown).toContain('### Affected files');
    expect(document.markdown).toContain('* `src/main/domain/reconciliation/sessionReconciler.ts`');
    expect(document.markdown).toContain('### Done when');
    expect(document.markdown).toContain('* durable evidence exists -> reconciliation runs -> the step is shown as passed.');
    expect(document.markdown).not.toContain('[US1]');
    expect(document.markdown).not.toContain('|');
  });

  it('builds story markdown with acceptance criteria and child implementation outline', () => {
    const model = parseJiraTicketModel({ featureSlug: '0013-hybrid', specMarkdown, tasksMarkdown });
    const document = buildTicketDocument(model, model.stories[0]!.id);

    expect(document.markdown).toContain('As a user running the six-step pipeline, I need trustworthy terminal outcomes.');
    expect(document.markdown).toContain('## Acceptance Criteria');
    expect(document.markdown).toContain('* Given durable evidence exists, when reconciliation runs, then the step is shown as passed.');
    expect(document.markdown).toContain('**Goal:** Deterministic Step Completion');
    expect(document.markdown).toContain('**Independent Test:** Replay a completed-step fixture before integration.');
    expect(document.markdown).toContain('### Implementation outline');
    expect(document.markdown).toContain('* T006 - Implement reconciliation');
    expect(document.markdown).toContain('* T007 - Add hook checks');
  });

  it('builds epic markdown with key outcomes, scope, acceptance highlights, and word-boundary clamping', () => {
    const longSpec = `${specMarkdown}

## Requirements

- ${'Longword '.repeat(500)}
`;
    const model = parseJiraTicketModel({ featureSlug: '0013-hybrid', specMarkdown: longSpec, tasksMarkdown });
    const document = buildTicketDocument(model, model.epic.id, { maxMarkdownLength: 220 });

    expect(document.markdown).toContain('## Key Outcomes');
    expect(document.markdown).toContain('## Scope');
    expect(document.markdown).toContain('## Acceptance highlights');
    expect(document.markdown.length).toBeLessThanOrEqual(220);
    expect(document.markdown).toMatch(/\.\.\.$/);
    expect(document.markdown).not.toMatch(/[A-Za-z]\.\.\.$/);
  });
});
