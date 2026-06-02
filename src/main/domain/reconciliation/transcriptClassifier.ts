import type { Anomaly, StepName, TerminalResult, TerminalResultKind } from '../manifest/types';

export type TranscriptRecord = {
  type?: string;
  sessionId?: string;
  exitCode?: number | null;
  signal?: string | null;
  raw?: string;
  [key: string]: unknown;
};

export type ChildExitEvidence = {
  exitCode: number | null;
  signal: string | null;
};

export type TranscriptClassifierRequest = {
  step: StepName;
  sessionId: string;
  checkedAt: string;
  startedAtMs: number;
  lastEventAtMs: number;
  nowMs: number;
  silenceTimeoutMs: number;
  transcriptRecords: readonly TranscriptRecord[];
  terminalResult?: ChildExitEvidence;
  childExit?: ChildExitEvidence;
};

export type TranscriptClassifierResult = {
  terminalResult?: TerminalResult;
  anomalies: Anomaly[];
  canMarkComplete: false;
  canInvokeDoctor: false;
};

const terminalKindFor = (exitCode: number | null, signal: string | null | undefined): TerminalResultKind => {
  if (signal !== undefined && signal !== null && signal.length > 0) return 'killed';
  if (exitCode === 130) return 'interrupted';
  if (exitCode === 0) return 'success';
  if (exitCode === null) return 'missing';
  return 'failure';
};

const anomaly = (
  request: TranscriptClassifierRequest,
  kind: Anomaly['kind'],
  evidence: Record<string, unknown>
): Anomaly => ({
  anomalyId: `${request.step}-${kind}-${request.sessionId}`,
  step: request.step,
  kind,
  severity: 'blocking',
  detectedAt: request.checkedAt,
  evidence
});

const terminalFrom = (evidence: ChildExitEvidence): TerminalResult => ({
  exitCode: evidence.exitCode ?? -1,
  ...(evidence.signal === null || evidence.signal === undefined ? {} : { signal: evidence.signal }),
  resultKind: terminalKindFor(evidence.exitCode, evidence.signal)
});

const transcriptTerminal = (records: readonly TranscriptRecord[]): TranscriptRecord | undefined =>
  records.find((record) => record.type === 'result');

export const classifyTranscriptEvidence = (
  request: TranscriptClassifierRequest
): TranscriptClassifierResult => {
  const anomalies: Anomaly[] = [];
  const invalidJson = request.transcriptRecords.find((record) => record.type === 'invalid-json');
  const terminalRecord = transcriptTerminal(request.transcriptRecords);
  const terminalEvidence = request.terminalResult ??
    (terminalRecord === undefined
      ? undefined
      : {
        exitCode: typeof terminalRecord.exitCode === 'number' ? terminalRecord.exitCode : null,
        signal: typeof terminalRecord.signal === 'string' ? terminalRecord.signal : null
      });

  if (invalidJson !== undefined) {
    anomalies.push(anomaly(request, 'malformed-terminal-result', {
      raw: invalidJson.raw,
      reason: 'invalid JSON terminal output'
    }));
  }

  const isSilent = terminalEvidence === undefined &&
    request.nowMs - request.lastEventAtMs >= request.silenceTimeoutMs;

  if (
    terminalEvidence === undefined &&
    isSilent
  ) {
    anomalies.push(anomaly(request, 'watchdog-silence', {
      silenceMs: request.nowMs - request.lastEventAtMs,
      silenceTimeoutMs: request.silenceTimeoutMs
    }));
  }

  if (terminalEvidence === undefined && invalidJson === undefined && !isSilent) {
    anomalies.push(anomaly(request, 'missing-terminal-result', {
      childExitCode: request.childExit?.exitCode,
      childSignal: request.childExit?.signal,
      transcriptRecordCount: request.transcriptRecords.length
    }));
  }

  if (
    terminalRecord !== undefined &&
    typeof terminalRecord.sessionId === 'string' &&
    terminalRecord.sessionId !== request.sessionId
  ) {
    anomalies.push(anomaly(request, 'transcript-irregularity', {
      expectedSessionId: request.sessionId,
      actualSessionId: terminalRecord.sessionId
    }));
  }

  return {
    terminalResult: terminalEvidence === undefined ? undefined : terminalFrom(terminalEvidence),
    anomalies,
    canMarkComplete: false,
    canInvokeDoctor: false
  };
};
