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
        // A new (detached) session has no branch yet — spec-kit names it during
        // this very run (ADR-0016), so we must NOT gate on branch. The branch
        // field is informational only (no longer drives GIT_BRANCH_NAME); fall
        // back to the repo's default branch when unknown.
        if (repo !== null) {
          void runSpecify({ repositoryPath: repo.path, branch: branch ?? repo.defaultBranch, prompt, modelId });
        }
      }}
    />
  );
};
