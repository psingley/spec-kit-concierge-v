import type { RootState } from '../store';

export const selectJiraState = (state: RootState) => state.jira;
export const selectJiraDryRunPreview = (state: RootState) => state.jira.dryRunPreview;
export const selectJiraSubmitting = (state: RootState) => state.jira.submitting;
export const selectJiraResults = (state: RootState) => state.jira.results;
export const selectJiraIssues = (state: RootState) => state.jira.issues;
export const selectJiraError = (state: RootState) => state.jira.error;
