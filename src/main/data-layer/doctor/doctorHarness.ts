import type { Anomaly, DoctorToolInvocation, StepName } from '../../domain/manifest/types';
import type { DoctorToolRequest } from '../../domain/doctor/doctorTools.factory';

export type DoctorHarnessToolResult = Pick<DoctorToolInvocation, 'result' | 'rejectionReason'>;

export type RunDoctorHarnessRequest = {
  step: StepName;
  requests: DoctorToolRequest[];
  executeTool: (request: DoctorToolRequest) => Promise<DoctorHarnessToolResult>;
  appendAnomaly: (anomaly: Anomaly) => Promise<void> | void;
  now?: () => string;
};

export type DoctorHarnessResult = {
  status: 'returned' | 'needs-attention';
  exhausted: boolean;
  results: DoctorHarnessToolResult[];
  anomaly?: Anomaly;
};

export const runDoctorHarness = async (
  request: RunDoctorHarnessRequest
): Promise<DoctorHarnessResult> => {
  const results: DoctorHarnessToolResult[] = [];
  const allowed = request.requests.slice(0, 2);

  for (const toolRequest of allowed) {
    results.push(await request.executeTool(toolRequest));
  }

  if (request.requests.length > 2) {
    const anomaly: Anomaly = {
      anomalyId: `${request.step}-doctor-budget-exhausted`,
      step: request.step,
      kind: 'doctor-budget-exhausted',
      severity: 'blocking',
      detectedAt: request.now?.() ?? new Date().toISOString(),
      evidence: {
        attemptedRequests: request.requests.length,
        allowedRequests: 2
      }
    };
    await request.appendAnomaly(anomaly);
    return {
      status: 'needs-attention',
      exhausted: true,
      results,
      anomaly
    };
  }

  return {
    status: 'returned',
    exhausted: false,
    results
  };
};
