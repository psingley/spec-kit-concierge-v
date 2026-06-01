import { describe, expect, it } from 'vitest';
import { readableFromEvent } from './copilotSpecify';

// These fixtures mirror the EXACT shapes emitted by copilot's
// --output-format json stream, verified against the copilot SDK schema
// (~/.copilot/pkg/universal/1.0.44/schemas/session-events.schema.json) and
// real ~/.copilot/session-state/<uuid>/events.jsonl runs. Every event nests its
// payload under a `data` object — the previous extractor only read top-level
// `text`/`message`, so it fell through to the bare `type` string (the bug).

describe('readableFromEvent — real copilot --output-format json shapes', () => {
  it('assistant.message_delta → the incremental deltaContent text (not the type)', () => {
    const event = {
      type: 'assistant.message_delta',
      data: { messageId: 'm1', deltaContent: 'The spec describes ' }
    };

    const readable = readableFromEvent(event);

    expect(readable).toBe('The spec describes ');
    expect(readable).not.toBe('assistant.message_delta');
  });

  it('assistant.message → the full message content (not the type)', () => {
    const event = {
      type: 'assistant.message',
      data: {
        messageId: 'm2',
        model: 'gpt-5.5',
        content: 'I will inspect the top bar component and remove the inert controls.'
      }
    };

    const readable = readableFromEvent(event);

    expect(readable).toBe('I will inspect the top bar component and remove the inert controls.');
    expect(readable).not.toBe('assistant.message');
  });

  it('assistant.reasoning → the reasoning content, surfaced legibly (not the type)', () => {
    const event = {
      type: 'assistant.reasoning',
      data: { reasoningId: 'r1', content: 'Need to find where the dots are styled.' }
    };

    const readable = readableFromEvent(event);

    expect(readable).toContain('Need to find where the dots are styled.');
    expect(readable).not.toBe('assistant.reasoning');
  });

  it('assistant.reasoning_delta → the incremental reasoning text (not the type)', () => {
    const event = {
      type: 'assistant.reasoning_delta',
      data: { reasoningId: 'r1', deltaContent: 'checking the CSS module' }
    };

    const readable = readableFromEvent(event);

    expect(readable).toContain('checking the CSS module');
    expect(readable).not.toBe('assistant.reasoning_delta');
  });

  it('tool.execution_start → a readable "Running <toolName>" line (not the type)', () => {
    const event = {
      type: 'tool.execution_start',
      data: { toolCallId: 'c1', toolName: 'report_intent', arguments: { intent: 'Removing faux controls' } }
    };

    const readable = readableFromEvent(event);

    expect(readable).toContain('report_intent');
    expect(readable?.toLowerCase()).toContain('running');
    expect(readable).not.toBe('tool.execution_start');
  });

  it('tool.execution_complete → a readable completion line (not the type)', () => {
    const event = {
      type: 'tool.execution_complete',
      data: { toolCallId: 'c1', success: true, result: { content: 'Intent logged' } }
    };

    const readable = readableFromEvent(event);

    expect(readable).not.toBe('tool.execution_complete');
    expect(readable?.length ?? 0).toBeGreaterThan(0);
  });

  it('result terminal event → a readable "complete" line (not the type)', () => {
    const event = { type: 'result', sessionId: 'u1', exitCode: 0, usage: { inputTokens: 10 } };

    const readable = readableFromEvent(event);

    expect(readable).not.toBe('result');
    expect(readable?.toLowerCase()).toContain('complete');
  });

  it('assistant.turn_end → suppressed (no content payload)', () => {
    const event = { type: 'assistant.turn_end', data: { turnId: '0' } };

    expect(readableFromEvent(event)).toBeUndefined();
  });

  it('unknown event type with no text payload → a friendly fallback label, not raw JSON', () => {
    const event = { type: 'session.model_change', data: { model: 'gpt-5.5' } };

    const readable = readableFromEvent(event);

    // A sensible, human-readable fallback derived from the type — never raw JSON.
    expect(readable).toBeDefined();
    expect(readable).not.toMatch(/^\{/);
  });

  it('event with literally no usable payload → undefined (caller skips it)', () => {
    expect(readableFromEvent({})).toBeUndefined();
  });

  // Backward-compatible flat shapes still work (defensive — some lines arrive
  // without the `data` wrapper).
  it('flat top-level text still extracted', () => {
    expect(readableFromEvent({ type: 'assistant', text: 'Creating feature directory...' })).toBe(
      'Creating feature directory...'
    );
  });
});
