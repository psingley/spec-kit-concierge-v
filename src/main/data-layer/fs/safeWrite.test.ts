import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { withTempDir } from '../../../test/tempDir';
import { safeWrite, type SafeWriteStepContext } from './safeWrite';

const stepContext: SafeWriteStepContext = { stepId: 'T008', label: 'safe write test' };

describe('safeWrite', () => {
  it('writes content directly to disk', async () => {
    await withTempDir(async (directory) => {
      const targetPath = path.join(directory, 'outside-workspace', 'output.txt');
      const logger = { info: vi.fn() };

      await safeWrite({ targetPath, contents: 'hello safe write', stepContext }, logger);

      await expect(readFile(targetPath, 'utf8')).resolves.toBe('hello safe write');
    });
  });

  it('requests file-handle sync before close', async () => {
    const events: string[] = [];
    const logger = { info: vi.fn() };
    const handle = {
      writeFile: vi.fn(async () => {
        events.push('write');
      }),
      sync: vi.fn(async () => {
        events.push('sync');
      }),
      close: vi.fn(async () => {
        events.push('close');
      })
    };

    await safeWrite(
      { targetPath: '/tmp/concierge-safe-write.txt', contents: 'contents', stepContext },
      logger,
      { openFile: vi.fn(async () => handle) }
    );

    expect(events).toEqual(['write', 'sync', 'close']);
    expect(handle.sync).toHaveBeenCalledTimes(1);
  });

  it('logs the target path and calling Step context', async () => {
    await withTempDir(async (directory) => {
      const targetPath = path.join(directory, 'audit.txt');
      const logger = { info: vi.fn() };

      await safeWrite({ targetPath, contents: 'audit', stepContext }, logger);

      expect(logger.info).toHaveBeenCalledWith(
        { targetPath, stepContext },
        'safe write requested'
      );
      expect(logger.info).toHaveBeenCalledWith(
        { targetPath, stepContext },
        'safe write completed'
      );
    });
  });

  it('allows paths outside an active workspace', async () => {
    await withTempDir(async (directory) => {
      const targetPath = path.join(directory, '..', path.basename(directory), 'external.txt');
      const logger = { info: vi.fn() };

      await expect(
        safeWrite({ targetPath, contents: 'external', stepContext }, logger)
      ).resolves.toBeUndefined();
    });
  });

  it('does not claim atomic rename behavior', async () => {
    const logger = { info: vi.fn() };
    const openFile = vi.fn(async () => ({
      writeFile: vi.fn(async () => undefined),
      sync: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined)
    }));

    await safeWrite(
      { targetPath: '/tmp/direct-overwrite.txt', contents: 'direct', stepContext },
      logger,
      { openFile }
    );

    expect(openFile).toHaveBeenCalledWith('/tmp/direct-overwrite.txt', 'w');
  });
});
