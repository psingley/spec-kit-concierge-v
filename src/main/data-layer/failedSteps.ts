import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { safeWrite } from './fs/safeWrite';
import { createMainLogger } from '../logging';

export const failedStepNames = ['specify', 'clarify', 'plan', 'tasks', 'analyze', 'review'] as const;
export type FailedStepName = typeof failedStepNames[number];

export type FailedStepRecord = {
  step: FailedStepName;
  sessionId: string;
  failedAt: string;
  reason: string;
  strandedArtifacts: string[];
};

export type RestoredStepFailures = Partial<Record<FailedStepName, FailedStepRecord>>;

export type FailedStepMarkerRequest = {
  repositoryPath: string;
  step: FailedStepName;
};

export type WriteFailedStepMarkerRequest = FailedStepMarkerRequest & {
  userDataPath: string;
  sessionId: string;
  failedAt: string;
  reason: string;
  strandedArtifacts?: string[];
};

export const failedStepMarkerPath = ({ repositoryPath, step }: FailedStepMarkerRequest): string =>
  path.join(repositoryPath, '.specify', 'concierge', 'failed-steps', `${step}.json`);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseFailedStepRecord = (value: unknown, expectedStep: FailedStepName): FailedStepRecord => {
  if (!isRecord(value)) {
    throw new Error('InvalidFailedStepMarker');
  }
  if (
    value.step !== expectedStep ||
    typeof value.sessionId !== 'string' ||
    typeof value.failedAt !== 'string' ||
    typeof value.reason !== 'string' ||
    !Array.isArray(value.strandedArtifacts) ||
    !value.strandedArtifacts.every((artifact) => typeof artifact === 'string')
  ) {
    throw new Error('InvalidFailedStepMarker');
  }

  return {
    step: expectedStep,
    sessionId: value.sessionId,
    failedAt: value.failedAt,
    reason: value.reason,
    strandedArtifacts: value.strandedArtifacts
  };
};

export const writeFailedStepMarker = async (request: WriteFailedStepMarkerRequest): Promise<void> => {
  await safeWrite(
    {
      targetPath: failedStepMarkerPath(request),
      contents: JSON.stringify({
        step: request.step,
        sessionId: request.sessionId,
        failedAt: request.failedAt,
        reason: request.reason,
        strandedArtifacts: request.strandedArtifacts ?? []
      }),
      stepContext: { stepId: request.step, label: 'failed-step marker' }
    },
    createMainLogger({ userDataPath: request.userDataPath })
  );
};

export const readFailedStepMarker = async (
  request: FailedStepMarkerRequest
): Promise<FailedStepRecord | undefined> => {
  try {
    const contents = await readFile(failedStepMarkerPath(request), 'utf8');
    return parseFailedStepRecord(JSON.parse(contents), request.step);
  } catch {
    return undefined;
  }
};

export const readFailedStepMarkers = async (repositoryPath: string): Promise<RestoredStepFailures> => {
  const failures: RestoredStepFailures = {};
  for (const step of failedStepNames) {
    const marker = await readFailedStepMarker({ repositoryPath, step });
    if (marker !== undefined) {
      failures[step] = marker;
    }
  }
  return failures;
};

export const removeFailedStepMarker = async (request: FailedStepMarkerRequest): Promise<void> => {
  await rm(failedStepMarkerPath(request), { force: true });
};
