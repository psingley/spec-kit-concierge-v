import type {
  BoundCLICancelResult,
  BoundCLICapabilities,
  BoundCLIDisposeResult,
  BoundCLILifecycleState,
  BoundCLILoadSessionResult,
  BoundCLIMcpServer,
  BoundCLINewSessionOptions,
  BoundCLINewSessionResult,
  BoundCLIPromptResult,
  BoundCLIPromptUpdate,
  BoundCLISessionId,
  BoundCLISessionSummary
} from './types';

export type BoundCLISession = {
  readonly capabilities: BoundCLICapabilities;
  readonly state: BoundCLILifecycleState;
  onSessionEnded(listener: (info: unknown) => void): () => void;
  newSession(
    cwd: string,
    mcpServers: BoundCLIMcpServer[],
    options?: BoundCLINewSessionOptions
  ): Promise<BoundCLINewSessionResult>;
  prompt(
    sessionId: BoundCLISessionId,
    text: string,
    onUpdate?: (update: BoundCLIPromptUpdate) => void
  ): Promise<BoundCLIPromptResult>;
  setModel(sessionId: BoundCLISessionId, modelId: string): Promise<void>;
  setMode(sessionId: BoundCLISessionId, modeId: string): Promise<void>;
  listSessions(cwd?: string): Promise<BoundCLISessionSummary[]>;
  loadSession(sessionId: BoundCLISessionId, cwd: string): Promise<BoundCLILoadSessionResult>;
  cancel(sessionId: BoundCLISessionId): Promise<BoundCLICancelResult>;
  dispose(): Promise<BoundCLIDisposeResult>;
};

export type CodingAgent = {
  start(): Promise<BoundCLISession>;
};
