import React, { useState } from 'react';
import { artifactsApi } from '../api/artifacts.endpoint';
import { copilotPassiveApi } from '../api/copilotPassive.endpoint';
import { tasksDetailApi } from '../api/tasksDetail.endpoint';
import { useAppDispatch, useAppSelector } from '../hooks/store';
import { selectPreferencesSelectedCopilotModel } from '../slices/preferences.selectors';
import type { PassiveStepName } from '../slices/session';
import { selectSessionPassiveStep } from '../slices/session.selectors';
import { selectWorkspaceBranch, selectWorkspaceSelectedRepo } from '../slices/workspace.selectors';
import { PassiveStep } from './PassiveStep';
import { workspaceStepViewed } from '../slices/workspace';

export const PassiveStepContainer = ({ step }: { step: PassiveStepName }): React.ReactElement => {
  const repo = useAppSelector(selectWorkspaceSelectedRepo);
  const dispatch = useAppDispatch();
  const branch = useAppSelector(selectWorkspaceBranch);
  const modelId = useAppSelector(selectPreferencesSelectedCopilotModel);
  const record = useAppSelector(selectSessionPassiveStep(step));
  const [artifactPath, setArtifactPath] = useState<string | null>(null);
  const [runPassiveStep] = copilotPassiveApi.useRunPassiveStepMutation();
  const [readArtifact, artifact] = artifactsApi.useLazyReadArtifactQuery();
  const [readTasksDetail, tasksDetail] = tasksDetailApi.useLazyGetTasksDetailQuery();
  const isTasksArtifact = artifactPath?.endsWith('tasks.md') ?? false;

  return (
    <PassiveStep
      step={step}
      record={record}
      artifactPath={artifactPath}
      artifactText={isTasksArtifact ? '' : artifact.data?.text ?? ''}
      artifactLoading={isTasksArtifact ? tasksDetail.isFetching : artifact.isFetching}
      artifactError={(isTasksArtifact ? tasksDetail.error : artifact.error) !== undefined ? 'Unable to read artifact.' : undefined}
      artifactTasks={tasksDetail.data?.tasks ?? []}
      viewOnly={record.commitSha !== null}
      resumeLabel="Review"
      onResume={() => dispatch(workspaceStepViewed('review'))}
      onRun={() => {
        if (repo !== null && branch !== null) {
          void runPassiveStep({ step, repositoryPath: repo.path, branch, modelId });
        }
      }}
      onArtifactOpen={(path) => {
        setArtifactPath(path);
        if (repo !== null) {
          // The IPC resolves the feature dir from .specify/feature.json; the renderer
          // passes the worktree root + a bare artifact name (e.g. plan.md).
          if (path.endsWith('tasks.md')) {
            void readTasksDetail({ repositoryPath: repo.path, artifactPath: path });
          } else {
            void readArtifact({ repositoryPath: repo.path, artifactPath: path });
          }
        }
      }}
      onArtifactClose={() => setArtifactPath(null)}
    />
  );
};
