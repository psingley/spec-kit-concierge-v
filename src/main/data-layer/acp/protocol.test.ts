import path from 'node:path';
import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { zInitializeResponse, zNewSessionResponse } from '@agentclientprotocol/sdk/dist/schema/zod.gen.js';
import { readAnnotatedAcpJsonl } from '../../../test/acpTranscript';
import { createAcpProtocol } from './protocol';

const fixturePath = (name: string): string =>
  path.join(process.cwd(), 'tests', 'fixtures', 'acp-transcripts', name);

describe('ACP transcript fixtures', () => {
  it('strips Concierge direction annotations before ACP initialize schema validation', async () => {
    const lines = await readAnnotatedAcpJsonl(fixturePath('copilot-1.0.54-initialize.jsonl'));
    const initializeResponse = lines.find(
      (line) => line.direction === 'agent->client' && 'result' in line.wire
    );

    expect(lines.every((line) => line.direction === 'client->agent' || line.direction === 'agent->client')).toBe(
      true
    );
    expect(initializeResponse?.wire).not.toHaveProperty('direction');
    expect(zInitializeResponse.parse(initializeResponse?.wire.result)).toMatchObject({
      protocolVersion: 1,
      agentInfo: {
        name: 'Copilot',
        version: '1.0.54'
      }
    });
  });

  it('strips direction annotations before session/new schema validation', async () => {
    const lines = await readAnnotatedAcpJsonl(fixturePath('copilot-1.0.54-session-new-full.jsonl'));
    const sessionNewResponse = lines.find(
      (line) => line.direction === 'agent->client' && line.wire.id === 2
    );

    expect(sessionNewResponse?.wire).not.toHaveProperty('direction');
    expect(zNewSessionResponse.parse(sessionNewResponse?.wire.result)).toMatchObject({
      sessionId: '<sessionId-placeholder>',
      models: {
        currentModelId: 'gpt-5.5'
      }
    });
  });

  it('retains exactly one ACP message per annotated JSONL line', async () => {
    const lines = await readAnnotatedAcpJsonl(fixturePath('copilot-1.0.54-session-new-full.jsonl'));

    expect(lines.length).toBeGreaterThanOrEqual(4);
    expect(lines.every((line) => line.wire.jsonrpc === '2.0')).toBe(true);
    expect(lines.every((line) => Object.keys(line).sort().join(',') === 'direction,wire')).toBe(true);
  });
});

describe('ACP protocol close()', () => {
  it('actively ends the underlying stdin stream so the SDK connection closes promptly', async () => {
    // Codex-found bug: protocol.close() only awaited connection.closed without
    // actively ending the stream. That forced disposal to time-out + SIGTERM
    // unnecessarily.
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const protocol = createAcpProtocol({ stdin, stdout, client: {} });

    let stdinEnded = false;
    stdin.on('finish', () => {
      stdinEnded = true;
    });

    // Race the close promise against a watchdog that detects stdin not ending.
    await Promise.race([
      protocol.close(),
      new Promise<void>((resolve) => {
        setTimeout(() => {
          if (!stdinEnded) {
            // Force-end stdout so connection.closed resolves and the test
            // doesn't hang waiting for protocol.close().
            stdout.end();
          }
          resolve();
        }, 50);
      })
    ]);

    // Actively-closed semantics: stdin MUST have been ended by protocol.close()
    // (not by the watchdog). If the bug is present, stdinEnded stays false.
    expect(stdinEnded).toBe(true);
  });
});
