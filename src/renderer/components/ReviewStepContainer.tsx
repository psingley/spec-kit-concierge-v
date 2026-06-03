import React, { useMemo } from 'react';
import { reviewEvidenceApi } from '../api/reviewEvidence.endpoint';
import { parseRendererJiraDryRunPreview } from '../api/jiraSubmission.factory';
import { sessionManifestApi } from '../api/sessionManifest.endpoint';
import { useAppDispatch, useAppSelector } from '../hooks/store';
import { jiraDryRunPreviewLoaded } from '../slices/jira';
import { artifactViewerOpened, modalOpened, toastShown } from '../slices/ui';
import { selectAuthAtlassianStatus } from '../slices/auth.selectors';
import { selectWorkspaceSelectedRepo } from '../slices/workspace.selectors';
import { NudgeButton, type NudgeButtonResult } from './NudgeButton';
import { ReviewStep } from './ReviewStep';

const textField = (value: Record<string, unknown>, field: string): string | undefined =>
  typeof value[field] === 'string' ? value[field] : undefined;

const auditSummary = (payload: Record<string, unknown> | undefined): string[] => {
  const audit = payload?.audit;
  if (!Array.isArray(audit)) return [];
  return audit.flatMap((item) => {
    if (typeof item !== 'object' || item === null) return [];
    const record = item as Record<string, unknown>;
    const event = textField(record, 'event') ?? 'manifest';
    const message = textField(record, 'message') ?? event;
    return [`${event}: ${message}`];
  });
};

const nudgeResult = (payload: Record<string, unknown>): NudgeButtonResult => {
  const result = textField(payload, 'result');
  return {
    result: result === 'repaired' || result === 'no-op' || result === 'escalated' || result === 'rejected' ? result : 'rejected',
    message: textField(payload, 'message') ?? ''
  };
};

export const ReviewStepContainer = (): React.ReactElement => {
  const repo = useAppSelector(selectWorkspaceSelectedRepo);
  const atlassianStatus = useAppSelector(selectAuthAtlassianStatus);
  const dispatch = useAppDispatch();
  // The IPC resolves the feature dir from .specify/feature.json; the renderer only
  // supplies the worktree root.
  const request = useMemo(() => repo === null ? undefined : {
    repositoryPath: repo.path
  }, [repo]);
  const evidence = reviewEvidenceApi.useGetReviewEvidenceQuery(request!, { skip: request === undefined });
  const reconciliation = sessionManifestApi.useReconcileSessionManifestQuery(request!, { skip: request === undefined });
  const audit = sessionManifestApi.useGetAuditTrailQuery(request!, { skip: request === undefined });
  const [nudgeManifest] = sessionManifestApi.useNudgeSessionManifestMutation();
  const canNudge = reconciliation.data?.status === 'needs-attention' && reconciliation.data.canNudge === true;
  const hasTasks = evidence.data?.artifacts.some((artifact) => artifact.path.endsWith('tasks.md')) === true;
  const jiraAvailable = atlassianStatus === 'ok' && hasTasks && request !== undefined;
  const jiraDisabledReason = atlassianStatus !== 'ok'
    ? 'Atlassian auth required'
    : !hasTasks
      ? 'tasks.md required'
      : undefined;

  return (
    <ReviewStep
      evidence={evidence.data}
      loading={evidence.isFetching}
      error={evidence.error !== undefined ? 'Unable to load review evidence.' : undefined}
      nudgeControl={<NudgeButton
        canNudge={canNudge}
        step="review"
        onNudge={async () => {
          if (request === undefined) {
            return { result: 'rejected', message: 'No repository is selected' };
          }
          return nudgeResult(await nudgeManifest(request).unwrap());
        }}
      />}
      auditSummary={auditSummary(audit.data)}
      onArtifactOpen={(path) => dispatch(artifactViewerOpened({ path, origin: 'review' }))}
      jiraAvailable={jiraAvailable}
      jiraDisabledReason={jiraDisabledReason}
      onSendToJira={async () => {
        if (request === undefined) return;
        try {
          const parsed = parseRendererJiraDryRunPreview(await window.concierge.jiraSubmission!.dryRun(request));
          if (!parsed.ok) {
            throw new Error(parsed.error.message);
          }
          dispatch(jiraDryRunPreviewLoaded(parsed.value));
          dispatch(modalOpened('showJiraSubmission'));
        } catch {
          dispatch(toastShown({ level: 'error', message: 'Unable to prepare JIRA dry-run preview.' }));
        }
      }}
    />
  );
};
