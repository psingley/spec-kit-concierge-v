export const SESSION_MANIFEST_SCHEMA = 'concierge.sessionManifest.v1' as const;

export const STEP_NAMES = ['specify', 'clarify', 'plan', 'tasks', 'analyze', 'review'] as const;
export type StepName = (typeof STEP_NAMES)[number];

export const STEP_ATTEMPT_STATUSES = ['pending', 'running', 'pass', 'failed', 'killed', 'interrupted'] as const;
export type StepAttemptStatus = (typeof STEP_ATTEMPT_STATUSES)[number];

export const RECONCILIATION_STATUSES = [...STEP_ATTEMPT_STATUSES, 'needs-attention'] as const;
export type ReconciliationStatus = (typeof RECONCILIATION_STATUSES)[number];

export const ANOMALY_KINDS = [
  'missing-artifact',
  'conflicting-evidence',
  'unrelated-diff',
  'misplaced-artifact',
  'duplicate-commit',
  'out-of-order-commit',
  'missing-terminal-result',
  'malformed-terminal-result',
  'watchdog-silence',
  'transcript-irregularity',
  'doctor-budget-exhausted',
  'ambiguous-nudge'
] as const;
export type AnomalyKind = (typeof ANOMALY_KINDS)[number];

export const ANOMALY_SEVERITIES = ['info', 'warning', 'blocking'] as const;
export type AnomalySeverity = (typeof ANOMALY_SEVERITIES)[number];

export const INTERVENTION_TOOLS = [
  'relocateArtifact',
  'adoptValidCompletion',
  'refreshFailedMarker',
  'revertUnrelatedFiles',
  'cancelActiveStep',
  'reRunStepWithPinnedContext',
  'issueCorrectionPrompt',
  'markFailedWithStrandedArtifacts'
] as const;
export type InterventionTool = (typeof INTERVENTION_TOOLS)[number];

export const INTERVENTION_RESULTS = ['applied', 'no-op', 'rejected', 'escalated'] as const;
export type InterventionResult = (typeof INTERVENTION_RESULTS)[number];

export const READ_ONLY_DOCTOR_TOOLS = [
  'readFeatureJson',
  'readManifest',
  'gitStatusDiff',
  'readTrailers',
  'readArtifacts',
  'readTranscript'
] as const;
export type ReadOnlyDoctorTool = (typeof READ_ONLY_DOCTOR_TOOLS)[number];

export const GUARDED_DOCTOR_TOOLS = [
  'relocateArtifact',
  'reRunStepWithPinnedContext',
  'issueCorrectionPrompt',
  'revertUnrelatedFiles',
  'markFailedWithStrandedArtifacts',
  'cancelActiveStep'
] as const;
export type GuardedDoctorTool = (typeof GUARDED_DOCTOR_TOOLS)[number];

export const DOCTOR_TOOLS = [...READ_ONLY_DOCTOR_TOOLS, ...GUARDED_DOCTOR_TOOLS] as const;
export type DoctorTool = (typeof DOCTOR_TOOLS)[number];

export const DOCTOR_INVOCATION_RESULTS = ['returned', 'rejected', 'failed'] as const;
export type DoctorInvocationResult = (typeof DOCTOR_INVOCATION_RESULTS)[number];

export const TERMINAL_RESULT_KINDS = ['success', 'failure', 'killed', 'interrupted', 'malformed', 'missing'] as const;
export type TerminalResultKind = (typeof TERMINAL_RESULT_KINDS)[number];

export const ASSISTANT_IDENTITY_SOURCES = ['print-json-event', 'transcript', 'log'] as const;
export type AssistantIdentitySource = (typeof ASSISTANT_IDENTITY_SOURCES)[number];

export const NUDGE_RESULTS = ['repaired', 'no-op', 'escalated', 'rejected'] as const;
export type NudgeResultStatus = (typeof NUDGE_RESULTS)[number];

export type BranchStateSnapshot = {
  branch: string;
  headSha: string;
  statusPorcelain: string;
  trackedChanges: string[];
  timestamp: string;
};

export type StepOwnedArtifactPath = {
  path: string;
  required: boolean;
  present: boolean;
  sha256?: string;
  sizeBytes?: number;
  mtimeMs?: number;
};

export type StepOwnedArtifactSnapshot = {
  step: StepName;
  featureDir: string;
  paths: StepOwnedArtifactPath[];
  snapshotHash: string;
  capturedAt: string;
};

export type SpawnRecipe = {
  command: 'copilot';
  args: ['-p', '--agent', `speckit.${StepName}`, '--output-format', 'json', '--session-id', string, '--log-dir', string];
  cwd: string;
  environmentKeys: string[];
};

export type AssistantIdentity = {
  assistantSessionId?: string;
  messageId?: string;
  turnId?: string;
  source: AssistantIdentitySource;
};

export type LogReference = {
  path: string;
  sha256: string;
  sizeBytes: number;
};

export type TerminalResult = {
  exitCode: number;
  signal?: string;
  resultKind: TerminalResultKind;
  summary?: string;
  rawEventChecksum?: string;
};

export type CompletionEvidence = {
  commitSha: string;
  trailer: `Concierge-Step: ${StepName}:pass`;
  artifactSnapshot: StepOwnedArtifactSnapshot;
  adoptedFromHistory: boolean;
};

export type StepAttempt = {
  attemptId: string;
  step: StepName;
  status: StepAttemptStatus;
  supersedesAttemptId?: string;
  startedAt: string;
  endedAt?: string;
  branchBefore: BranchStateSnapshot;
  branchAfter?: BranchStateSnapshot;
  ownedPathSnapshot: StepOwnedArtifactSnapshot;
  completionEvidence?: CompletionEvidence;
  spawnRecipe: SpawnRecipe;
  assistant: AssistantIdentity[];
  logReference: LogReference;
  terminalResult?: TerminalResult;
  anomalyIds: string[];
  interventionIds: string[];
};

export type Anomaly = {
  anomalyId: string;
  step: StepName;
  kind: AnomalyKind;
  severity: AnomalySeverity;
  detectedAt: string;
  evidence: Record<string, unknown>;
  resolvedByInterventionId?: string;
};

export type Intervention = {
  interventionId: string;
  anomalyId: string;
  tool: InterventionTool;
  startedAt: string;
  endedAt: string;
  preconditionSnapshot: Record<string, unknown>;
  result: InterventionResult;
  auditMessage: string;
};

export type DoctorToolInvocation = {
  invocationId: string;
  step: StepName;
  attemptNumber: 1 | 2;
  tool: DoctorTool;
  argumentsHash: string;
  startedAt: string;
  endedAt?: string;
  result: DoctorInvocationResult;
  rejectionReason?: string;
};

export type NudgeRequest = {
  nudgeId: string;
  requestedAt: string;
  step: StepName;
  result: NudgeResultStatus;
  anomalyIds: string[];
  interventionIds: string[];
  message: string;
};

export type AuditRecord = {
  auditId: string;
  at: string;
  event: string;
  step?: StepName;
  message: string;
};

export type SessionManifestV1 = {
  schema: typeof SESSION_MANIFEST_SCHEMA;
  sessionId: string;
  featureDir: string;
  branch: string;
  createdAt: string;
  updatedAt: string;
  currentStep: StepName;
  attempts: StepAttempt[];
  anomalies: Anomaly[];
  interventions: Intervention[];
  doctorInvocations: DoctorToolInvocation[];
  nudgeRequests: NudgeRequest[];
  audit: AuditRecord[];
};

export type ReconciliationResult = {
  step: StepName;
  status: ReconciliationStatus;
  canCommit: boolean;
  canAutoRecover: boolean;
  canNudge: boolean;
  anomalies: Anomaly[];
  requiredInterventions: string[];
  completionEvidence?: CompletionEvidence;
};
