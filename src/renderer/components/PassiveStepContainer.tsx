import React from 'react';
import { copilotPassiveApi } from '../api/copilotPassive.endpoint';
import { sessionManifestApi } from '../api/sessionManifest.endpoint';
import { useAppDispatch, useAppSelector } from '../hooks/store';
import { selectPreferencesSelectedCopilotModel } from '../slices/preferences.selectors';
import type { PassiveStepName } from '../slices/session';
import { selectSessionPassiveStep } from '../slices/session.selectors';
import { selectWorkspaceBranch, selectWorkspaceSelectedRepo } from '../slices/workspace.selectors';
import { PassiveStep } from './PassiveStep';
import { workspaceStepViewed } from '../slices/workspace';
import { stepOrder, type StepName } from '../slices/steps';
import { NudgeButton, type NudgeButtonResult } from './NudgeButton';
import { artifactViewerOpened } from '../slices/ui';

const stepLabel: Record<StepName, string> = {
  specify: 'Specify',
  clarify: 'Clarify',
  plan: 'Plan',
  tasks: 'Tasks',
  analyze: 'Analyze',
  review: 'Review'
};

const nextStepAfter = (step: StepName): StepName => {
  const index = stepOrder.indexOf(step);
  return stepOrder[Math.min(index + 1, stepOrder.length - 1)] ?? 'review';
};

const textField = (value: Record<string, unknown>, field: string): string | undefined =>
  typeof value[field] === 'string' ? value[field] : undefined;

const auditSummary = (payload: Record<string, unknown> | undefined, step: StepName): string[] => {
  const audit = payload?.audit;
  if (!Array.isArray(audit)) return [];
  return audit.flatMap((item) => {
    if (typeof item !== 'object' || item === null) return [];
    const record = item as Record<string, unknown>;
    const recordStep = textField(record, 'step');
    if (recordStep !== undefined && recordStep !== step) return [];
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

export const PassiveStepContainer = ({ step }: { step: PassiveStepName }): React.ReactElement => {
  const repo = useAppSelector(selectWorkspaceSelectedRepo);
  const dispatch = useAppDispatch();
  const branch = useAppSelector(selectWorkspaceBranch);
  const modelId = useAppSelector(selectPreferencesSelectedCopilotModel);
  const record = useAppSelector(selectSessionPassiveStep(step));
  const [runPassiveStep] = copilotPassiveApi.useRunPassiveStepMutation();
  const manifestRequest = repo === null ? undefined : { repositoryPath: repo.path };
  const reconciliation = sessionManifestApi.useReconcileSessionManifestQuery(manifestRequest!, { skip: manifestRequest === undefined });
  const audit = sessionManifestApi.useGetAuditTrailQuery(manifestRequest!, { skip: manifestRequest === undefined });
  const [nudgeManifest] = sessionManifestApi.useNudgeSessionManifestMutation();
  const resumeStep = nextStepAfter(step);
  const reconciledStep = reconciliation.data === undefined ? undefined : textField(reconciliation.data, 'step');
  const canNudge = reconciliation.data?.status === 'needs-attention' && reconciliation.data.canNudge === true && reconciledStep === step;

  return (
    <PassiveStep
      step={step}
      record={record}
      viewOnly={record.commitSha !== null}
      resumeLabel={stepLabel[resumeStep]}
      nudgeControl={<NudgeButton
        canNudge={canNudge}
        step={step}
        onNudge={async () => {
          if (manifestRequest === undefined) {
            return { result: 'rejected', message: 'No repository is selected' };
          }
          return nudgeResult(await nudgeManifest(manifestRequest).unwrap());
        }}
      />}
      auditSummary={auditSummary(audit.data, step)}
      onResume={() => dispatch(workspaceStepViewed(resumeStep))}
      onRun={() => {
        if (record.commitSha !== null) {
          return;
        }
        if (repo !== null && branch !== null) {
          void runPassiveStep({ step, repositoryPath: repo.path, branch, modelId });
        }
      }}
      onArtifactOpen={(path) => dispatch(artifactViewerOpened({ path, origin: 'passive' }))}
    />
  );
};
