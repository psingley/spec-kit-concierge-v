import type { ConciergeStepCommit, StepContractResult } from '../domain/factories/types';
import type { commitWithTrailer as defaultCommitWithTrailer } from '../data-layer/git/gitCommand';
import type { StepName } from './manifest';
import type { AuthStatusSlot, McpConfigSlot } from './prerequisites';

export type StepPhase = 'before' | 'after';

export type StepLifecycleEventName =
  | 'step-before-hook-start'
  | 'step-before-hook-end'
  | 'step-pending'
  | 'step-prompt-issued'
  | 'step-prompt-complete'
  | 'step-after-hook-start'
  | 'step-after-hook-end'
  | 'step-commit-written'
  | 'step-complete'
  | 'step-escape-hatch-triggered'
  | 'workspace-dirty-resume'
  | 'agent-manifest-drift'
  | 'hang-suspected';

export type StepEscapeHatchReason =
  | 'prerequisite-missing'
  | 'auth-unavailable'
  | 'mcp-unavailable'
  | 'factory-rejected'
  | 'hook-failed'
  | 'git-commit-failed'
  | 'marker-write-failed'
  | 'marker-read-failed'
  | 'marker-remove-failed'
  | 'clarify-malformed'
  | 'clarify-rigor-exhausted'
  | 'agent-manifest-drift';

export type StepLifecycleEvent = {
  event: StepLifecycleEventName;
  step: StepName;
  sessionId: string;
  latencyMs?: number;
  reason?: string;
  trailer?: string;
};

export type TrailerReader = () => Promise<Array<{ step: StepName; status: string }>>;

export type StepHookContext = {
  repositoryPath: string;
  featureDir: string;
  sessionId: string;
  userDataPath: string;
  hookName?: string;
  contextFilePath?: string;
  authStatus?: AuthStatusSlot;
  mcpConfig?: McpConfigSlot;
  readTrailers?: TrailerReader;
  writeInFlightMarker?: (sessionId: string, step: StepName) => Promise<void>;
  removeInFlightMarker?: (sessionId: string, step: StepName) => Promise<void>;
  validateArtifacts?: (featureDir: string, context: StepHookContext) => Promise<StepContractResult>;
  commitWithTrailer?: typeof defaultCommitWithTrailer;
  activitySink?: (event: StepLifecycleEvent) => void | Promise<void>;
  now?: () => Date;
};

export type StepHookResult =
  | {
      ok: true;
      phase: StepPhase;
      step: StepName;
      lifecycleAction?: 'pending' | 'complete';
      commit?: ConciergeStepCommit & { commitSha?: string };
      event?: StepLifecycleEvent;
    }
  | {
      ok: false;
      phase: StepPhase;
      step: StepName;
      escapeHatchReason: StepEscapeHatchReason;
      failureReason?: string;
      strandedArtifacts?: string[];
      error?: unknown;
    };

export type StepHook = (context: StepHookContext) => Promise<StepHookResult>;

export const lifecycleEvent = (
  event: StepLifecycleEventName,
  step: StepName,
  context: Pick<StepHookContext, 'sessionId'>,
  extra: Omit<StepLifecycleEvent, 'event' | 'step' | 'sessionId'> = {}
): StepLifecycleEvent => ({
  event,
  step,
  sessionId: context.sessionId,
  ...extra
});
