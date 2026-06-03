import type { ExecFileException } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PrintModeSpawnAdapter } from './copilotPrintModeAdapter';

type ExecFileCallback = (error: ExecFileException | null, result: { stdout: string; stderr: string }) => void;
type ExecFileMockImplementation = (
  command: string,
  args: string[],
  options: unknown,
  callback: ExecFileCallback
) => void;

const childProcess = vi.hoisted(() => {
  let implementation: ExecFileMockImplementation = (_command, _args, _options, callback) => {
    callback(Object.assign(new Error('execFile mock not configured'), { code: 'ENOENT' }), { stdout: '', stderr: '' });
  };
  const execFile = vi.fn((command: string, args: string[], optionsOrCallback: unknown, maybeCallback?: ExecFileCallback) => {
    const callback = (typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback) as ExecFileCallback | undefined;
    if (callback === undefined) {
      throw new Error('execFile mock requires a callback');
    }
    implementation(command, args, typeof optionsOrCallback === 'function' ? undefined : optionsOrCallback, callback);
  });
  return {
    execFile,
    setExecFile: (next: ExecFileMockImplementation): void => {
      implementation = next;
    }
  };
});

vi.mock('node:child_process', () => ({
  default: {
    execFile: childProcess.execFile
  },
  execFile: childProcess.execFile
}));

const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');

const setPlatform = (platform: NodeJS.Platform): void => {
  Object.defineProperty(process, 'platform', { value: platform });
};

const restorePlatform = (): void => {
  if (originalPlatform !== undefined) {
    Object.defineProperty(process, 'platform', originalPlatform);
  }
};

const fakeChild = () => {
  const child = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter; pid: number };
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.pid = 123;
  queueMicrotask(() => {
    child.stdout.emit('data', Buffer.from(JSON.stringify({ type: 'result', exitCode: 0 })));
    child.emit('close', 0);
  });
  return child;
};

afterEach(() => {
  vi.resetModules();
  childProcess.execFile.mockClear();
  restorePlatform();
});

describe('runCopilotPrintModeStep Windows binary boundary', () => {
  it('resolves copilot before the print-mode spawn on win32', async () => {
    setPlatform('win32');
    childProcess.setExecFile((command, _args, _options, callback) => {
      if (command === 'powershell.exe') {
        callback(null, { stdout: 'C:\\Users\\monalisa\\bin\\copilot.exe\n', stderr: '' });
        return;
      }
      callback(Object.assign(new Error(`unexpected command: ${command}`), { code: 'ENOENT' }), { stdout: '', stderr: '' });
    });
    const { runCopilotPrintModeStep } = await import('./copilotPrintModeAdapter');
    const spawn = vi.fn(() => fakeChild()) as unknown as PrintModeSpawnAdapter;

    await runCopilotPrintModeStep({
      step: 'tasks',
      prompt: 'Run tasks',
      repositoryPath: '/repo',
      sessionId: '11111111-1111-4111-8111-111111111111',
      logDir: '/logs',
      spawn
    });

    expect(spawn).toHaveBeenCalledWith('C:\\Users\\monalisa\\bin\\copilot.exe', expect.any(Array), expect.objectContaining({ shell: false }));
  });

  it('passes raw copilot through the print-mode spawn on non-win32 platforms', async () => {
    setPlatform('darwin');
    const { runCopilotPrintModeStep } = await import('./copilotPrintModeAdapter');
    const spawn = vi.fn(() => fakeChild()) as unknown as PrintModeSpawnAdapter;

    await runCopilotPrintModeStep({
      step: 'tasks',
      prompt: 'Run tasks',
      repositoryPath: '/repo',
      sessionId: '11111111-1111-4111-8111-111111111111',
      logDir: '/logs',
      spawn
    });

    expect(childProcess.execFile).not.toHaveBeenCalled();
    expect(spawn).toHaveBeenCalledWith('copilot', expect.any(Array), expect.objectContaining({ shell: false }));
  });
});
