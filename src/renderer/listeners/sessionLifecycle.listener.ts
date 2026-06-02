import type { AppStartListening, ListenerTopicDescriptor } from './types';

export type ReconciledManifestProjectionInput = {
  step: string;
  status: string;
  canNudge: boolean;
  audit?: Array<{ event: string; message?: string }>;
};

export type ReconciledManifestProjection = {
  step: string;
  rendererStatus: string;
  canNudge: boolean;
  auditSummary: Array<{ event: string; message?: string }>;
  authoritative: false;
};

export const sessionLifecycleTopic: ListenerTopicDescriptor = {
  topic: 'sessionLifecycle',
  owns: 'session, model, and mode lifecycle coordination'
};

export const projectReconciledManifestState = (
  input: ReconciledManifestProjectionInput
): ReconciledManifestProjection => ({
  step: input.step,
  rendererStatus: input.status,
  canNudge: input.canNudge,
  auditSummary: input.audit ?? [],
  authoritative: false
});

export const setupSessionLifecycleListener = (startListening: AppStartListening): void => {
  void startListening;
};
