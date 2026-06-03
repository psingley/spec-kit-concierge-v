import type { BoundCLIPromptUpdate } from '../data-layer/acp/types';
import type { StreamEventKind } from './stepStreamEvent.factory';

export type ExtractedAcpStreamProgress = {
  kind: StreamEventKind;
  message: string;
  messageId?: string;
  raw: BoundCLIPromptUpdate;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const firstString = (record: Record<string, unknown>, ...keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
};

const contentText = (content: unknown): string => {
  if (!isRecord(content)) {
    return '[content]';
  }
  if (content.type === 'text' && typeof content.text === 'string') {
    return content.text;
  }
  if (typeof content.type === 'string') {
    const label = firstString(content, 'name', 'title', 'uri', 'url');
    return label === undefined ? `[${content.type}]` : `[${content.type}: ${label}]`;
  }
  return '[content]';
};

export const extractAcpStreamProgress = (raw: BoundCLIPromptUpdate): ExtractedAcpStreamProgress => {
  const update = raw.update;
  const sessionUpdate = typeof update.sessionUpdate === 'string' ? update.sessionUpdate : 'unknown';
  const messageId = typeof update.messageId === 'string' ? update.messageId : undefined;

  if (sessionUpdate === 'agent_message_chunk') {
    return { kind: 'assistant-text', message: contentText(update.content), messageId, raw };
  }

  if (sessionUpdate === 'agent_thought_chunk') {
    return { kind: 'status-update', message: `thinking: ${contentText(update.content)}`, messageId, raw };
  }

  if (sessionUpdate === 'tool_call' || sessionUpdate === 'tool_call_update') {
    const tool = firstString(update, 'name', 'toolName', 'mcpToolName', 'toolCallId') ?? 'tool';
    const verb = sessionUpdate === 'tool_call' ? 'Running' : 'Updated';
    const label = tool === 'tool' ? 'tool' : `tool ${tool}`;
    return { kind: 'tool-call', message: `${verb} ${label}`, raw };
  }

  if (sessionUpdate === 'plan') {
    const entries = Array.isArray(update.entries) ? ` (${update.entries.length} entries)` : '';
    return { kind: 'status-update', message: `Plan updated${entries}`, raw };
  }

  return { kind: 'status-update', message: sessionUpdate.replace(/[._]/g, ' '), raw };
};
