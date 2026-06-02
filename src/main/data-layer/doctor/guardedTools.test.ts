import { describe, expect, it, vi } from 'vitest';
import type { GuardedDoctorTool } from '../../domain/manifest/types';
import { executeGuardedDoctorTool } from './guardedTools';

const baseRequest = (tool: GuardedDoctorTool) => ({
  invocationId: `invocation-${tool}`,
  step: 'tasks' as const,
  attemptNumber: 1 as const,
  tool,
  arguments: {
    anomalyId: 'anomaly-001',
    idempotencyKey: `key-${tool}`,
    featureDir: 'specs/0013-hybrid-manifest-architecture',
    branch: 'build/manifest-architecture-dogfood',
    paths: ['specs/0013-hybrid-manifest-architecture/tasks.md'],
    snapshotHash: 'snapshot-001',
    ambiguous: false,
    evidence: {
      destinationPath: 'specs/0013-hybrid-manifest-architecture/tasks.md',
      paths: ['src/unrelated.txt'],
      restorePointAvailable: true
    }
  }
});

describe('guarded doctor tools', () => {
  it('delegates guarded mutating tools to deterministic guarded actions and returns to reconciliation', async () => {
    for (const tool of ['relocateArtifact', 'reRunStepWithPinnedContext', 'revertUnrelatedFiles', 'markFailedWithStrandedArtifacts', 'cancelActiveStep'] as const) {
      const executeRecovery = vi.fn(async () => ({
        result: 'applied',
        requiresReconciliation: true,
        interventionId: `intervention-${tool}`
      } as const));
      const logger = { info: vi.fn() };

      const result = await executeGuardedDoctorTool({
        repositoryPath: '/repo',
        userDataPath: '/user-data',
        request: baseRequest(tool),
        executeRecovery,
        issueCorrectionPrompt: vi.fn(),
        appendDoctorInvocation: vi.fn(),
        appendAudit: vi.fn(),
        logger
      });

      expect(executeRecovery).toHaveBeenCalledWith(expect.objectContaining({
        repositoryPath: '/repo',
        request: expect.objectContaining({
          requestedBy: 'doctor',
          approvedDoctorRequestId: `invocation-${tool}`,
          anomalyId: 'anomaly-001'
        })
      }));
      expect(result).toMatchObject({ requiresReconciliation: true, result: 'applied' });
      expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({
        event: 'doctor-invocation',
        tool,
        result: 'returned'
      }), 'hybrid manifest event');
    }
  });

  it('rejects ambiguous guarded recovery requests before deterministic mutation', async () => {
    const executeRecovery = vi.fn();
    const result = await executeGuardedDoctorTool({
      repositoryPath: '/repo',
      userDataPath: '/user-data',
      request: {
        ...baseRequest('relocateArtifact'),
        arguments: { ...baseRequest('relocateArtifact').arguments, ambiguous: true }
      },
      executeRecovery,
      issueCorrectionPrompt: vi.fn(),
      appendDoctorInvocation: vi.fn(),
      appendAudit: vi.fn()
    });

    expect(result).toMatchObject({ result: 'rejected', requiresReconciliation: true });
    expect(executeRecovery).not.toHaveBeenCalled();
  });

  it('runs issueCorrectionPrompt only through its bounded deterministic action', async () => {
    const issueCorrectionPrompt = vi.fn(async () => ({
      result: 'applied',
      requiresReconciliation: true,
      interventionId: 'intervention-correction'
    } as const));
    const appendDoctorInvocation = vi.fn();
    const appendAudit = vi.fn();

    const result = await executeGuardedDoctorTool({
      repositoryPath: '/repo',
      userDataPath: '/user-data',
      request: baseRequest('issueCorrectionPrompt'),
      executeRecovery: vi.fn(),
      issueCorrectionPrompt,
      appendDoctorInvocation,
      appendAudit
    });

    expect(issueCorrectionPrompt).toHaveBeenCalledTimes(1);
    expect(appendDoctorInvocation).toHaveBeenCalledWith(expect.objectContaining({
      tool: 'issueCorrectionPrompt',
      result: 'returned'
    }));
    expect(appendAudit).toHaveBeenCalledWith(expect.objectContaining({
      event: 'doctor-invocation'
    }));
    expect(result).toMatchObject({ requiresReconciliation: true, result: 'applied' });
  });
});
