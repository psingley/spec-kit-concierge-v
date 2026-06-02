import { describe, expect, it } from 'vitest';
import {
  createJiraDryRunRequest,
  createJiraSubmissionAck,
  createJiraSubmissionEvent,
  createJiraSubmitRequest
} from './jiraSubmission.factory';

const baseRequest = { repositoryPath: '/repo' };
const submitRequest = { repositoryPath: '/repo', subscriptionId: 'sub-1' };

describe('jira submission IPC factory', () => {
  it('accepts dry-run and submit requests from an absolute repository path', () => {
    expect(createJiraDryRunRequest(baseRequest)).toEqual({ ok: true, value: baseRequest });
    expect(createJiraSubmitRequest(submitRequest)).toEqual({ ok: true, value: submitRequest });
  });

  it('rejects relative repository paths', () => {
    expect(createJiraDryRunRequest({ repositoryPath: 'repo' })).toMatchObject({ ok: false });
    expect(createJiraSubmitRequest({ repositoryPath: 'repo', subscriptionId: 'sub-1' })).toMatchObject({ ok: false });
  });

  it('rejects renderer-supplied feature dirs and other extra keys', () => {
    expect(createJiraDryRunRequest({ ...baseRequest, featureDir: 'specs/0015' })).toMatchObject({ ok: false });
    expect(createJiraSubmitRequest({ ...submitRequest, projectKey: 'SKC' })).toMatchObject({ ok: false });
  });

  it('accepts the submission ack boundary shape', () => {
    expect(createJiraSubmissionAck({ subscriptionId: 'sub-1', accepted: true, featureDir: 'specs/0015' })).toEqual({
      ok: true,
      value: { subscriptionId: 'sub-1', accepted: true, featureDir: 'specs/0015' }
    });
  });

  it('accepts progress, result, done, and failed stream events', () => {
    expect(createJiraSubmissionEvent({ type: 'progress', nodeId: 'n1', message: 'Creating', timestamp: 'now' })).toMatchObject({ ok: true });
    expect(createJiraSubmissionEvent({ type: 'result', nodeId: 'n1', status: 'verified', issueKey: 'SKC-1', issueUrl: 'https://x/browse/SKC-1', timestamp: 'now' })).toMatchObject({ ok: true });
    expect(createJiraSubmissionEvent({ type: 'done', status: 'pass', issues: [], timestamp: 'now' })).toMatchObject({ ok: true });
    expect(createJiraSubmissionEvent({ type: 'done', status: 'fail', reason: 'verify_mismatch', issues: [], remainingNodeIds: ['n2'], timestamp: 'now' })).toMatchObject({ ok: true });
  });

  it('rejects malformed stream events', () => {
    expect(createJiraSubmissionEvent(null)).toMatchObject({ ok: false });
    expect(createJiraSubmissionEvent({ type: 'progress', nodeId: 'n1' })).toMatchObject({ ok: false });
    expect(createJiraSubmissionEvent({ type: 'done', status: 'maybe', issues: [], timestamp: 'now' })).toMatchObject({ ok: false });
    expect(createJiraSubmissionEvent({ type: 'done', status: 'fail', reason: 'verify_mismatch', issues: [], timestamp: 'now' })).toMatchObject({ ok: false });
  });
});
