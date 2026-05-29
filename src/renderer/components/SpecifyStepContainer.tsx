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
import { toastShown } from '../slices/ui';
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
      onBegin={async () => {
        if (repo === null || branch === null) return;
        try {
          const result = await runSpecify({ repositoryPath: repo.path, branch, prompt, modelId }).unwrap();
          if (!result) {
            console.error('[specify] runSpecify returned no result');
          }
        } catch (error) {
          const msg = error instanceof Error
            ? error.message
            : typeof error === 'object' && error !== null && 'data' in error
              ? (error as { data?: { message?: string } }).data?.message ?? JSON.stringify(error)
              : String(error);
          console.error('[specify] begin failed:', msg, error);
          dispatch(toastShown({ level: 'error', message: `Specify failed: ${msg}` }));
        }
      }}
    />
  );
};
