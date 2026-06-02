import {
  ANOMALY_KINDS,
  ANOMALY_SEVERITIES,
  ASSISTANT_IDENTITY_SOURCES,
  DOCTOR_INVOCATION_RESULTS,
  DOCTOR_TOOLS,
  INTERVENTION_RESULTS,
  INTERVENTION_TOOLS,
  NUDGE_RESULTS,
  SESSION_MANIFEST_SCHEMA,
  STEP_ATTEMPT_STATUSES,
  TERMINAL_RESULT_KINDS,
  type Anomaly,
  type AssistantIdentity,
  type AuditRecord,
  type BranchStateSnapshot,
  type CompletionEvidence,
  type DoctorToolInvocation,
  type Intervention,
  type LogReference,
  type NudgeRequest,
  type SessionManifestV1,
  type SpawnRecipe,
  type StepAttempt,
  type StepAttemptStatus,
  type StepName,
  type StepOwnedArtifactPath,
  type StepOwnedArtifactSnapshot,
  type TerminalResult
} from './types';
import {
  invalid,
  type ManifestFactoryResult,
  rejectUnknownKeys,
  requireArray,
  requireIsoTimestamp,
  requireNonEmptyString,
  requireRecord,
  requireStepName
} from './factoryUtils';

type ErrorName = 'InvalidSessionManifest';

const topLevelKeys = [
  'schema',
  'sessionId',
  'featureDir',
  'branch',
  'createdAt',
  'updatedAt',
  'currentStep',
  'attempts',
  'anomalies',
  'interventions',
  'doctorInvocations',
  'nudgeRequests',
  'audit'
] as const;

const isOneOf = <Values extends readonly string[]>(values: Values, value: unknown): value is Values[number] =>
  typeof value === 'string' && values.includes(value);

const requireNumber = (
  value: unknown,
  path: string
): ManifestFactoryResult<number, ErrorName> =>
  typeof value === 'number' && Number.isFinite(value)
    ? { ok: true, value }
    : invalid('InvalidSessionManifest', 'must be a finite number', path);

const optionalString = (value: unknown, path: string): ManifestFactoryResult<string | undefined, ErrorName> => {
  if (value === undefined) return { ok: true, value: undefined };
  return requireNonEmptyString(value, 'InvalidSessionManifest', path);
};

const optionalNumber = (value: unknown, path: string): ManifestFactoryResult<number | undefined, ErrorName> => {
  if (value === undefined) return { ok: true, value: undefined };
  return requireNumber(value, path);
};

const requireStringArray = (
  value: unknown,
  path: string
): ManifestFactoryResult<string[], ErrorName> =>
  requireArray(value, 'InvalidSessionManifest', path, (item, itemPath) =>
    requireNonEmptyString(item, 'InvalidSessionManifest', itemPath)
  );

const parseBranchStateSnapshot = (
  value: unknown,
  path: string
): ManifestFactoryResult<BranchStateSnapshot, ErrorName> => {
  const root = requireRecord(value, 'InvalidSessionManifest', path);
  if (!root.ok) return root;
  const keys = rejectUnknownKeys(root.value, ['branch', 'headSha', 'statusPorcelain', 'trackedChanges', 'timestamp'], 'InvalidSessionManifest', path);
  if (!keys.ok) return keys;

  const branch = requireNonEmptyString(root.value.branch, 'InvalidSessionManifest', `${path}.branch`);
  const headSha = requireNonEmptyString(root.value.headSha, 'InvalidSessionManifest', `${path}.headSha`);
  const statusPorcelain = typeof root.value.statusPorcelain === 'string'
    ? { ok: true, value: root.value.statusPorcelain } as const
    : invalid('InvalidSessionManifest', 'must be a string', `${path}.statusPorcelain`);
  const trackedChanges = requireStringArray(root.value.trackedChanges, `${path}.trackedChanges`);
  const timestamp = requireIsoTimestamp(root.value.timestamp, 'InvalidSessionManifest', `${path}.timestamp`);
  if (!branch.ok) return branch;
  if (!headSha.ok) return headSha;
  if (!statusPorcelain.ok) return statusPorcelain;
  if (!trackedChanges.ok) return trackedChanges;
  if (!timestamp.ok) return timestamp;

  return {
    ok: true,
    value: {
      branch: branch.value,
      headSha: headSha.value,
      statusPorcelain: statusPorcelain.value,
      trackedChanges: trackedChanges.value,
      timestamp: timestamp.value
    }
  };
};

const parseArtifactPath = (
  value: unknown,
  path: string
): ManifestFactoryResult<StepOwnedArtifactPath, ErrorName> => {
  const root = requireRecord(value, 'InvalidSessionManifest', path);
  if (!root.ok) return root;
  const keys = rejectUnknownKeys(root.value, ['path', 'required', 'present', 'sha256', 'sizeBytes', 'mtimeMs'], 'InvalidSessionManifest', path);
  if (!keys.ok) return keys;

  const artifactPath = requireNonEmptyString(root.value.path, 'InvalidSessionManifest', `${path}.path`);
  const sha256 = optionalString(root.value.sha256, `${path}.sha256`);
  const sizeBytes = optionalNumber(root.value.sizeBytes, `${path}.sizeBytes`);
  const mtimeMs = optionalNumber(root.value.mtimeMs, `${path}.mtimeMs`);
  if (!artifactPath.ok) return artifactPath;
  if (typeof root.value.required !== 'boolean') return invalid('InvalidSessionManifest', 'must be a boolean', `${path}.required`);
  if (typeof root.value.present !== 'boolean') return invalid('InvalidSessionManifest', 'must be a boolean', `${path}.present`);
  if (!sha256.ok) return sha256;
  if (!sizeBytes.ok) return sizeBytes;
  if (!mtimeMs.ok) return mtimeMs;

  return {
    ok: true,
    value: {
      path: artifactPath.value,
      required: root.value.required,
      present: root.value.present,
      ...(sha256.value === undefined ? {} : { sha256: sha256.value }),
      ...(sizeBytes.value === undefined ? {} : { sizeBytes: sizeBytes.value }),
      ...(mtimeMs.value === undefined ? {} : { mtimeMs: mtimeMs.value })
    }
  };
};

const parseArtifactSnapshot = (
  value: unknown,
  path: string
): ManifestFactoryResult<StepOwnedArtifactSnapshot, ErrorName> => {
  const root = requireRecord(value, 'InvalidSessionManifest', path);
  if (!root.ok) return root;
  const keys = rejectUnknownKeys(root.value, ['step', 'featureDir', 'paths', 'snapshotHash', 'capturedAt'], 'InvalidSessionManifest', path);
  if (!keys.ok) return keys;

  const step = requireStepName(root.value.step, 'InvalidSessionManifest', `${path}.step`);
  const featureDir = requireNonEmptyString(root.value.featureDir, 'InvalidSessionManifest', `${path}.featureDir`);
  const paths = requireArray(root.value.paths, 'InvalidSessionManifest', `${path}.paths`, parseArtifactPath);
  const snapshotHash = requireNonEmptyString(root.value.snapshotHash, 'InvalidSessionManifest', `${path}.snapshotHash`);
  const capturedAt = requireIsoTimestamp(root.value.capturedAt, 'InvalidSessionManifest', `${path}.capturedAt`);
  if (!step.ok) return step;
  if (!featureDir.ok) return featureDir;
  if (!paths.ok) return paths;
  if (!snapshotHash.ok) return snapshotHash;
  if (!capturedAt.ok) return capturedAt;

  return { ok: true, value: { step: step.value, featureDir: featureDir.value, paths: paths.value, snapshotHash: snapshotHash.value, capturedAt: capturedAt.value } };
};

const parseCompletionEvidence = (
  value: unknown,
  path: string,
  step: StepName
): ManifestFactoryResult<CompletionEvidence, ErrorName> => {
  const root = requireRecord(value, 'InvalidSessionManifest', path);
  if (!root.ok) return root;
  const keys = rejectUnknownKeys(root.value, ['commitSha', 'trailer', 'artifactSnapshot', 'adoptedFromHistory'], 'InvalidSessionManifest', path);
  if (!keys.ok) return keys;

  const commitSha = requireNonEmptyString(root.value.commitSha, 'InvalidSessionManifest', `${path}.commitSha`);
  const artifactSnapshot = parseArtifactSnapshot(root.value.artifactSnapshot, `${path}.artifactSnapshot`);
  if (!commitSha.ok) return commitSha;
  if (!artifactSnapshot.ok) return artifactSnapshot;
  if (root.value.trailer !== `Concierge-Step: ${step}:pass`) {
    return invalid('InvalidSessionManifest', 'completion trailer must match attempt step', `${path}.trailer`);
  }
  if (typeof root.value.adoptedFromHistory !== 'boolean') {
    return invalid('InvalidSessionManifest', 'must be a boolean', `${path}.adoptedFromHistory`);
  }

  return {
    ok: true,
    value: {
      commitSha: commitSha.value,
      trailer: `Concierge-Step: ${step}:pass`,
      artifactSnapshot: artifactSnapshot.value,
      adoptedFromHistory: root.value.adoptedFromHistory
    }
  };
};

const parseSpawnRecipe = (
  value: unknown,
  path: string,
  step: StepName
): ManifestFactoryResult<SpawnRecipe, ErrorName> => {
  const root = requireRecord(value, 'InvalidSessionManifest', path);
  if (!root.ok) return root;
  const keys = rejectUnknownKeys(root.value, ['command', 'args', 'cwd', 'environmentKeys'], 'InvalidSessionManifest', path);
  if (!keys.ok) return keys;
  if (root.value.command !== 'copilot') return invalid('InvalidSessionManifest', 'spawn command must be copilot', `${path}.command`);
  if (!Array.isArray(root.value.args) || root.value.args.length !== 9) {
    return invalid('InvalidSessionManifest', 'spawn args must match print-mode contract', `${path}.args`);
  }
  const [promptFlag, agentFlag, agent, outputFlag, outputFormat, sessionFlag, sessionId, logFlag, logDir] = root.value.args;
  if (
    promptFlag !== '-p' ||
    agentFlag !== '--agent' ||
    agent !== `speckit.${step}` ||
    outputFlag !== '--output-format' ||
    outputFormat !== 'json' ||
    sessionFlag !== '--session-id' ||
    typeof sessionId !== 'string' ||
    sessionId.length === 0 ||
    logFlag !== '--log-dir' ||
    typeof logDir !== 'string' ||
    logDir.length === 0
  ) {
    return invalid('InvalidSessionManifest', 'spawn args must match print-mode contract', `${path}.args`);
  }
  const cwd = requireNonEmptyString(root.value.cwd, 'InvalidSessionManifest', `${path}.cwd`);
  const environmentKeys = requireStringArray(root.value.environmentKeys, `${path}.environmentKeys`);
  if (!cwd.ok) return cwd;
  if (!environmentKeys.ok) return environmentKeys;

  return {
    ok: true,
    value: {
      command: 'copilot',
      args: ['-p', '--agent', `speckit.${step}`, '--output-format', 'json', '--session-id', sessionId, '--log-dir', logDir],
      cwd: cwd.value,
      environmentKeys: environmentKeys.value
    }
  };
};

const parseAssistantIdentity = (
  value: unknown,
  path: string
): ManifestFactoryResult<AssistantIdentity, ErrorName> => {
  const root = requireRecord(value, 'InvalidSessionManifest', path);
  if (!root.ok) return root;
  const keys = rejectUnknownKeys(root.value, ['assistantSessionId', 'messageId', 'turnId', 'source'], 'InvalidSessionManifest', path);
  if (!keys.ok) return keys;
  if (!isOneOf(ASSISTANT_IDENTITY_SOURCES, root.value.source)) {
    return invalid('InvalidSessionManifest', 'assistant source must be recognized', `${path}.source`);
  }
  const assistantSessionId = optionalString(root.value.assistantSessionId, `${path}.assistantSessionId`);
  const messageId = optionalString(root.value.messageId, `${path}.messageId`);
  const turnId = optionalString(root.value.turnId, `${path}.turnId`);
  if (!assistantSessionId.ok) return assistantSessionId;
  if (!messageId.ok) return messageId;
  if (!turnId.ok) return turnId;

  return {
    ok: true,
    value: {
      source: root.value.source,
      ...(assistantSessionId.value === undefined ? {} : { assistantSessionId: assistantSessionId.value }),
      ...(messageId.value === undefined ? {} : { messageId: messageId.value }),
      ...(turnId.value === undefined ? {} : { turnId: turnId.value })
    }
  };
};

const parseLogReference = (
  value: unknown,
  path: string
): ManifestFactoryResult<LogReference, ErrorName> => {
  const root = requireRecord(value, 'InvalidSessionManifest', path);
  if (!root.ok) return root;
  const keys = rejectUnknownKeys(root.value, ['path', 'sha256', 'sizeBytes'], 'InvalidSessionManifest', path);
  if (!keys.ok) return keys;

  const logPath = requireNonEmptyString(root.value.path, 'InvalidSessionManifest', `${path}.path`);
  const sha256 = requireNonEmptyString(root.value.sha256, 'InvalidSessionManifest', `${path}.sha256`);
  const sizeBytes = requireNumber(root.value.sizeBytes, `${path}.sizeBytes`);
  if (!logPath.ok) return logPath;
  if (!sha256.ok) return sha256;
  if (!sizeBytes.ok) return sizeBytes;

  return { ok: true, value: { path: logPath.value, sha256: sha256.value, sizeBytes: sizeBytes.value } };
};

const parseTerminalResult = (
  value: unknown,
  path: string
): ManifestFactoryResult<TerminalResult, ErrorName> => {
  const root = requireRecord(value, 'InvalidSessionManifest', path);
  if (!root.ok) return root;
  const keys = rejectUnknownKeys(root.value, ['exitCode', 'signal', 'resultKind', 'summary', 'rawEventChecksum'], 'InvalidSessionManifest', path);
  if (!keys.ok) return keys;
  const exitCode = requireNumber(root.value.exitCode, `${path}.exitCode`);
  const signal = optionalString(root.value.signal, `${path}.signal`);
  const summary = optionalString(root.value.summary, `${path}.summary`);
  const rawEventChecksum = optionalString(root.value.rawEventChecksum, `${path}.rawEventChecksum`);
  if (!exitCode.ok) return exitCode;
  if (!isOneOf(TERMINAL_RESULT_KINDS, root.value.resultKind)) {
    return invalid('InvalidSessionManifest', 'terminal result kind must be recognized', `${path}.resultKind`);
  }
  if (!signal.ok) return signal;
  if (!summary.ok) return summary;
  if (!rawEventChecksum.ok) return rawEventChecksum;

  return {
    ok: true,
    value: {
      exitCode: exitCode.value,
      resultKind: root.value.resultKind,
      ...(signal.value === undefined ? {} : { signal: signal.value }),
      ...(summary.value === undefined ? {} : { summary: summary.value }),
      ...(rawEventChecksum.value === undefined ? {} : { rawEventChecksum: rawEventChecksum.value })
    }
  };
};

const parseStepAttempt = (
  value: unknown,
  path: string
): ManifestFactoryResult<StepAttempt, ErrorName> => {
  const root = requireRecord(value, 'InvalidSessionManifest', path);
  if (!root.ok) return root;
  const keys = rejectUnknownKeys(root.value, ['attemptId', 'step', 'status', 'supersedesAttemptId', 'startedAt', 'endedAt', 'branchBefore', 'branchAfter', 'ownedPathSnapshot', 'completionEvidence', 'spawnRecipe', 'assistant', 'logReference', 'terminalResult', 'anomalyIds', 'interventionIds'], 'InvalidSessionManifest', path);
  if (!keys.ok) return keys;

  const attemptId = requireNonEmptyString(root.value.attemptId, 'InvalidSessionManifest', `${path}.attemptId`);
  const step = requireStepName(root.value.step, 'InvalidSessionManifest', `${path}.step`);
  if (!attemptId.ok) return attemptId;
  if (!step.ok) return step;
  if (!isOneOf(STEP_ATTEMPT_STATUSES, root.value.status)) {
    return invalid('InvalidSessionManifest', 'attempt status must be recognized', `${path}.status`);
  }
  const status: StepAttemptStatus = root.value.status;
  const supersedesAttemptId = optionalString(root.value.supersedesAttemptId, `${path}.supersedesAttemptId`);
  const startedAt = requireIsoTimestamp(root.value.startedAt, 'InvalidSessionManifest', `${path}.startedAt`);
  const endedAt = root.value.endedAt === undefined ? { ok: true, value: undefined } as const : requireIsoTimestamp(root.value.endedAt, 'InvalidSessionManifest', `${path}.endedAt`);
  const branchBefore = parseBranchStateSnapshot(root.value.branchBefore, `${path}.branchBefore`);
  const branchAfter = root.value.branchAfter === undefined ? { ok: true, value: undefined } as const : parseBranchStateSnapshot(root.value.branchAfter, `${path}.branchAfter`);
  const ownedPathSnapshot = parseArtifactSnapshot(root.value.ownedPathSnapshot, `${path}.ownedPathSnapshot`);
  const completion = root.value.completionEvidence === undefined ? { ok: true, value: undefined } as const : parseCompletionEvidence(root.value.completionEvidence, `${path}.completionEvidence`, step.value);
  const spawnRecipe = parseSpawnRecipe(root.value.spawnRecipe, `${path}.spawnRecipe`, step.value);
  const assistant = requireArray(root.value.assistant, 'InvalidSessionManifest', `${path}.assistant`, parseAssistantIdentity);
  const logReference = parseLogReference(root.value.logReference, `${path}.logReference`);
  const terminalResult = root.value.terminalResult === undefined ? { ok: true, value: undefined } as const : parseTerminalResult(root.value.terminalResult, `${path}.terminalResult`);
  const anomalyIds = requireStringArray(root.value.anomalyIds, `${path}.anomalyIds`);
  const interventionIds = requireStringArray(root.value.interventionIds, `${path}.interventionIds`);
  if (!supersedesAttemptId.ok) return supersedesAttemptId;
  if (!startedAt.ok) return startedAt;
  if (!endedAt.ok) return endedAt;
  if (!branchBefore.ok) return branchBefore;
  if (!branchAfter.ok) return branchAfter;
  if (!ownedPathSnapshot.ok) return ownedPathSnapshot;
  if (!completion.ok) return completion;
  if (!spawnRecipe.ok) return spawnRecipe;
  if (!assistant.ok) return assistant;
  if (!logReference.ok) return logReference;
  if (!terminalResult.ok) return terminalResult;
  if (!anomalyIds.ok) return anomalyIds;
  if (!interventionIds.ok) return interventionIds;

  return {
    ok: true,
    value: {
      attemptId: attemptId.value,
      step: step.value,
      status,
      ...(supersedesAttemptId.value === undefined ? {} : { supersedesAttemptId: supersedesAttemptId.value }),
      startedAt: startedAt.value,
      ...(endedAt.value === undefined ? {} : { endedAt: endedAt.value }),
      branchBefore: branchBefore.value,
      ...(branchAfter.value === undefined ? {} : { branchAfter: branchAfter.value }),
      ownedPathSnapshot: ownedPathSnapshot.value,
      ...(completion.value === undefined ? {} : { completionEvidence: completion.value }),
      spawnRecipe: spawnRecipe.value,
      assistant: assistant.value,
      logReference: logReference.value,
      ...(terminalResult.value === undefined ? {} : { terminalResult: terminalResult.value }),
      anomalyIds: anomalyIds.value,
      interventionIds: interventionIds.value
    }
  };
};

const parseAnomaly = (value: unknown, path: string): ManifestFactoryResult<Anomaly, ErrorName> => {
  const root = requireRecord(value, 'InvalidSessionManifest', path);
  if (!root.ok) return root;
  const keys = rejectUnknownKeys(root.value, ['anomalyId', 'step', 'kind', 'severity', 'detectedAt', 'evidence', 'resolvedByInterventionId'], 'InvalidSessionManifest', path);
  if (!keys.ok) return keys;
  const anomalyId = requireNonEmptyString(root.value.anomalyId, 'InvalidSessionManifest', `${path}.anomalyId`);
  const step = requireStepName(root.value.step, 'InvalidSessionManifest', `${path}.step`);
  const detectedAt = requireIsoTimestamp(root.value.detectedAt, 'InvalidSessionManifest', `${path}.detectedAt`);
  const evidence = requireRecord(root.value.evidence, 'InvalidSessionManifest', `${path}.evidence`);
  const resolvedByInterventionId = optionalString(root.value.resolvedByInterventionId, `${path}.resolvedByInterventionId`);
  if (!anomalyId.ok) return anomalyId;
  if (!step.ok) return step;
  if (!isOneOf(ANOMALY_KINDS, root.value.kind)) return invalid('InvalidSessionManifest', 'anomaly kind must be recognized', `${path}.kind`);
  if (!isOneOf(ANOMALY_SEVERITIES, root.value.severity)) return invalid('InvalidSessionManifest', 'anomaly severity must be recognized', `${path}.severity`);
  if (!detectedAt.ok) return detectedAt;
  if (!evidence.ok) return evidence;
  if (!resolvedByInterventionId.ok) return resolvedByInterventionId;
  return { ok: true, value: { anomalyId: anomalyId.value, step: step.value, kind: root.value.kind, severity: root.value.severity, detectedAt: detectedAt.value, evidence: evidence.value, ...(resolvedByInterventionId.value === undefined ? {} : { resolvedByInterventionId: resolvedByInterventionId.value }) } };
};

const parseIntervention = (value: unknown, path: string): ManifestFactoryResult<Intervention, ErrorName> => {
  const root = requireRecord(value, 'InvalidSessionManifest', path);
  if (!root.ok) return root;
  const keys = rejectUnknownKeys(root.value, ['interventionId', 'anomalyId', 'tool', 'startedAt', 'endedAt', 'preconditionSnapshot', 'result', 'auditMessage'], 'InvalidSessionManifest', path);
  if (!keys.ok) return keys;
  const interventionId = requireNonEmptyString(root.value.interventionId, 'InvalidSessionManifest', `${path}.interventionId`);
  const anomalyId = requireNonEmptyString(root.value.anomalyId, 'InvalidSessionManifest', `${path}.anomalyId`);
  const startedAt = requireIsoTimestamp(root.value.startedAt, 'InvalidSessionManifest', `${path}.startedAt`);
  const endedAt = requireIsoTimestamp(root.value.endedAt, 'InvalidSessionManifest', `${path}.endedAt`);
  const preconditionSnapshot = requireRecord(root.value.preconditionSnapshot, 'InvalidSessionManifest', `${path}.preconditionSnapshot`);
  const auditMessage = requireNonEmptyString(root.value.auditMessage, 'InvalidSessionManifest', `${path}.auditMessage`);
  if (!interventionId.ok) return interventionId;
  if (!anomalyId.ok) return anomalyId;
  if (!isOneOf(INTERVENTION_TOOLS, root.value.tool)) return invalid('InvalidSessionManifest', 'intervention tool must be recognized', `${path}.tool`);
  if (!startedAt.ok) return startedAt;
  if (!endedAt.ok) return endedAt;
  if (!preconditionSnapshot.ok) return preconditionSnapshot;
  if (!isOneOf(INTERVENTION_RESULTS, root.value.result)) return invalid('InvalidSessionManifest', 'intervention result must be recognized', `${path}.result`);
  if (!auditMessage.ok) return auditMessage;
  return { ok: true, value: { interventionId: interventionId.value, anomalyId: anomalyId.value, tool: root.value.tool, startedAt: startedAt.value, endedAt: endedAt.value, preconditionSnapshot: preconditionSnapshot.value, result: root.value.result, auditMessage: auditMessage.value } };
};

const parseDoctorInvocation = (value: unknown, path: string): ManifestFactoryResult<DoctorToolInvocation, ErrorName> => {
  const root = requireRecord(value, 'InvalidSessionManifest', path);
  if (!root.ok) return root;
  const keys = rejectUnknownKeys(root.value, ['invocationId', 'step', 'attemptNumber', 'tool', 'argumentsHash', 'startedAt', 'endedAt', 'result', 'rejectionReason'], 'InvalidSessionManifest', path);
  if (!keys.ok) return keys;
  const invocationId = requireNonEmptyString(root.value.invocationId, 'InvalidSessionManifest', `${path}.invocationId`);
  const step = requireStepName(root.value.step, 'InvalidSessionManifest', `${path}.step`);
  const argumentsHash = requireNonEmptyString(root.value.argumentsHash, 'InvalidSessionManifest', `${path}.argumentsHash`);
  const startedAt = requireIsoTimestamp(root.value.startedAt, 'InvalidSessionManifest', `${path}.startedAt`);
  const endedAt = root.value.endedAt === undefined ? { ok: true, value: undefined } as const : requireIsoTimestamp(root.value.endedAt, 'InvalidSessionManifest', `${path}.endedAt`);
  const rejectionReason = optionalString(root.value.rejectionReason, `${path}.rejectionReason`);
  if (!invocationId.ok) return invocationId;
  if (!step.ok) return step;
  if (root.value.attemptNumber !== 1 && root.value.attemptNumber !== 2) return invalid('InvalidSessionManifest', 'doctor attempt number must be 1 or 2', `${path}.attemptNumber`);
  if (!isOneOf(DOCTOR_TOOLS, root.value.tool)) return invalid('InvalidSessionManifest', 'doctor tool must be recognized', `${path}.tool`);
  if (!argumentsHash.ok) return argumentsHash;
  if (!startedAt.ok) return startedAt;
  if (!endedAt.ok) return endedAt;
  if (!isOneOf(DOCTOR_INVOCATION_RESULTS, root.value.result)) return invalid('InvalidSessionManifest', 'doctor result must be recognized', `${path}.result`);
  if (!rejectionReason.ok) return rejectionReason;
  return { ok: true, value: { invocationId: invocationId.value, step: step.value, attemptNumber: root.value.attemptNumber, tool: root.value.tool, argumentsHash: argumentsHash.value, startedAt: startedAt.value, ...(endedAt.value === undefined ? {} : { endedAt: endedAt.value }), result: root.value.result, ...(rejectionReason.value === undefined ? {} : { rejectionReason: rejectionReason.value }) } };
};

const parseNudgeRequest = (value: unknown, path: string): ManifestFactoryResult<NudgeRequest, ErrorName> => {
  const root = requireRecord(value, 'InvalidSessionManifest', path);
  if (!root.ok) return root;
  const keys = rejectUnknownKeys(root.value, ['nudgeId', 'requestedAt', 'step', 'result', 'anomalyIds', 'interventionIds', 'message'], 'InvalidSessionManifest', path);
  if (!keys.ok) return keys;
  const nudgeId = requireNonEmptyString(root.value.nudgeId, 'InvalidSessionManifest', `${path}.nudgeId`);
  const requestedAt = requireIsoTimestamp(root.value.requestedAt, 'InvalidSessionManifest', `${path}.requestedAt`);
  const step = requireStepName(root.value.step, 'InvalidSessionManifest', `${path}.step`);
  const anomalyIds = requireStringArray(root.value.anomalyIds, `${path}.anomalyIds`);
  const interventionIds = requireStringArray(root.value.interventionIds, `${path}.interventionIds`);
  const message = requireNonEmptyString(root.value.message, 'InvalidSessionManifest', `${path}.message`);
  if (!nudgeId.ok) return nudgeId;
  if (!requestedAt.ok) return requestedAt;
  if (!step.ok) return step;
  if (!isOneOf(NUDGE_RESULTS, root.value.result)) return invalid('InvalidSessionManifest', 'nudge result must be recognized', `${path}.result`);
  if (!anomalyIds.ok) return anomalyIds;
  if (!interventionIds.ok) return interventionIds;
  if (!message.ok) return message;
  return { ok: true, value: { nudgeId: nudgeId.value, requestedAt: requestedAt.value, step: step.value, result: root.value.result, anomalyIds: anomalyIds.value, interventionIds: interventionIds.value, message: message.value } };
};

const parseAuditRecord = (value: unknown, path: string): ManifestFactoryResult<AuditRecord, ErrorName> => {
  const root = requireRecord(value, 'InvalidSessionManifest', path);
  if (!root.ok) return root;
  const keys = rejectUnknownKeys(root.value, ['auditId', 'at', 'event', 'step', 'message'], 'InvalidSessionManifest', path);
  if (!keys.ok) return keys;
  const auditId = requireNonEmptyString(root.value.auditId, 'InvalidSessionManifest', `${path}.auditId`);
  const at = requireIsoTimestamp(root.value.at, 'InvalidSessionManifest', `${path}.at`);
  const event = requireNonEmptyString(root.value.event, 'InvalidSessionManifest', `${path}.event`);
  const step = root.value.step === undefined ? { ok: true, value: undefined } as const : requireStepName(root.value.step, 'InvalidSessionManifest', `${path}.step`);
  const message = requireNonEmptyString(root.value.message, 'InvalidSessionManifest', `${path}.message`);
  if (!auditId.ok) return auditId;
  if (!at.ok) return at;
  if (!event.ok) return event;
  if (!step.ok) return step;
  if (!message.ok) return message;
  return { ok: true, value: { auditId: auditId.value, at: at.value, event: event.value, ...(step.value === undefined ? {} : { step: step.value }), message: message.value } };
};

export const createSessionManifest = (
  value: unknown
): ManifestFactoryResult<SessionManifestV1, ErrorName> => {
  const root = requireRecord(value, 'InvalidSessionManifest', '$');
  if (!root.ok) return root;
  const keys = rejectUnknownKeys(root.value, topLevelKeys, 'InvalidSessionManifest', '$');
  if (!keys.ok) return keys;
  if (root.value.schema !== SESSION_MANIFEST_SCHEMA) {
    return invalid('InvalidSessionManifest', 'schema must be concierge.sessionManifest.v1', '$.schema');
  }

  const sessionId = requireNonEmptyString(root.value.sessionId, 'InvalidSessionManifest', '$.sessionId');
  const featureDir = requireNonEmptyString(root.value.featureDir, 'InvalidSessionManifest', '$.featureDir');
  const branch = requireNonEmptyString(root.value.branch, 'InvalidSessionManifest', '$.branch');
  const createdAt = requireIsoTimestamp(root.value.createdAt, 'InvalidSessionManifest', '$.createdAt');
  const updatedAt = requireIsoTimestamp(root.value.updatedAt, 'InvalidSessionManifest', '$.updatedAt');
  const currentStep = requireStepName(root.value.currentStep, 'InvalidSessionManifest', '$.currentStep');
  const attempts = requireArray(root.value.attempts, 'InvalidSessionManifest', '$.attempts', parseStepAttempt);
  const anomalies = requireArray(root.value.anomalies, 'InvalidSessionManifest', '$.anomalies', parseAnomaly);
  const interventions = requireArray(root.value.interventions, 'InvalidSessionManifest', '$.interventions', parseIntervention);
  const doctorInvocations = requireArray(root.value.doctorInvocations, 'InvalidSessionManifest', '$.doctorInvocations', parseDoctorInvocation);
  const nudgeRequests = requireArray(root.value.nudgeRequests, 'InvalidSessionManifest', '$.nudgeRequests', parseNudgeRequest);
  const audit = requireArray(root.value.audit, 'InvalidSessionManifest', '$.audit', parseAuditRecord);
  if (!sessionId.ok) return sessionId;
  if (!featureDir.ok) return featureDir;
  if (!branch.ok) return branch;
  if (!createdAt.ok) return createdAt;
  if (!updatedAt.ok) return updatedAt;
  if (!currentStep.ok) return currentStep;
  if (!attempts.ok) return attempts;
  if (!anomalies.ok) return anomalies;
  if (!interventions.ok) return interventions;
  if (!doctorInvocations.ok) return doctorInvocations;
  if (!nudgeRequests.ok) return nudgeRequests;
  if (!audit.ok) return audit;

  return {
    ok: true,
    value: {
      schema: SESSION_MANIFEST_SCHEMA,
      sessionId: sessionId.value,
      featureDir: featureDir.value,
      branch: branch.value,
      createdAt: createdAt.value,
      updatedAt: updatedAt.value,
      currentStep: currentStep.value,
      attempts: attempts.value,
      anomalies: anomalies.value,
      interventions: interventions.value,
      doctorInvocations: doctorInvocations.value,
      nudgeRequests: nudgeRequests.value,
      audit: audit.value
    }
  };
};
