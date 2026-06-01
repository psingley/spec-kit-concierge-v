import React, { useMemo, useState } from 'react';
import { artifactsApi } from '../api/artifacts.endpoint';
import { reviewEvidenceApi } from '../api/reviewEvidence.endpoint';
import { tasksDetailApi } from '../api/tasksDetail.endpoint';
import { useAppSelector } from '../hooks/store';
import { selectWorkspaceSelectedRepo } from '../slices/workspace.selectors';
import { ReviewStep } from './ReviewStep';

export const ReviewStepContainer = (): React.ReactElement => {
  const repo = useAppSelector(selectWorkspaceSelectedRepo);
  const [artifactPath, setArtifactPath] = useState<string | null>(null);
  // The IPC resolves the feature dir from .specify/feature.json; the renderer only
  // supplies the worktree root.
  const request = useMemo(() => repo === null ? undefined : {
    repositoryPath: repo.path
  }, [repo]);
  const evidence = reviewEvidenceApi.useGetReviewEvidenceQuery(request!, { skip: request === undefined });
  const [readArtifact, artifact] = artifactsApi.useLazyReadArtifactQuery();
  const [readReviewEvidenceBody, reviewEvidenceBody] = reviewEvidenceApi.useLazyReadReviewEvidenceBodyQuery();
  const [readTasksDetail, tasksDetail] = tasksDetailApi.useLazyGetTasksDetailQuery();
  const isTasksArtifact = artifactPath?.endsWith('tasks.md') ?? false;
  const isAppOwnedArtifact = artifactPath?.startsWith('/') ?? false;

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
      onArtifactOpen={(path) => {
        setArtifactPath(path);
        if (request !== undefined) {
          if (path.endsWith('tasks.md')) {
            void readTasksDetail({ repositoryPath: request.repositoryPath, artifactPath: path });
          } else if (path.startsWith('/')) {
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
