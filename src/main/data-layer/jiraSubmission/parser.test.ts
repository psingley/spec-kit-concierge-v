import { describe, expect, it } from 'vitest';
import { parseJiraTicketModel } from './parser';

const specMarkdown = `# Hybrid Manifest Architecture

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Deterministic Step Completion (Priority: P1)

As a user running the six-step pipeline, I need each step to resolve to a trustworthy terminal outcome.

**Why this priority**: This is the core value of the feature.

**Independent Test**: Replay a completed-step fixture and confirm durable evidence agrees.

**Acceptance Scenarios**:

1. **Given** a step has produced required artifacts, **When** reconciliation runs, **Then** the step is recorded as passed only if all evidence agrees.
2. **Given** a step exits successfully but artifacts are missing, **When** reconciliation runs, **Then** the step is not marked passed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST maintain a durable manifest.
- **FR-002**: System MUST record each step attempt.

## Success Criteria *(mandatory)*

- **SC-001**: 100% of passed steps have matching evidence.
`;

describe('JIRA ticket artifact parser', () => {
  it('parses suffix task ids, normalized headings, phase dash summaries, tags, and affected files', () => {
    const model = parseJiraTicketModel({
      featureSlug: '0013-hybrid-manifest-architecture',
      specMarkdown,
      tasksMarkdown: `# Tasks

## Phase 1 — Generate the shell scaffold
- [X] T005a [P] Create fixture corpus in \`tests/fixtures/hybrid-manifest/resume.json\`

## Phase 2 - User Story 1 - Deterministic Step Completion
- [ ] T006 [US1] Implement reconciliation in src/main/domain/reconciliation/sessionReconciler.ts and \`src/main/hooks/hookHelpers.ts\`
`
    });

    expect(model.epic.scope.some((item) => item.includes('FR-001'))).toBe(true);
    expect(model.stories[0]).toMatchObject({
      id: '0013-hybrid-manifest-architecture-phase-1-generate-the-shell-scaffold',
      summary: 'Generate the shell scaffold',
      userStoryNumber: null
    });
    expect(model.stories[1]).toMatchObject({
      userStoryNumber: 1,
      independentTest: 'Replay a completed-step fixture and confirm durable evidence agrees.'
    });
    expect(model.stories[1]?.acceptanceScenarios[0]).toMatchObject({
      given: 'a step has produced required artifacts',
      when: 'reconciliation runs',
      then: 'the step is recorded as passed only if all evidence agrees.'
    });
    expect(model.subtasks.map((task) => task.taskId)).toEqual(['T005a', 'T006']);
    expect(model.subtasks[0]).toMatchObject({
      id: '0013-hybrid-manifest-architecture-T005a',
      prose: 'Create fixture corpus in `tests/fixtures/hybrid-manifest/resume.json`',
      affectedFiles: ['tests/fixtures/hybrid-manifest/resume.json']
    });
    expect(model.subtasks[1]?.prose).not.toContain('[US1]');
    expect(model.subtasks[1]?.affectedFiles).toEqual(expect.arrayContaining([
      'src/main/domain/reconciliation/sessionReconciler.ts',
      'src/main/hooks/hookHelpers.ts'
    ]));
  });

  it('gracefully degrades when acceptance details are missing and never invents setup GWT', () => {
    const model = parseJiraTicketModel({
      featureSlug: '0001-foundation-shell',
      specMarkdown: `# Foundation Shell

## Requirements

- Preserve the shell.
`,
      tasksMarkdown: `# Tasks

## Phase 1: Setup
- [ ] T001 [P] Bootstrap package in \`package.json\`
`
    });

    expect(model.stories[0]?.acceptanceScenarios).toEqual([]);
    expect(model.stories[0]?.userStorySentence).toBe('');
    expect(model.subtasks[0]?.doneWhen[0]).toBe('Task T001 is implemented and its acceptance notes pass');
  });

  it('disambiguates duplicate phase and task node ids deterministically', () => {
    const model = parseJiraTicketModel({
      featureSlug: '0002-main-data-layer',
      specMarkdown,
      tasksMarkdown: `# Tasks

## Phase 1: Setup
- [ ] T001 Add first file

## Phase 1: Setup
- [ ] T001 Add second file
`
    });

    expect(model.stories.map((story) => story.id)).toEqual([
      '0002-main-data-layer-phase-1-setup',
      '0002-main-data-layer-phase-1-setup-2'
    ]);
    expect(model.subtasks.map((task) => task.id)).toEqual([
      '0002-main-data-layer-T001',
      '0002-main-data-layer-T001-2'
    ]);
  });
});
