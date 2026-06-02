import React from 'react';
import { jiraSubmissionApi } from '../api/jiraSubmission.endpoint';
import { useAppDispatch, useAppSelector } from '../hooks/store';
import { selectJiraDryRunPreview, selectJiraError, selectJiraIssues, selectJiraResults, selectJiraSubmitting } from '../slices/jira.selectors';
import { modalClosed } from '../slices/ui';
import { selectUiShowJiraSubmission } from '../slices/ui.selectors';
import { selectWorkspaceSelectedRepo } from '../slices/workspace.selectors';
import { Ico } from './Icons';

export const JiraSubmissionModalContainer = (): React.ReactElement | null => {
  const dispatch = useAppDispatch();
  const repo = useAppSelector(selectWorkspaceSelectedRepo);
  const open = useAppSelector(selectUiShowJiraSubmission);
  const preview = useAppSelector(selectJiraDryRunPreview);
  const submitting = useAppSelector(selectJiraSubmitting);
  const results = useAppSelector(selectJiraResults);
  const issues = useAppSelector(selectJiraIssues);
  const error = useAppSelector(selectJiraError);
  const [submitJiraSubmission] = jiraSubmissionApi.useSubmitJiraSubmissionMutation();

  if (!open || preview === null) {
    return null;
  }

  return (
    <div className="modal-veil" data-vd-role="modal-veil" onClick={() => dispatch(modalClosed('showJiraSubmission'))}>
      <div role="dialog" aria-modal="true" aria-label="JIRA dry-run preview" className="modal jira-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <Ico.Send size={13} />
          <h2>JIRA dry-run preview</h2>
          <button type="button" className="icon-btn" aria-label="Dismiss" onClick={() => dispatch(modalClosed('showJiraSubmission'))}><Ico.X size={13} /></button>
        </div>
        <div className="modal-body jira-modal-body">
          <div className="jira-summary">
            <span>{preview.featureDir}</span>
            <strong>{preview.nodes.length} issues</strong>
          </div>
          {preview.warnings.map((warning) => <div className="inline-warning" role="alert" key={warning}>{warning}</div>)}
          <div className="jira-preview-list">
            {preview.nodes.map((node) => (
              <div className="jira-preview-row" key={node.id}>
                <span className="tag">{node.issueType}</span>
                <strong>{node.summary}</strong>
                <small>{node.parentId ?? 'root'}</small>
              </div>
            ))}
          </div>
          {results.length > 0 || submitting ? (
            <div className="jira-progress" aria-label="JIRA submission progress">
              {preview.nodes.map((node) => {
                const result = results.find((item) => item.nodeId === node.id);
                return (
                  <div className="jira-progress-row" key={node.id}>
                    <span>{result?.status ?? (submitting ? 'pending' : 'not started')}</span>
                    <strong>{node.summary}</strong>
                    {result?.issueKey !== undefined && result.issueUrl !== undefined ? <a href={result.issueUrl}>{result.issueKey}</a> : null}
                  </div>
                );
              })}
            </div>
          ) : null}
          {issues.length > 0 ? (
            <div className="jira-issue-links" aria-label="Created JIRA issues">
              {issues.map((issue) => <a key={issue.key} href={issue.url}>{issue.key}</a>)}
            </div>
          ) : null}
          {error !== null ? <div className="inline-warning" role="alert">{error}</div> : null}
        </div>
        <div className="modal-foot">
          <button type="button" className="btn ghost" onClick={() => dispatch(modalClosed('showJiraSubmission'))}>Close</button>
          <button
            type="button"
            className="btn primary"
            disabled={submitting || repo === null}
            onClick={() => {
              if (repo !== null) {
                void submitJiraSubmission({ repositoryPath: repo.path });
              }
            }}
          >
            <Ico.Send size={12} />{submitting ? 'Creating...' : 'Create issues'}
          </button>
        </div>
      </div>
    </div>
  );
};
