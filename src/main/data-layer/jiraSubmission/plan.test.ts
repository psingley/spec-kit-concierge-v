import { describe, expect, it } from 'vitest';
import { buildJiraSubmissionPlan, createPayloadHash } from './plan';

const specMarkdown = `# Send to JIRA button

## User Stories & Testing

### User Story 1 - Review sends tickets (Priority: P1)

As a product owner, I can preview JIRA issues before creating them.

## Requirements

- **FR-001**: Show Send to JIRA on Review.
- **FR-002**: Use deterministic issue bodies.
`;

const tasksMarkdown = `# Tasks: Send to JIRA button

## Phase 1: Setup

- [ ] T001 Add IPC request factory
- [ ] T002 Add renderer slice

## Phase 2: User Story 1 - Review sends tickets

- [ ] T003 Render Send to JIRA button
- [ ] T004 Implement bounded create loop
`;

describe('JIRA submission plan', () => {
  it('builds a deterministic Epic -> Story -> Subtask DAG from spec and tasks artifacts', () => {
    const plan = buildJiraSubmissionPlan({
      repositoryPath: '/repo',
      featureDir: '/repo/specs/0015-send-jira-button',
      specMarkdown,
      tasksMarkdown,
      config: { projectKey: 'SKC', baseLabels: ['spec-kit', 'concierge'] }
    });

    expect(plan.stateDir).toBe('/repo/specs/0015-send-jira-button/jira-submission-state');
    expect(plan.nodes.map((node) => [node.id, node.issueType, node.parentId])).toEqual([
      ['0015-send-jira-button-epic', 'Epic', null],
      ['0015-send-jira-button-phase-1-setup', 'Story', '0015-send-jira-button-epic'],
      ['0015-send-jira-button-T001', 'Subtask', '0015-send-jira-button-phase-1-setup'],
      ['0015-send-jira-button-T002', 'Subtask', '0015-send-jira-button-phase-1-setup'],
      ['0015-send-jira-button-phase-2-user-story-1-review-sends-tickets', 'Story', '0015-send-jira-button-epic'],
      ['0015-send-jira-button-T003', 'Subtask', '0015-send-jira-button-phase-2-user-story-1-review-sends-tickets'],
      ['0015-send-jira-button-T004', 'Subtask', '0015-send-jira-button-phase-2-user-story-1-review-sends-tickets']
    ]);
    expect(plan.nodes[0]?.labels.some((label) => /^SKC-idem-[a-f0-9]{12}$/.test(label))).toBe(true);
    expect(plan.nodes[2]?.description).toContain('Source task: T001');
    expect(plan.nodes[2]?.payload.relationship_field).toBeNull();
  });

  it('clamps long Jira summaries while preserving full text in descriptions and payload hashes', () => {
    const longEpicTitle = `Long Jira epic ${'overflow '.repeat(35)}`.trim();
    const longPhaseTitle = `Long Jira phase ${'overflow '.repeat(35)}`.trim();
    const longTaskTitle = `Long Jira task ${'overflow '.repeat(35)}`.trim();
    const longTaskSummary = `T001 ${longTaskTitle}`;
    const shortTaskSummary = 'T002 Short task';
    const plan = buildJiraSubmissionPlan({
      repositoryPath: '/repo',
      featureDir: '/repo/specs/0016-long-jira-summary',
      specMarkdown: `# ${longEpicTitle}

## Requirements

- Preserve long titles.`,
      tasksMarkdown: `# Tasks: Long Jira summary

## Phase 1: ${longPhaseTitle}

- [ ] T001 ${longTaskTitle}
- [ ] T002 Short task
`,
      config: { projectKey: 'SKC', baseLabels: ['spec-kit', 'concierge'] }
    });

    expect(plan.nodes.every((node) => node.summary.length <= 255)).toBe(true);
    expect(plan.nodes.every((node) => node.payload.summary.length <= 255)).toBe(true);

    const [epic, phase, longTask, shortTask] = plan.nodes;
    expect(epic?.summary.length).toBeLessThanOrEqual(255);
    expect(epic?.summary.endsWith('…')).toBe(true);
    expect(epic?.description).toContain(longEpicTitle);

    expect(phase?.summary.length).toBeLessThanOrEqual(255);
    expect(phase?.summary.endsWith('…')).toBe(true);
    expect(phase?.description).toContain(longPhaseTitle);

    expect(longTask?.summary.length).toBeLessThanOrEqual(255);
    expect(longTask?.summary.endsWith('…')).toBe(true);
    expect(longTask?.description).toContain(longTaskSummary);

    expect(shortTask?.summary).toBe(shortTaskSummary);
    expect(shortTask?.description).toContain(shortTaskSummary);

    expect(longTask?.payloadHash).toBe(createPayloadHash({
      ...longTask?.payload,
      labels: ['spec-kit', 'concierge', '0016-long-jira-summary']
    }));
  });

  it('hashes normalized payloads without the generated idempotency label', () => {
    const first = createPayloadHash({
      project_key: 'SKC',
      labels: ['spec-kit', 'concierge'],
      summary: 'Create tickets',
      nested: { b: 'two', a: 'one' }
    });
    const second = createPayloadHash({
      nested: { a: 'one', b: 'two' },
      summary: 'Create tickets',
      labels: ['spec-kit', 'concierge'],
      project_key: 'SKC'
    });
    const withLabel = createPayloadHash({
      nested: { a: 'one', b: 'two' },
      summary: 'Create tickets',
      labels: ['spec-kit', 'concierge', 'SKC-idem-deadbeef0000'],
      project_key: 'SKC'
    });

    expect(first).toBe(second);
    expect(first).not.toBe(withLabel);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });
});
