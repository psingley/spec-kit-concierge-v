export const RENDERER_SESSION_MANIFEST_STATUSES = [
  'pending',
  'running',
  'pass',
  'failed',
  'killed',
  'interrupted',
  'needs-attention'
] as const;

export type RendererSessionManifestStatus = (typeof RENDERER_SESSION_MANIFEST_STATUSES)[number];

export type RendererStepName = 'specify' | 'clarify' | 'plan' | 'tasks' | 'analyze' | 'review';

export type RendererStepProjection = {
  step: RendererStepName;
  status: RendererSessionManifestStatus;
  canCommit: boolean;
  canAutoRecover: boolean;
  canNudge: boolean;
  anomalyIds: string[];
  interventionIds: string[];
  completionCommitSha?: string;
};

export type RendererAuditSummary = {
  auditId: string;
  at: string;
  event: string;
  step?: RendererStepName;
  message: string;
};

export type RendererManifestView = {
  sessionId: string;
  featureDir: string;
  branch: string;
  currentStep: RendererStepName;
  steps: RendererStepProjection[];
  audit: RendererAuditSummary[];
  updatedAt: string;
};

export type RendererDoctorStatus = {
  enabled: boolean;
  budgets: Array<{
    step: RendererStepName;
    maxAttempts: 2;
    usedAttempts: number;
    exhausted: boolean;
    escalationReason?: string;
  }>;
};

export type RendererNudgeRequest = {
  sessionId: string;
  step: RendererStepName;
  anomalyIds: string[];
};

export type RendererNudgeResult = {
  nudgeId: string;
  result: 'repaired' | 'no-op' | 'escalated' | 'rejected';
  repairedAnomalyIds: string[];
  interventionIds: string[];
  message: string;
  escalation?: {
    reason: string;
    evidence: string[];
  };
};

export type SessionManifestHttpRoutes = {
  read: '/v1/session-manifest';
  reconcile: '/v1/session-manifest/reconcile';
  audit: '/v1/session-manifest/audit';
  doctorStatus: '/v1/session-manifest/doctor-status';
  nudge: '/v1/session-manifest/nudge';
};
