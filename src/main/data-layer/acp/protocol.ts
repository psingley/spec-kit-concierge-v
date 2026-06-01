import { Readable, Writable } from 'node:stream';
import {
  ClientSideConnection,
  PROTOCOL_VERSION,
  ndJsonStream,
  type CancelNotification,
  type Client,
  type ClientCapabilities,
  type ListSessionsRequest,
  type LoadSessionRequest,
  type McpServer,
  type NewSessionRequest,
  type PromptRequest,
  type RequestPermissionRequest,
  type RequestPermissionResponse,
  type SessionNotification,
  type SetSessionConfigOptionRequest
} from '@agentclientprotocol/sdk';

export type AcpDirection = 'client->agent' | 'agent->client';

export type AcpTranscriptRecord = {
  direction: AcpDirection;
  message: Record<string, unknown>;
};

export type AcpProtocolClient = {
  onSessionUpdate?: (params: unknown) => void;
  record?: (record: AcpTranscriptRecord) => void;
};

export type AcpProtocol = {
  closed: Promise<void>;
  initialize(): Promise<unknown>;
  newSession(params: { cwd: string; mcpServers: Record<string, unknown>[] }): Promise<unknown>;
  prompt(params: { sessionId: string; text: string }): Promise<unknown>;
  setSessionConfigOption(params: { sessionId: string; configId: string; value: string | boolean }): Promise<unknown>;
  listSessions(params: { cwd?: string }): Promise<unknown>;
  loadSession(params: { sessionId: string; cwd: string }): Promise<unknown>;
  cancel(params: { sessionId: string }): Promise<void>;
  close(): Promise<void>;
};

export type CreateAcpProtocolOptions = {
  stdin: NodeJS.WritableStream;
  stdout: NodeJS.ReadableStream;
  client?: AcpProtocolClient;
};

class ConciergeAcpClient implements Client {
  constructor(private readonly options: AcpProtocolClient) {}

  async requestPermission(params: RequestPermissionRequest): Promise<RequestPermissionResponse> {
    // The supervisor launches the agent with --allow-all-tools, so any permission
    // request that still surfaces should be auto-approved rather than cancelled
    // (a cancelled outcome would silently stall the agent). Pick the first
    // allow-style option the agent offered; only fall back to cancelled when the
    // agent offered no allow option at all.
    const allowOption = params.options.find(
      (option) => option.kind === 'allow_once' || option.kind === 'allow_always'
    );
    if (allowOption === undefined) {
      return { outcome: { outcome: 'cancelled' } };
    }
    return { outcome: { outcome: 'selected', optionId: allowOption.optionId } };
  }

  async sessionUpdate(params: SessionNotification): Promise<void> {
    this.options.record?.({
      direction: 'agent->client',
      message: {
        method: 'session/update',
        params: params as unknown as Record<string, unknown>
      }
    });
    this.options.onSessionUpdate?.(params);
  }

  async writeTextFile(): Promise<Record<string, never>> {
    return {};
  }

  async readTextFile(): Promise<{ content: string }> {
    return { content: '' };
  }
}

const clientCapabilities = (): ClientCapabilities => ({});

export const createAcpProtocol = ({
  stdin,
  stdout,
  client = {}
}: CreateAcpProtocolOptions): AcpProtocol => {
  const writable = Writable.toWeb(stdin as Writable) as WritableStream<Uint8Array>;
  const readable = Readable.toWeb(stdout as Readable) as ReadableStream<Uint8Array>;
  const connection = new ClientSideConnection(
    () => new ConciergeAcpClient(client),
    ndJsonStream(writable, readable)
  );

  const record = (direction: AcpDirection, message: Record<string, unknown>): void => {
    client.record?.({ direction, message });
  };

  return {
    closed: connection.closed,
    async initialize(): Promise<unknown> {
      const params = { protocolVersion: PROTOCOL_VERSION, clientCapabilities: clientCapabilities() };
      record('client->agent', { method: 'initialize', params });
      const result = await connection.initialize(params);
      record('agent->client', { method: 'initialize', result: result as Record<string, unknown> });
      return result;
    },
    async newSession(params: { cwd: string; mcpServers: Record<string, unknown>[] }): Promise<unknown> {
      const request: NewSessionRequest = {
        cwd: params.cwd,
        mcpServers: params.mcpServers as McpServer[]
      };
      record('client->agent', { method: 'session/new', params: request as unknown as Record<string, unknown> });
      const result = await connection.newSession(request);
      record('agent->client', { method: 'session/new', result: result as Record<string, unknown> });
      return result;
    },
    async prompt(params: { sessionId: string; text: string }): Promise<unknown> {
      const request: PromptRequest = {
        sessionId: params.sessionId,
        prompt: [{ type: 'text', text: params.text }]
      };
      record('client->agent', { method: 'session/prompt', params: request as unknown as Record<string, unknown> });
      const result = await connection.prompt(request);
      record('agent->client', { method: 'session/prompt', result: result as Record<string, unknown> });
      return result;
    },
    async setSessionConfigOption(params: {
      sessionId: string;
      configId: string;
      value: string | boolean;
    }): Promise<unknown> {
      const request: SetSessionConfigOptionRequest =
        typeof params.value === 'boolean'
          ? {
              type: 'boolean',
              sessionId: params.sessionId,
              configId: params.configId,
              value: params.value
            }
          : {
              sessionId: params.sessionId,
              configId: params.configId,
              value: params.value
            };
      record('client->agent', {
        method: 'session/set_config_option',
        params: request as unknown as Record<string, unknown>
      });
      const result = await connection.setSessionConfigOption(request);
      record('agent->client', {
        method: 'session/set_config_option',
        result: result as Record<string, unknown>
      });
      return result;
    },
    async listSessions(params: { cwd?: string }): Promise<unknown> {
      const request: ListSessionsRequest = params.cwd === undefined ? {} : { cwd: params.cwd };
      record('client->agent', { method: 'session/list', params: request as Record<string, unknown> });
      const result = await connection.listSessions(request);
      record('agent->client', { method: 'session/list', result: result as Record<string, unknown> });
      return result;
    },
    async loadSession(params: { sessionId: string; cwd: string }): Promise<unknown> {
      const request: LoadSessionRequest = {
        sessionId: params.sessionId,
        cwd: params.cwd,
        mcpServers: []
      };
      record('client->agent', { method: 'session/load', params: request as unknown as Record<string, unknown> });
      const result = await connection.loadSession(request);
      record('agent->client', { method: 'session/load', result: result as Record<string, unknown> });
      return result;
    },
    async cancel(params: { sessionId: string }): Promise<void> {
      const request: CancelNotification = { sessionId: params.sessionId };
      record('client->agent', { method: 'session/cancel', params: request as Record<string, unknown> });
      await connection.cancel(request);
    },
    async close(): Promise<void> {
      // Actively close: end the underlying stdin (writable end of the
      // bidirectional stream) so the SDK connection completes promptly.
      // Codex-found bug: previous implementation only awaited connection.closed
      // passively, forcing dispose() into the SIGTERM timeout path.
      try {
        stdin.end();
      } catch {
        // Stream may already be ended; safe to ignore — we still await closure.
      }
      await connection.closed;
    }
  };
};
