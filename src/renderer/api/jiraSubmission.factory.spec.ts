import { describe, expect, it } from 'vitest';
import {
  parseRendererJiraDryRunPreview,
  parseRendererJiraSubmissionAck,
  parseRendererJiraSubmissionEvent
} from './jiraSubmission.factory';

describe('renderer jira submission factory', () => {
  it('accepts dry-run previews', () => {
    expect(parseRendererJiraDryRunPreview({
      featureDir: 'specs/0015',
      stateDir: '/repo/specs/0015/jira-submission-state',
      nodes: [{ id: 'epic', issueType: 'Epic', summary: 'Feature', parentId: null, labels: ['spec-kit'] }],
      warnings: []
    })).toMatchObject({ ok: true });
  });

  it('rejects malformed dry-run nodes', () => {
    expect(parseRendererJiraDryRunPreview({ featureDir: 'specs/0015', stateDir: '/repo/state', nodes: [{ id: 'epic' }], warnings: [] })).toMatchObject({ ok: false });
  });

  it('accepts submit acks', () => {
    expect(parseRendererJiraSubmissionAck({ subscriptionId: 'sub-1', accepted: true, featureDir: 'specs/0015' })).toMatchObject({ ok: true });
  });

  it('rejects hostile submit acks', () => {
    expect(parseRendererJiraSubmissionAck({ subscriptionId: 'sub-1', accepted: false, featureDir: 'specs/0015' })).toMatchObject({ ok: false });
  });

  it('accepts stream progress, result, and done events', () => {
    expect(parseRendererJiraSubmissionEvent({ type: 'progress', nodeId: 'n1', message: 'Creating', timestamp: 'now' })).toMatchObject({ ok: true });
    expect(parseRendererJiraSubmissionEvent({ type: 'result', nodeId: 'n1', status: 'verified', issueKey: 'SKC-1', issueUrl: 'https://x', timestamp: 'now' })).toMatchObject({ ok: true });
    expect(parseRendererJiraSubmissionEvent({ type: 'done', status: 'pass', issues: [], timestamp: 'now' })).toMatchObject({ ok: true });
  });

  it('rejects malformed stream events', () => {
    expect(parseRendererJiraSubmissionEvent(null)).toMatchObject({ ok: false });
    expect(parseRendererJiraSubmissionEvent({ type: 'done', status: 'maybe', issues: [], timestamp: 'now' })).toMatchObject({ ok: false });
  });
});
