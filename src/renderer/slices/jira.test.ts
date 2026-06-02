import { describe, expect, it } from 'vitest';
import {
  jiraDryRunPreviewLoaded,
  jiraReducer,
  jiraSubmissionFailed,
  jiraSubmissionResultRecorded,
  jiraSubmissionStarted,
  jiraSubmissionSucceeded,
  jiraInitialState
} from './jira';

describe('jira slice', () => {
  it('tracks dry-run preview and submit progress separately from modal visibility', () => {
    let state = jiraReducer(jiraInitialState, jiraDryRunPreviewLoaded({
      featureDir: 'specs/0015-send-jira-button',
      stateDir: 'specs/0015-send-jira-button/jira-submission-state',
      nodes: [{ id: 'n1', issueType: 'Epic', summary: 'Create tickets', parentId: null, labels: ['spec-kit'] }],
      warnings: []
    }));

    expect(state.dryRunPreview?.nodes).toHaveLength(1);
    expect(state.submitting).toBe(false);

    state = jiraReducer(state, jiraSubmissionStarted());
    expect(state.submitting).toBe(true);
    expect(state.results).toEqual([]);

    state = jiraReducer(state, jiraSubmissionResultRecorded({
      nodeId: 'n1',
      status: 'verified',
      issueKey: 'SKC-1',
      issueUrl: 'https://collette.atlassian.net/browse/SKC-1'
    }));
    expect(state.issues).toEqual([{ key: 'SKC-1', url: 'https://collette.atlassian.net/browse/SKC-1' }]);

    state = jiraReducer(state, jiraSubmissionFailed({ message: 'verify_mismatch', remaining: ['n2', 'n3'] }));
    expect(state.submitting).toBe(false);
    expect(state.error).toBe('verify_mismatch');
    expect(state.remaining).toEqual(['n2', 'n3']);

    state = jiraReducer(state, jiraSubmissionStarted());
    expect(state.remaining).toEqual([]);

    state = jiraReducer(state, jiraSubmissionSucceeded({ issues: [] }));
    expect(state.remaining).toEqual([]);
  });
});
