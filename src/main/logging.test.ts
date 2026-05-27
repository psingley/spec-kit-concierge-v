import { existsSync, readFileSync } from 'node:fs';
import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { withTempDir } from '../test/tempDir';
import { createMainLogger } from './logging';

const readLogRecord = (userDataPath: string): Record<string, unknown> => {
  const logPath = `${userDataPath}/logs/concierge-2026-05-27.log`;
  const contents = readFileSync(logPath, 'utf8').trim();

  return JSON.parse(contents) as Record<string, unknown>;
};

describe('createMainLogger', () => {
  it('writes ndjson to the daily file under userData with required base fields', async () => {
    await withTempDir(async (directory) => {
      const logger = createMainLogger({
        userDataPath: directory,
        now: new Date('2026-05-27T12:00:00Z'),
        packageVersion: 'test-version',
        enablePrettyStream: false
      });

      logger.info({ event: 'test-log' }, 'hello');
      logger.flush();

      expect(existsSync(`${directory}/logs/concierge-2026-05-27.log`)).toBe(true);
      expect(readLogRecord(directory)).toMatchObject({
        pid: process.pid,
        app: 'concierge',
        version: 'test-version',
        event: 'test-log',
        msg: 'hello'
      });
      expect(readLogRecord(directory).hostname).toEqual(expect.any(String));
    });
  });

  it('defaults to info level', async () => {
    await withTempDir(async (directory) => {
      const previousDebug = process.env.CONCIERGE_DEBUG;
      process.env.CONCIERGE_DEBUG = '0';

      try {
        const logger = createMainLogger({
          userDataPath: directory,
          now: new Date('2026-05-27T12:00:00Z'),
          enablePrettyStream: false
        });

        expect(logger.level).toBe('info');
      } finally {
        process.env.CONCIERGE_DEBUG = previousDebug;
      }
    });
  });

  it('honors CONCIERGE_DEBUG=1 for debug level', async () => {
    await withTempDir(async (directory) => {
      const previousDebug = process.env.CONCIERGE_DEBUG;
      process.env.CONCIERGE_DEBUG = '1';

      try {
        const logger = createMainLogger({
          userDataPath: directory,
          now: new Date('2026-05-27T12:00:00Z'),
          enablePrettyStream: false
        });

        expect(logger.level).toBe('debug');
      } finally {
        process.env.CONCIERGE_DEBUG = previousDebug;
      }
    });
  });

  it('adds the pino-pretty terminal stream only outside production', async () => {
    await withTempDir(async (directory) => {
      const terminalOutput = new PassThrough();
      const chunks: string[] = [];
      terminalOutput.on('data', (chunk: Buffer) => chunks.push(chunk.toString('utf8')));

      const developmentLogger = createMainLogger({
        userDataPath: directory,
        now: new Date('2026-05-27T12:00:00Z'),
        terminalStream: terminalOutput,
        enablePrettyStream: true
      });
      developmentLogger.info('pretty hello');
      developmentLogger.flush();

      expect(chunks.join('')).toContain('pretty hello');
    });

    await withTempDir(async (directory) => {
      const terminalOutput = new PassThrough();
      const chunks: string[] = [];
      terminalOutput.on('data', (chunk: Buffer) => chunks.push(chunk.toString('utf8')));

      const productionLogger = createMainLogger({
        userDataPath: directory,
        now: new Date('2026-05-27T12:00:00Z'),
        terminalStream: terminalOutput,
        enablePrettyStream: false
      });
      productionLogger.info('production hello');
      productionLogger.flush();

      expect(chunks.join('')).toBe('');
    });
  });
});
