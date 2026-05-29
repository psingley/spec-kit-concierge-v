import React, { useState } from 'react';
import { artifactsApi } from '../api/artifacts.endpoint';
import { copilotPassiveApi } from '../api/copilotPassive.endpoint';
import { useAppSelector } from '../hooks/store';
import { selectPreferencesSelectedCopilotModel } from '../slices/preferences.selectors';
import type { PassiveStepName } from '../slices/session';
import { selectSessionPassiveStep } from '../slices/session.selectors';
import { selectWorkspaceBranch, selectWorkspaceSelectedRepo } from '../slices/workspace.selectors';
import { PassiveStep } from './PassiveStep';

export const PassiveStepContainer = ({ step }: { step: PassiveStepName }): React.ReactElement => {
  const repo = useAppSelector(selectWorkspaceSelectedRepo);
  const branch = useAppSelector(selectWorkspaceBranch);
  const modelId = useAppSelector(selectPreferencesSelectedCopilotModel);
  const record = useAppSelector(selectSessionPassiveStep(step));
  const [artifactPath, setArtifactPath] = useState<string | null>(null);
  const [runPassiveStep] = copilotPassiveApi.useRunPassiveStepMutation();
  const [readArtifact, artifact] = artifactsApi.useLazyReadArtifactQuery();

  return (
    <PassiveStep
      step={step}
      record={record}
      artifactPath={artifactPath}
      artifactText={artifact.data?.text ?? ''}
      artifactLoading={artifact.isFetching}
      artifactError={artifact.error !== undefined ? 'Unable to read artifact.' : undefined}
      onRun={() => {
        if (repo !== null && branch !== null) {
          void runPassiveStep({ step, repositoryPath: repo.path, branch, modelId });
        }
      }}
      onArtifactOpen={(path) => {
        setArtifactPath(path);
        if (repo !== null) {
          void readArtifact({ repositoryPath: repo.path, artifactPath: path });
        }
      }}
      onArtifactClose={() => setArtifactPath(null)}
    />
  );
};
