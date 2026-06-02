import { describe, expect, it, vi } from 'vitest';
import { runDoctorHarness } from './doctorHarness';

const request = {
  invocationId: 'invocation-001',
  step: 'tasks',
  attemptNumber: 1,
  tool: 'readManifest',
  arguments: {}
} as const;

describe('doctor harness', () => {
  it('allows at most two attempts per step and records budget exhaustion as needs-attention evidence', async () => {
    const appendAnomaly = vi.fn();
    const result = await runDoctorHarness({
      step: 'tasks',
      requests: [
        request,
        { ...request, invocationId: 'invocation-002', attemptNumber: 2 },
        { ...request, invocationId: 'invocation-003', attemptNumber: 2 }
      ],
      executeTool: vi.fn(async () => ({ result: 'returned' as const })),
      appendAnomaly,
      now: () => '2026-06-02T00:00:00.000Z'
    });

    expect(result).toMatchObject({
      status: 'needs-attention',
      exhausted: true
    });
    expect(appendAnomaly).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'doctor-budget-exhausted',
      severity: 'blocking'
    }));
  });

  it('counts unsafe rejections against the budget and returns tool results before exhaustion', async () => {
    const executeTool = vi.fn(async () => ({ result: 'rejected' as const, rejectionReason: 'unsafe' }));
    const result = await runDoctorHarness({
      step: 'tasks',
      requests: [request, { ...request, invocationId: 'invocation-002', attemptNumber: 2 }],
      executeTool,
      appendAnomaly: vi.fn(),
      now: () => '2026-06-02T00:00:00.000Z'
    });

    expect(executeTool).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      status: 'returned',
      exhausted: false,
      results: [
        expect.objectContaining({ result: 'rejected' }),
        expect.objectContaining({ result: 'rejected' })
      ]
    });
  });
});
