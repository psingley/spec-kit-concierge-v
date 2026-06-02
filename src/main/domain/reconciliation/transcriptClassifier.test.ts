import { describe, expect, it } from 'vitest';
import { classifyTranscriptEvidence } from './transcriptClassifier';

const base = {
  step: 'tasks',
  sessionId: 'tasks-001',
  checkedAt: '2026-06-02T00:00:00.000Z',
  startedAtMs: 0,
  lastEventAtMs: 10,
  nowMs: 20,
  silenceTimeoutMs: 1_000,
  transcriptRecords: [{ type: 'result', sessionId: 'tasks-001', exitCode: 0 }]
} as const;

describe('classifyTranscriptEvidence', () => {
  it('records watchdog silence without creating completion authority', () => {
    const result = classifyTranscriptEvidence({
      ...base,
      nowMs: 2_000,
      transcriptRecords: [{ type: 'progress', content: 'still thinking' }]
    });

    expect(result.canMarkComplete).toBe(false);
    expect(result.canInvokeDoctor).toBe(false);
    expect(result.anomalies).toEqual([
      expect.objectContaining({
        kind: 'watchdog-silence',
        severity: 'blocking',
        anomalyId: 'tasks-watchdog-silence-tasks-001'
      })
    ]);
  });

  it('classifies missing terminal output, invalid JSON, and unexpected child exit as blocking terminal anomalies', () => {
    expect(classifyTranscriptEvidence({
      ...base,
      transcriptRecords: [{ type: 'progress' }]
    }).anomalies).toEqual([
      expect.objectContaining({ kind: 'missing-terminal-result' })
    ]);

    expect(classifyTranscriptEvidence({
      ...base,
      transcriptRecords: [{ type: 'invalid-json', raw: '{not-json' }]
    }).anomalies).toEqual([
      expect.objectContaining({ kind: 'malformed-terminal-result' })
    ]);

    expect(classifyTranscriptEvidence({
      ...base,
      childExit: { exitCode: 1, signal: null },
      transcriptRecords: []
    }).anomalies).toEqual([
      expect.objectContaining({
        kind: 'missing-terminal-result',
        evidence: expect.objectContaining({ childExitCode: 1 })
      })
    ]);
  });

  it('maps killed, interrupted, and failed terminal records without treating them as transcript irregularities', () => {
    expect(classifyTranscriptEvidence({
      ...base,
      terminalResult: { exitCode: null, signal: 'SIGTERM' }
    })).toMatchObject({
      terminalResult: { resultKind: 'killed', signal: 'SIGTERM' },
      anomalies: []
    });

    expect(classifyTranscriptEvidence({
      ...base,
      terminalResult: { exitCode: 130, signal: null }
    })).toMatchObject({
      terminalResult: { resultKind: 'interrupted' },
      anomalies: []
    });

    expect(classifyTranscriptEvidence({
      ...base,
      terminalResult: { exitCode: 2, signal: null }
    })).toMatchObject({
      terminalResult: { resultKind: 'failure' },
      anomalies: []
    });
  });

  it('records transcript irregularity evidence separately from terminal status', () => {
    const result = classifyTranscriptEvidence({
      ...base,
      transcriptRecords: [{ type: 'result', sessionId: 'other', exitCode: 0 }]
    });

    expect(result.terminalResult).toMatchObject({ resultKind: 'success' });
    expect(result.anomalies).toEqual([
      expect.objectContaining({
        kind: 'transcript-irregularity',
        evidence: expect.objectContaining({ expectedSessionId: 'tasks-001', actualSessionId: 'other' })
      })
    ]);
  });
});
