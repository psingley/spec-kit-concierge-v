import { describe, expect, it } from 'vitest';
import {
  GUARDED_DOCTOR_TOOL_NAMES,
  READ_ONLY_DOCTOR_TOOL_NAMES,
  createDoctorToolRequest
} from './doctorTools.factory';

const baseRequest = {
  invocationId: 'doctor-invocation-001',
  step: 'tasks',
  attemptNumber: 1,
  tool: 'readManifest',
  arguments: {}
} as const;

describe('doctor tool catalog factory', () => {
  it('accepts exactly six read-only tools and six guarded tools', () => {
    expect(READ_ONLY_DOCTOR_TOOL_NAMES).toEqual([
      'readFeatureJson',
      'readManifest',
      'gitStatusDiff',
      'readTrailers',
      'readArtifacts',
      'readTranscript'
    ]);
    expect(GUARDED_DOCTOR_TOOL_NAMES).toEqual([
      'relocateArtifact',
      'reRunStepWithPinnedContext',
      'issueCorrectionPrompt',
      'revertUnrelatedFiles',
      'markFailedWithStrandedArtifacts',
      'cancelActiveStep'
    ]);

    for (const tool of [...READ_ONLY_DOCTOR_TOOL_NAMES, ...GUARDED_DOCTOR_TOOL_NAMES]) {
      expect(createDoctorToolRequest({ ...baseRequest, tool })).toMatchObject({
        ok: true,
        value: { tool, attemptNumber: 1 }
      });
    }
  });

  it('rejects tools outside the catalog, extra keys, and attempts beyond the two-turn budget', () => {
    expect(createDoctorToolRequest({ ...baseRequest, tool: 'rawGit' })).toMatchObject({
      ok: false,
      error: { path: '$.tool', message: expect.stringContaining('approved doctor tool') }
    });
    expect(createDoctorToolRequest({ ...baseRequest, attemptNumber: 3 })).toMatchObject({
      ok: false,
      error: { path: '$.attemptNumber' }
    });
    expect(createDoctorToolRequest({ ...baseRequest, extra: 'nope' })).toMatchObject({
      ok: false,
      error: { path: '$.extra' }
    });
  });
});
