export const AGENT_MODE_URI = 'https://agentclientprotocol.com/protocol/session-modes#agent';
export const PLAN_MODE_URI = 'https://agentclientprotocol.com/protocol/session-modes#plan';
export const AUTOPILOT_MODE_URI = 'https://agentclientprotocol.com/protocol/session-modes#autopilot';

export type BoundCLILifecycleState =
  | 'initializing'
  | 'ready'
  | 'pending'
  | 'prompting'
  | 'cancelling'
  | 'closed'
  | 'errored';

export type BoundCLIModel = {
  id: string;
  name: string;
  description?: string;
  cost?: string;
  enablement?: string;
};

export type BoundCLIMode = {
  id: string;
  name: string;
  description?: string;
};

export type BoundCLIConfigOption = {
  id: string;
  type: 'select' | 'boolean';
  name: string;
  currentValue: string | boolean;
  category?: string;
  options: Array<{ value: string; name: string; description?: string }>;
};

export type BoundCLICapabilities = {
  protocolVersion: number;
  agent: {
    name: string;
    title: string;
    version: string;
  };
  agentCapabilities: {
    loadSession: boolean;
    listSessions: boolean;
    mcp: {
      http: boolean;
      sse: boolean;
    };
    prompt: {
      image: boolean;
      audio: boolean;
      embeddedContext: boolean;
    };
  };
  authMethods: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
  models: {
    available: BoundCLIModel[];
    current?: string;
  };
  modes: {
    available: BoundCLIMode[];
    current: string;
  };
  configOptions: BoundCLIConfigOption[];
};

export type BoundCLIFactoryError = {
  name: 'InvalidBoundCLICapabilities';
  message: string;
  path: string;
};

export type BoundCLIFactoryResult =
  | { ok: true; value: BoundCLICapabilities }
  | { ok: false; error: BoundCLIFactoryError };

export type BoundCLISessionId = string;

export type BoundCLIMcpServer = Record<string, unknown>;

export type BoundCLINewSessionOptions = {
  modeId?: string;
  autopilotDecision?: 'allow' | 'deny';
  step?: string;
};

export type BoundCLINewSessionResult = {
  sessionId: BoundCLISessionId;
  currentModeId: string;
  currentModelId?: string;
  configOptions: BoundCLIConfigOption[];
};

export type BoundCLIPromptUpdate = {
  sessionId: BoundCLISessionId;
  update: Record<string, unknown>;
};

export type BoundCLIPromptResult = {
  stopReason: string;
  updates: BoundCLIPromptUpdate[];
};

export type BoundCLISessionSummary = {
  sessionId: string;
  title?: string;
  cwd?: string;
  updatedAt?: string;
};

export type BoundCLILoadSessionResult = {
  sessionId: string;
  currentModeId?: string;
};

export type BoundCLICancelResult = {
  outcome: 'acknowledged' | 'terminated';
};

export type BoundCLIDisposeResult = {
  outcome: 'closed' | 'terminated';
};

export type BoundCLICrashInfo = {
  code: number | null;
  signal: NodeJS.Signals | null;
  stderrTail: string;
};

export class ModeChangeDeferredError extends Error {
  constructor() {
    super('Mode changes after session startup are deferred to a future run.');
    this.name = 'ModeChangeDeferredError';
  }
}

export class AutopilotRequiresAllowError extends Error {
  constructor() {
    super('Autopilot mode requires an explicit recorded allow decision.');
    this.name = 'AutopilotRequiresAllowError';
  }
}

export class ModelChangeInProgressError extends Error {
  constructor() {
    super('Model changes are rejected while a prompt is pending or running.');
    this.name = 'ModelChangeInProgressError';
  }
}
