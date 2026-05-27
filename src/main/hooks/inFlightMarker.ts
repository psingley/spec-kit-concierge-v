import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { safeWrite } from '../data-layer/fs/safeWrite';
import { createMainLogger } from '../logging';
import { STEP_ARTIFACT_MANIFEST, type StepName } from './manifest';

export type InFlightMarker = {
  step: StepName;
  startedAt: string;
  sessionId: string;
  expectedArtifacts: string[];
};

export type InFlightMarkerRequest = InFlightMarker & {
  userDataPath: string;
};

export type MarkerPathRequest = {
  userDataPath: string;
  sessionId: string;
  step: StepName;
};

export const markerPath = ({ userDataPath, sessionId, step }: MarkerPathRequest): string =>
  path.join(userDataPath, 'in-flight', sessionId, `${step}.marker`);

export const writeInFlightMarker = async (request: InFlightMarkerRequest): Promise<void> => {
  await safeWrite(
    {
      targetPath: markerPath(request),
      contents: JSON.stringify({
        step: request.step,
        startedAt: request.startedAt,
        sessionId: request.sessionId,
        expectedArtifacts: request.expectedArtifacts
      }),
      stepContext: { stepId: request.step, label: 'in-flight marker' }
    },
    createMainLogger({ userDataPath: request.userDataPath })
  );
};

const parseMarker = (value: unknown, expected: MarkerPathRequest): InFlightMarker => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('InvalidInFlightMarker');
  }
  const record = value as Record<string, unknown>;
  if (
    record.step !== expected.step ||
    record.sessionId !== expected.sessionId ||
    typeof record.startedAt !== 'string' ||
    !Array.isArray(record.expectedArtifacts) ||
    !record.expectedArtifacts.every((artifact) => typeof artifact === 'string')
  ) {
    throw new Error('InvalidInFlightMarker');
  }

  return {
    step: expected.step,
    sessionId: expected.sessionId,
    startedAt: record.startedAt,
    expectedArtifacts: record.expectedArtifacts
  };
};

export const readInFlightMarker = async (request: MarkerPathRequest): Promise<InFlightMarker> => {
  const contents = await readFile(markerPath(request), 'utf8');
  return parseMarker(JSON.parse(contents), request);
};

export const removeInFlightMarker = async (request: MarkerPathRequest): Promise<void> => {
  await rm(markerPath(request), { force: false });
};

export const defaultExpectedArtifacts = (step: StepName): string[] => [
  ...STEP_ARTIFACT_MANIFEST[step].requiredFiles,
  ...STEP_ARTIFACT_MANIFEST[step].optionalFiles
];
