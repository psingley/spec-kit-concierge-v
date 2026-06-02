import React, { useMemo, useState } from 'react';
import { artifactsApi } from '../api/artifacts.endpoint';
import { reviewEvidenceApi } from '../api/reviewEvidence.endpoint';
import { sessionManifestApi } from '../api/sessionManifest.endpoint';
import { tasksDetailApi } from '../api/tasksDetail.endpoint';
import { useAppSelector } from '../hooks/store';
import { selectWorkspaceSelectedRepo } from '../slices/workspace.selectors';
import { NudgeButton, type NudgeButtonResult } from './NudgeButton';
import { ReviewStep } from './ReviewStep';

const isAbsoluteArtifactPath = (value: string): boolean =>
  value.startsWith('/') || /^[A-Za-z]:[\\/]/.test(value) || value.startsWith('\\\\');

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
  const [artifactPath, setArtifactPath] = useState<string | null>(null);
  // The IPC resolves the feature dir from .specify/feature.json; the renderer only
  // supplies the worktree root.
  const request = useMemo(() => repo === null ? undefined : {
    repositoryPath: repo.path
  }, [repo]);
  const evidence = reviewEvidenceApi.useGetReviewEvidenceQuery(request!, { skip: request === undefined });
  const reconciliation = sessionManifestApi.useReconcileSessionManifestQuery(request!, { skip: request === undefined });
  const audit = sessionManifestApi.useGetAuditTrailQuery(request!, { skip: request === undefined });
  const [nudgeManifest] = sessionManifestApi.useNudgeSessionManifestMutation();
  const [readArtifact, artifact] = artifactsApi.useLazyReadArtifactQuery();
  const [readReviewEvidenceBody, reviewEvidenceBody] = reviewEvidenceApi.useLazyReadReviewEvidenceBodyQuery();
  const [readTasksDetail, tasksDetail] = tasksDetailApi.useLazyGetTasksDetailQuery();
  const isTasksArtifact = artifactPath?.endsWith('tasks.md') ?? false;
  const isAppOwnedArtifact = artifactPath === null ? false : isAbsoluteArtifactPath(artifactPath);
  const canNudge = reconciliation.data?.status === 'needs-attention' && reconciliation.data.canNudge === true;

  return (
    <ReviewStep
      evidence={evidence.data}
      loading={evidence.isFetching}
      error={evidence.error !== undefined ? 'Unable to load review evidence.' : undefined}
      artifactPath={artifactPath}
      artifactText={isTasksArtifact ? '' : isAppOwnedArtifact ? reviewEvidenceBody.data?.text ?? '' : artifact.data?.text ?? ''}
      artifactLoading={isTasksArtifact ? tasksDetail.isFetching : isAppOwnedArtifact ? reviewEvidenceBody.isFetching : artifact.isFetching}
      artifactError={(isTasksArtifact ? tasksDetail.error : isAppOwnedArtifact ? reviewEvidenceBody.error : artifact.error) !== undefined ? 'Unable to read artifact.' : undefined}
      artifactTasks={tasksDetail.data?.tasks ?? []}
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
      onArtifactOpen={(path) => {
        setArtifactPath(path);
        if (request !== undefined) {
          if (path.endsWith('tasks.md')) {
            void readTasksDetail({ repositoryPath: request.repositoryPath, artifactPath: path });
          } else if (isAbsoluteArtifactPath(path)) {
            void readReviewEvidenceBody({ ...request, artifactPath: path });
          } else {
            void readArtifact({ repositoryPath: request.repositoryPath, artifactPath: path });
          }
        }
      }}
      onArtifactClose={() => setArtifactPath(null)}
    />
  );
};
