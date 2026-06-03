import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { AcpTranscriptWriteError, sanitizeAcpTranscriptRecords, writeAcpTranscript } from './transcript';

const tempDirs: string[] = [];

const createTempUserData = async (): Promise<string> => {
  const directory = await mkdtemp(path.join(os.tmpdir(), `concierge-acp-${randomUUID()}-`));
  tempDirs.push(directory);
  return directory;
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('ACP transcript writer', () => {
  it('writes sanitized annotated JSONL under the session transcript path', async () => {
    const userDataPath = await createTempUserData();
    const timestamp = new Date('2026-05-27T12:00:00.000Z');
    const sessionId = '11111111-1111-4111-8111-111111111111';

    const transcriptPath = await writeAcpTranscript({
      userDataPath,
      sessionId,
      step: 'step-1',
      timestamp,
      homePath: '/Users/psingley',
      records: [
        {
          direction: 'client->agent',
          method: 'session/new',
          params: {
            cwd: '/Users/psingley/spec-kit-concierge-v',
            sessionId,
            timestampMs: 1770000000000
          }
        },
        {
          direction: 'agent->client',
          result: {
            sessionId,
            createdAt: '2026-05-27T12:00:00.000Z'
          }
        }
      ]
    });

    expect(transcriptPath).toBe(path.join(userDataPath, 'transcripts', sessionId, 'step-1-2026-05-27T12-00-00.000Z.jsonl'));
    expect(path.basename(transcriptPath)).not.toContain(':');
    const contents = await readFile(transcriptPath, 'utf8');
    expect(contents).toContain('"direction":"client->agent"');
    expect(contents).toContain('/Users/<user>/spec-kit-concierge-v');
    expect(contents).not.toContain('/Users/psingley');
    expect(contents).not.toContain(sessionId);
    expect(contents).toContain('"timestampMs":"<timestamp>"');
    expect(contents).toContain('"createdAt":"<timestamp>"');
  });

  it('preserves both transcript directions during sanitization', () => {
    expect(
      sanitizeAcpTranscriptRecords([
        { direction: 'client->agent', method: 'initialize' },
        { direction: 'agent->client', result: {} }
      ])
    ).toEqual([
      { direction: 'client->agent', method: 'initialize' },
      { direction: 'agent->client', result: {} }
    ]);
  });

  it('surfaces filesystem errors explicitly', async () => {
    await expect(
      writeAcpTranscript({
        userDataPath: '/dev/null',
        sessionId: 'session',
        step: 'step',
        timestamp: new Date('2026-05-27T12:00:00.000Z'),
        records: []
      })
    ).rejects.toBeInstanceOf(AcpTranscriptWriteError);
  });
});
