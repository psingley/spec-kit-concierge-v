export type StepStreamEvent =
  | {
      type: 'progress';
      step: 'specify';
      sessionId: string;
      level: 'info' | 'ok' | 'warn' | 'error';
      message: string;
      timestamp: string;
    }
  | {
      type: 'done';
      step: 'specify';
      sessionId: string;
      status: 'pass' | 'fail';
      specMarkdown?: string;
      artifactPath?: string;
      commitSha?: string;
      reason?: string;
    };
