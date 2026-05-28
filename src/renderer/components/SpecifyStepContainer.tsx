import React from 'react';
import { copilotSpecifyApi } from '../api/copilotSpecify.endpoint';
import { useAppDispatch, useAppSelector } from '../hooks/store';
import { selectPreferencesRequireScrollToUnlock, selectPreferencesSelectedCopilotModel } from '../slices/preferences.selectors';
import { specifyPromptChanged } from '../slices/session';
import {
  selectSessionCanBeginSpecify,
  selectSessionFailureReason,
  selectSessionSpecMarkdown,
  selectSessionSpecifyPrompt,
  selectSessionSpecifyRunning
} from '../slices/session.selectors';
import { selectWorkspaceBranch, selectWorkspaceSelectedRepo } from '../slices/workspace.selectors';
import { SpecifyStep } from './SpecifyStep';

export const SpecifyStepContainer = (): React.ReactElement => {
  const dispatch = useAppDispatch();
  const repo = useAppSelector(selectWorkspaceSelectedRepo);
  const branch = useAppSelector(selectWorkspaceBranch);
  const prompt = useAppSelector(selectSessionSpecifyPrompt);
  const modelId = useAppSelector(selectPreferencesSelectedCopilotModel);
  const [runSpecify] = copilotSpecifyApi.useRunSpecifyMutation();
  return (
    <SpecifyStep
      prompt={prompt}
      running={useAppSelector(selectSessionSpecifyRunning)}
      specMarkdown={useAppSelector(selectSessionSpecMarkdown)}
      failureReason={useAppSelector(selectSessionFailureReason)}
      canBegin={useAppSelector(selectSessionCanBeginSpecify)}
      requireScroll={useAppSelector(selectPreferencesRequireScrollToUnlock)}
      onPromptChange={(value) => dispatch(specifyPromptChanged(value))}
      onBegin={() => {
        if (repo !== null && branch !== null) {
          void runSpecify({ repositoryPath: repo.path, branch, prompt, modelId });
        }
      }}
    />
  );
};
